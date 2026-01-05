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
import * as antlr from 'antlr4ng';

// Import fitness-dsl parser types
// Note: We'll need to adapt this based on the actual exports from fitness-dsl
// For now, creating interfaces that match the expected structure

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
	 *
	 * TODO: Integrate with actual fitness-dsl parser
	 * For now, returns a mock structure
	 */
	private async parseProgram(markdown: string): Promise<ProgramData> {
		// TODO: Import and use fitness-dsl parser
		// This is a temporary mock implementation
		// The real implementation will use:
		//
		// import { FitnessMarkdownLexer } from 'fitness-dsl';
		// import { FitnessMarkdownParser } from 'fitness-dsl';
		//
		// const chars = antlr.CharStream.fromString(markdown);
		// const lexer = new FitnessMarkdownLexer(chars);
		// const tokens = new antlr.CommonTokenStream(lexer);
		// const parser = new FitnessMarkdownParser(tokens);
		// const tree = parser.document();
		//
		// Then extract program data using a visitor/listener

		console.log('[FitnessDomainAdapter] Parsing program...', markdown.substring(0, 100));

		// Mock data for now
		return {
			program: {
				name: 'Push Pull Legs',
				description: 'A 6-day training split focusing on push, pull, and leg movements'
			},
			schedule: {
				weeklyPattern: [
					{ day: 'Monday', time: '18:00', workouts: ['Push Day'] },
					{ day: 'Tuesday', time: '18:00', workouts: ['Pull Day'] },
					{ day: 'Wednesday', time: '18:00', workouts: ['Leg Day'] },
					{ day: 'Thursday', time: '18:00', workouts: ['Push Day'] },
					{ day: 'Friday', time: '18:00', workouts: ['Pull Day'] },
					{ day: 'Saturday', time: '10:00', workouts: ['Leg Day'] },
					{ day: 'Sunday', time: null, workouts: ['Rest'] }
				],
				dateOverrides: [],
				cyclePattern: []
			},
			progression: {
				globalRules: [
					{
						condition: 'reps >= max',
						action: '+2.5kg',
						timing: 'next_session'
					}
				],
				periodization: []
			},
			workouts: [
				{
					name: 'Push Day',
					description: 'Chest, shoulders, and triceps',
					exercises: [
						{
							name: 'Bench Press',
							alternatives: [],
							optional: false,
							sets: 4,
							reps: { min: 6, max: 8 },
							weight: '80kg',
							intensity: { type: 'RPE', value: 8 },
							rest: '180s',
							emom: null,
							duration: null,
							distance: null,
							progression: ['+2.5kg when 4x8 complete'],
							autoregulation: [],
							note: null
						}
					]
				}
			]
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
