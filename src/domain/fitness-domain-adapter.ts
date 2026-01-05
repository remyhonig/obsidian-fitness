/**
 * Fitness Domain Adapter
 *
 * Bridges the fitness-dsl rule engine with the Obsidian plugin.
 * Handles parsing program markdown, managing session state, and processing UI events.
 *
 * Architecture:
 * - Reads program definitions from markdown notes
 * - Parses using fitness-dsl ANTLR4 parser
 * - Manages session history (sets completed)
 * - Evaluates progression rules
 * - Returns JSON state for React UI consumption
 */

import { App, TFile } from 'obsidian';
import { parseProgram as parseFitnessDSL, type ProgramExport } from 'fitness-dsl';

// Re-export types from fitness-dsl for convenience

export interface ProgramData {
	program: {
		name: string;
		description: string;
	};
	schedule: {
		weeklyPattern: Array<{
			day: string;
			time: string | null;
			workouts: string[];
		}>;
		dateOverrides: Array<{
			date: string;
			workouts: string[];
			note: string | null;
		}>;
		cyclePattern: Array<{
			workout: string;
			recovery: string | null;
			note: string | null;
		}>;
	};
	progression: {
		globalRules: Array<{
			condition: string;
			action: string;
			timing: 'next_set' | 'next_session' | null;
		}>;
		periodization: Array<{
			weekStart: number;
			weekEnd: number;
			phase: string;
			deloadPercent: number | null;
		}>;
	};
	workouts: Array<{
		name: string;
		description: string | null;
		exercises: Array<{
			name: string;
			alternatives: string[];
			optional: boolean;
			sets: number;
			reps: { min: number; max: number } | 'AMRAP';
			weight: string | null;
			intensity: { type: 'RPE' | 'RIR'; value: number } | null;
			rest: string | null;
			emom: { duration: string; repsPerInterval: number } | null;
			duration: { time: string; intensity: string | null } | null;
			distance: string | null;
			progression: string[];
			autoregulation: string[];
			note: string | null;
		}>;
	}>;
	nextSession?: {
		workout: string;
		scheduledFor: string | null;
		exercises: Array<{
			name: string;
			alternatives: string[];
			optional: boolean;
			target: {
				sets: number;
				reps: { min: number; max: number };
				weight: string;
				rpe: number | null;
			};
			adjustments: Array<{
				from: string;
				to: string;
				reason: string;
				appliedOn: string;
			}>;
			timer: { type: 'emom' | 'duration' | 'rest'; duration: string } | null;
		}>;
	};
	sessionHistory?: Array<{
		date: string;
		workout: string;
		exercises: Array<{
			name: string;
			target: {
				sets: number;
				reps: { min: number; max: number };
				weight: string;
				rpe: number | null;
			};
			results: Array<{ reps: number; weight: string; rpe: number }>;
			recommendation: {
				rule: string;
				change: string;
				reason: string;
				timing: string;
			} | null;
		}>;
	}>;
}

export interface SessionState {
	isActive: boolean;
	workout: string | null;
	currentExerciseIndex: number;
	currentSetIndex: number;
	completedSets: Array<{
		exercise: string;
		reps: number;
		weight: string;
		rpe: number;
		timestamp: string;
	}>;
	startTime: string | null;
}

export type UIEvent =
	| { type: 'start_workout'; workoutName: string }
	| { type: 'complete_set'; exercise: string; reps: number; weight: string; rpe: number }
	| { type: 'skip_exercise'; exercise: string }
	| { type: 'finish_session' }
	| { type: 'cancel_session' }
	| { type: 'navigate'; screen: string };

/**
 * Adapter that wraps the fitness-dsl parser and provides a clean API
 * for the Obsidian plugin UI
 */
export class FitnessDomainAdapter {
	private app: App;
	private programData: ProgramData | null = null;
	private sessionState: SessionState;

	constructor(app: App) {
		this.app = app;
		this.sessionState = {
			isActive: false,
			workout: null,
			currentExerciseIndex: 0,
			currentSetIndex: 0,
			completedSets: [],
			startTime: null
		};
	}

	/**
	 * Parse a program from a markdown file in the vault
	 */
	async loadProgram(programPath: string): Promise<ProgramData> {
		const file = this.app.vault.getAbstractFileByPath(programPath);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`Program file not found: ${programPath}`);
		}

		const content = await this.app.vault.read(file);
		this.programData = await this.parseProgram(content);
		return this.programData;
	}

	/**
	 * Parse program markdown using fitness-dsl
	 */
	private async parseProgram(markdown: string): Promise<ProgramData> {
		console.log('[FitnessDomainAdapter] Parsing program...', markdown.substring(0, 100));

		const result = parseFitnessDSL(markdown);

		if (!result.success || !result.program) {
			const errors = result.errors?.map(e => `Line ${e.line}: ${e.message}`).join('\n') || 'Unknown error';
			throw new Error(`Failed to parse program:\n${errors}`);
		}

		// Convert ProgramExport to ProgramData
		// The types are compatible, but we need to ensure proper conversion
		const program = result.program;

		return {
			program: {
				name: program.program.name,
				description: program.program.description
			},
			schedule: {
				weeklyPattern: program.schedule.weeklyPattern,
				dateOverrides: program.schedule.dateOverrides,
				cyclePattern: program.schedule.cyclePattern
			},
			progression: {
				globalRules: program.progression.globalRules,
				periodization: program.progression.periodization
			},
			workouts: program.workouts.map(w => ({
				name: w.name,
				description: w.description,
				exercises: w.exercises.map(e => ({
					name: e.name,
					alternatives: e.alternatives,
					optional: e.optional,
					sets: e.sets,
					reps: e.reps,
					weight: e.weight,
					intensity: e.intensity,
					rest: e.rest,
					emom: e.emom,
					duration: e.duration,
					distance: e.distance,
					progression: e.progression,
					autoregulation: e.autoregulation,
					note: e.note
				}))
			})),
			nextSession: program.nextSession,
			sessionHistory: program.sessionHistory
		};
	}

	/**
	 * Handle UI events and update session state
	 */
	dispatch(event: UIEvent): SessionState {
		switch (event.type) {
			case 'start_workout':
				this.sessionState = {
					isActive: true,
					workout: event.workoutName,
					currentExerciseIndex: 0,
					currentSetIndex: 0,
					completedSets: [],
					startTime: new Date().toISOString()
				};
				break;

			case 'complete_set':
				this.sessionState.completedSets.push({
					exercise: event.exercise,
					reps: event.reps,
					weight: event.weight,
					rpe: event.rpe,
					timestamp: new Date().toISOString()
				});
				this.sessionState.currentSetIndex++;
				break;

			case 'skip_exercise':
				this.sessionState.currentExerciseIndex++;
				this.sessionState.currentSetIndex = 0;
				break;

			case 'finish_session':
			case 'cancel_session':
				this.sessionState = {
					isActive: false,
					workout: null,
					currentExerciseIndex: 0,
					currentSetIndex: 0,
					completedSets: [],
					startTime: null
				};
				break;
		}

		return this.sessionState;
	}

	/**
	 * Get current program data
	 */
	getProgram(): ProgramData | null {
		return this.programData;
	}

	/**
	 * Get current session state
	 */
	getSessionState(): SessionState {
		return this.sessionState;
	}

	/**
	 * Get the next workout recommendation
	 */
	getNextWorkout(): string | null {
		if (!this.programData) return null;

		// TODO: Implement actual next workout logic based on schedule and history
		// For now, return first workout
		return this.programData.workouts[0]?.name ?? null;
	}

	/**
	 * Save session to markdown file
	 */
	async saveSession(sessionFolderPath: string): Promise<void> {
		if (!this.sessionState.isActive || !this.sessionState.workout) {
			return;
		}

		// TODO: Generate markdown session log
		// Format: YYYY-MM-DD-HH-MM-workout-name.md
		const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
		const filename = `${timestamp}-${this.sessionState.workout.toLowerCase().replace(/\s+/g, '-')}.md`;
		const path = `${sessionFolderPath}/${filename}`;

		// TODO: Generate proper markdown content with session data
		const content = this.generateSessionMarkdown();

		await this.app.vault.create(path, content);
	}

	/**
	 * Generate markdown content for a session log
	 */
	private generateSessionMarkdown(): string {
		const sets = this.sessionState.completedSets;

		let markdown = `# ${this.sessionState.workout}\n\n`;
		markdown += `Date: ${new Date().toLocaleDateString()}\n\n`;
		markdown += `## Sets\n\n`;
		markdown += `| Exercise | Reps | Weight | RPE | Time |\n`;
		markdown += `|----------|------|--------|-----|------|\n`;

		for (const set of sets) {
			const time = new Date(set.timestamp).toLocaleTimeString();
			markdown += `| ${set.exercise} | ${set.reps} | ${set.weight} | ${set.rpe} | ${time} |\n`;
		}

		return markdown;
	}
}
