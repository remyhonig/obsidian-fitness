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
import {
	parseProgram as parseFitnessDSL,
	compileProgramFromString,
	generateExecutionView,
	type CompiledProgram,
	type ExerciseExecutionView,
	type CompletedSetInput,
	type MediaReference,
} from 'fitness-dsl';

// Re-export execution view types for UI consumption
export type {
	ExerciseExecutionView,
	ExecutionSet,
	SetTarget,
	SetAdjustment,
	MediaReference,
	YouTubeVideoReference,
	YouTubeShortsReference,
	YouTubeSearchReference,
} from 'fitness-dsl';

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

export interface CompletedSet {
	exercise: string;
	setNumber: number;
	reps: number;
	weight: number;
	rpe: number;
	timestamp: string;
	actualRestSeconds?: number;
}

export interface SessionExerciseState {
	exercise: string;
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	targetWeight: number | null;
	targetRPE: number | null;
	restSeconds: number;
	sets: CompletedSet[];
	media: MediaReference[];
	note: string | null;
}

export interface SessionState {
	isActive: boolean;
	id: string | null;
	workout: string | null;
	programId: string | null;
	date: string | null;
	currentExerciseIndex: number;
	currentSetIndex: number;
	exercises: SessionExerciseState[];
	startTime: string | null;
	endTime: string | null;
	status: 'active' | 'paused' | 'completed';
	extraRestTime: number; // Extra rest time added by user (in seconds)
	restStartTime: number | null; // Timestamp (ms) when rest period started
}

export type UIEvent =
	| { type: 'start_workout'; workoutName: string; programId?: string }
	| { type: 'complete_set'; exercise: string; reps: number; weight: number; rpe: number; restSeconds?: number }
	| { type: 'update_set'; exerciseIndex: number; setIndex: number; reps: number; weight: number; rpe: number }
	| { type: 'skip_exercise'; exercise: string }
	| { type: 'next_exercise' }
	| { type: 'finish_session' }
	| { type: 'cancel_session' }
	| { type: 'navigate'; screen: string }
	| { type: 'add_extra_rest'; seconds: number };

/**
 * Adapter that wraps the fitness-dsl parser and provides a clean API
 * for the Obsidian plugin UI
 */
export class FitnessDomainAdapter {
	private app: App;
	private basePath: string;
	private programData: ProgramData | null = null;
	private compiledProgram: CompiledProgram | null = null;
	private programMarkdown: string | null = null;
	private sessionState: SessionState;

	constructor(app: App, basePath: string = 'Fitness') {
		this.app = app;
		this.basePath = basePath;
		this.sessionState = this.createEmptySessionState();
	}

	/**
	 * Creates an empty session state
	 */
	private createEmptySessionState(): SessionState {
		return {
			isActive: false,
			id: null,
			workout: null,
			programId: null,
			date: null,
			currentExerciseIndex: 0,
			currentSetIndex: 0,
			exercises: [],
			startTime: null,
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null
		};
	}

	/**
	 * Generates a session ID from the start time and workout name
	 * Format: YYYY-MM-DD-HH-MM-SS-workout-name
	 */
	private generateSessionId(startTime: string, workoutName: string): string {
		const date = new Date(startTime);
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		const ss = String(date.getSeconds()).padStart(2, '0');
		const slug = workoutName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}-${slug}`;
	}

	/**
	 * Formats an ISO timestamp to HH:MM:SS
	 */
	private formatTimeHHMMSS(isoString: string): string {
		const date = new Date(isoString);
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	}

	/**
	 * Updates the base path (when settings change)
	 */
	setBasePath(basePath: string): void {
		this.basePath = basePath;
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
		this.programMarkdown = content; // Store for debug export
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

		// Also compile the program to get structured IR for execution view
		try {
			this.compiledProgram = compileProgramFromString(markdown);
			console.log('[FitnessDomainAdapter] Compiled program:', {
				exercises: this.compiledProgram.exercises.length,
				globalRules: this.compiledProgram.globalRules.length,
				globalRulesDetail: this.compiledProgram.globalRules.map(r => ({
					condition: r.condition,
					action: r.action,
					timing: r.timing,
					hasIR: !!r.ir,
					ir: r.ir ? {
						conditionTerms: r.ir.condition.terms,
						effect: r.ir.effect,
						timing: r.ir.timing,
						sourceText: r.ir.sourceText,
					} : null,
				})),
			});
		} catch (e) {
			console.warn('[FitnessDomainAdapter] Failed to compile program:', e);
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
				globalRules: program.progression.globalRules
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
				this.startWorkout(event.workoutName, event.programId);
				break;

			case 'complete_set':
				this.completeSet(event.exercise, event.reps, event.weight, event.rpe, event.restSeconds);
				// Reset extra rest time and start rest timer when a set is completed
				this.sessionState.extraRestTime = 0;
				this.sessionState.restStartTime = Date.now();
				break;

			case 'update_set':
				this.updateSet(event.exerciseIndex, event.setIndex, event.reps, event.weight, event.rpe);
				break;

			case 'skip_exercise':
				this.sessionState.currentExerciseIndex++;
				this.sessionState.currentSetIndex = 0;
				this.sessionState.extraRestTime = 0;
				this.sessionState.restStartTime = Date.now();
				break;

			case 'next_exercise':
				this.sessionState.currentExerciseIndex++;
				this.sessionState.currentSetIndex = 0;
				this.sessionState.extraRestTime = 0;
				this.sessionState.restStartTime = Date.now();
				break;

			case 'finish_session':
				this.sessionState.status = 'completed';
				this.sessionState.endTime = new Date().toISOString();
				this.sessionState.isActive = false;
				break;

			case 'cancel_session':
				this.sessionState = this.createEmptySessionState();
				break;

			case 'add_extra_rest':
				this.sessionState.extraRestTime += event.seconds;
				break;
		}

		return this.sessionState;
	}

	/**
	 * Start a new workout session
	 */
	private startWorkout(workoutName: string, programId?: string): void {
		const startTime = new Date().toISOString();
		const date = startTime.split('T')[0] ?? startTime;

		// Find workout definition from program
		const workoutDef = this.programData?.workouts.find(w => w.name === workoutName);

		// Get compiled workout data for media (CompiledProgram has richer ExerciseExport with media)
		const compiledWorkout = this.compiledProgram?.workouts.get(workoutName);

		// Initialize exercise states from workout definition
		const exercises: SessionExerciseState[] = workoutDef?.exercises.map(e => {
			const reps = e.reps === 'AMRAP' ? { min: 1, max: 99 } : e.reps;
			const restMatch = e.rest?.match(/(\d+)/);
			const restSeconds = restMatch?.[1] ? parseInt(restMatch[1], 10) : 120;

			// Parse weight from string like "80kg" or "bodyweight"
			let targetWeight: number | null = null;
			if (e.weight) {
				const weightMatch = e.weight.match(/(\d+)/);
				if (weightMatch?.[1]) {
					targetWeight = parseInt(weightMatch[1], 10);
				} else if (e.weight.toLowerCase().includes('body')) {
					targetWeight = 0; // 0 = bodyweight
				}
			}

			// Get RPE from intensity if available
			const targetRPE = e.intensity?.type === 'RPE' ? e.intensity.value : null;

			// Get media and note from compiled program (has richer exercise data)
			const compiledExercise = compiledWorkout?.exercises.find(ce => ce.name === e.name);
			const media = compiledExercise?.media ?? [];
			const note = compiledExercise?.note ?? null;

			return {
				exercise: e.name,
				targetSets: e.sets,
				targetRepsMin: reps.min,
				targetRepsMax: reps.max,
				targetWeight,
				targetRPE,
				restSeconds,
				sets: [],
				media,
				note
			};
		}) ?? [];

		this.sessionState = {
			isActive: true,
			id: this.generateSessionId(startTime, workoutName),
			workout: workoutName,
			programId: programId ?? null,
			date,
			currentExerciseIndex: 0,
			currentSetIndex: 0,
			exercises,
			startTime,
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: Date.now()
		};
	}

	/**
	 * Complete a set for the current exercise
	 */
	private completeSet(exercise: string, reps: number, weight: number, rpe: number, restSeconds?: number): void {
		// Find or create exercise state
		let exerciseState = this.sessionState.exercises.find(e => e.exercise === exercise);

		if (!exerciseState) {
			// Create new exercise state if not found (shouldn't happen normally)
			exerciseState = {
				exercise,
				targetSets: 3,
				targetRepsMin: 8,
				targetRepsMax: 12,
				targetWeight: null,
				targetRPE: null,
				restSeconds: 120,
				sets: [],
				media: [],
				note: null
			};
			this.sessionState.exercises.push(exerciseState);
		}

		const setNumber = exerciseState.sets.length + 1;
		exerciseState.sets.push({
			exercise,
			setNumber,
			reps,
			weight,
			rpe,
			timestamp: new Date().toISOString(),
			actualRestSeconds: restSeconds
		});

		this.sessionState.currentSetIndex = setNumber;

		// Check if all sets for this exercise are complete
		if (setNumber >= exerciseState.targetSets) {
			// Move to next exercise
			const currentIdx = this.sessionState.exercises.findIndex(e => e.exercise === exercise);
			if (currentIdx >= 0 && currentIdx < this.sessionState.exercises.length - 1) {
				this.sessionState.currentExerciseIndex = currentIdx + 1;
				this.sessionState.currentSetIndex = 0;
			}
		}
	}

	/**
	 * Update an existing set
	 */
	private updateSet(exerciseIndex: number, setIndex: number, reps: number, weight: number, rpe: number): void {
		const exercise = this.sessionState.exercises[exerciseIndex];
		if (!exercise) return;

		const set = exercise.sets[setIndex];
		if (!set) return;

		set.reps = reps;
		set.weight = weight;
		set.rpe = rpe;
	}

	/**
	 * Get current program data
	 */
	getProgram(): ProgramData | null {
		return this.programData;
	}

	/**
	 * Get raw program markdown (for debug export)
	 */
	getProgramMarkdown(): string | null {
		return this.programMarkdown;
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
	 * This persists the current session state to a file in the Sessions folder
	 */
	async saveSession(): Promise<string | null> {
		if (!this.sessionState.id || !this.sessionState.workout) {
			return null;
		}

		const sessionsPath = `${this.basePath}/Sessions`;
		await this.ensureFolder(sessionsPath);

		const path = `${sessionsPath}/${this.sessionState.id}.md`;
		const content = this.generateSessionMarkdown();

		// Check if file exists
		const existingFile = this.app.vault.getAbstractFileByPath(path);
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, content);
		} else {
			await this.app.vault.create(path, content);
		}

		return path;
	}

	/**
	 * Ensures a folder exists, creating it if necessary
	 */
	private async ensureFolder(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	/**
	 * Generate markdown content for a session log
	 * Format matches the existing session-body.ts format
	 */
	private generateSessionMarkdown(): string {
		const state = this.sessionState;
		const lines: string[] = [];

		// YAML Frontmatter
		lines.push('---');
		lines.push(`date: ${state.date}`);
		lines.push(`startTime: ${state.startTime}`);
		if (state.startTime) {
			lines.push(`startTimeFormatted: ${this.formatTimeHHMMSS(state.startTime)}`);
		}
		if (state.endTime) {
			lines.push(`endTime: ${state.endTime}`);
			lines.push(`endTimeFormatted: ${this.formatTimeHHMMSS(state.endTime)}`);
		}

		// Workout reference (with wikilink if programId is available)
		if (state.programId && state.workout) {
			lines.push(`workout: "[[Programs/${state.programId}#${state.workout}]]"`);
		} else if (state.workout) {
			lines.push(`workout: ${state.workout}`);
		}

		lines.push(`status: ${state.status}`);
		lines.push('---');
		lines.push('');

		// Exercises section
		lines.push('# Exercises');
		lines.push('');

		for (const exercise of state.exercises) {
			lines.push(`## ${exercise.exercise}`);

			// Target line
			const repsDisplay = exercise.targetRepsMin === exercise.targetRepsMax
				? String(exercise.targetRepsMin)
				: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
			lines.push(`Target: ${exercise.targetSets} × ${repsDisplay} | Rest: ${exercise.restSeconds}s`);
			lines.push('');

			// Sets table
			lines.push('| # | kg | reps | rpe | time | rest |');
			lines.push('|---|----|----- |-----|------|------|');

			for (const set of exercise.sets) {
				const weightDisplay = set.weight === 0 ? 'body weight' : String(set.weight);
				const timeDisplay = this.formatTimeHHMMSS(set.timestamp);
				const restDisplay = set.actualRestSeconds !== undefined ? `${set.actualRestSeconds}s` : '-';
				const rpeDisplay = set.rpe !== undefined ? String(set.rpe) : '-';

				lines.push(`| ${set.setNumber} | ${weightDisplay} | ${set.reps} | ${rpeDisplay} | ${timeDisplay} | ${restDisplay} |`);
			}

			lines.push('');
		}

		return lines.join('\n');
	}

	/**
	 * Get the current exercise based on currentExerciseIndex
	 */
	getCurrentExercise(): SessionExerciseState | null {
		if (!this.sessionState.isActive) return null;
		return this.sessionState.exercises[this.sessionState.currentExerciseIndex] ?? null;
	}

	/**
	 * Check if the current session is complete (all exercises done)
	 */
	isSessionComplete(): boolean {
		if (!this.sessionState.isActive) return false;

		// Check if all exercises have completed all their sets
		return this.sessionState.exercises.every(
			exercise => exercise.sets.length >= exercise.targetSets
		);
	}

	/**
	 * Get session progress as a percentage
	 */
	getSessionProgress(): number {
		if (!this.sessionState.isActive || this.sessionState.exercises.length === 0) {
			return 0;
		}

		const totalSets = this.sessionState.exercises.reduce((sum, e) => sum + e.targetSets, 0);
		const completedSets = this.sessionState.exercises.reduce((sum, e) => sum + e.sets.length, 0);

		return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
	}

	/**
	 * Get the execution view for an exercise, which provides dynamic set targets
	 * based on completed sets and progression rules.
	 *
	 * @param exerciseIndex - Index of the exercise in the current session
	 * @returns ExerciseExecutionView with targets for each set, or null if not available
	 */
	getExecutionView(exerciseIndex: number): ExerciseExecutionView | null {
		if (!this.compiledProgram || !this.sessionState.isActive) {
			console.log('[FitnessDomainAdapter] getExecutionView: No compiled program or inactive session');
			return null;
		}

		const sessionExercise = this.sessionState.exercises[exerciseIndex];
		if (!sessionExercise) {
			console.log('[FitnessDomainAdapter] getExecutionView: No session exercise at index', exerciseIndex);
			return null;
		}

		// Find the matching exercise target from the compiled program
		const exerciseTarget = this.compiledProgram.exercises.find(
			e => e.name.toLowerCase() === sessionExercise.exercise.toLowerCase() &&
			     e.workout.toLowerCase() === this.sessionState.workout?.toLowerCase()
		);

		if (!exerciseTarget) {
			console.warn('[FitnessDomainAdapter] No exercise target found for:', sessionExercise.exercise);
			return null;
		}

		// Convert completed sets to CompletedSetInput format
		const completedSets: CompletedSetInput[] = sessionExercise.sets.map(set => ({
			reps: set.reps,
			weight: set.weight === 0 ? 'bodyweight' : `${set.weight}kg`,
			rpe: set.rpe,
		}));

		// Log info about rules and execution
		console.log('[FitnessDomainAdapter] getExecutionView INPUT:', {
			exercise: exerciseTarget.name,
			exerciseTarget: {
				sets: exerciseTarget.sets,
				minReps: exerciseTarget.minReps,
				maxReps: exerciseTarget.maxReps,
				weight: exerciseTarget.weight,
				targetRPE: exerciseTarget.targetRPE,
				autoregulationIR: exerciseTarget.autoregulationIR,
			},
			completedSets,
			globalRulesCount: this.compiledProgram.globalRules.length,
			globalRulesWithNextSet: this.compiledProgram.globalRules.filter(r => r.timing === 'next_set').length,
			globalRulesWithIR: this.compiledProgram.globalRules.filter(r => r.ir && r.timing === 'next_set').map(r => ({
				timing: r.timing,
				ir: r.ir,
			})),
		});

		// Generate the execution view using the DSL engine
		const executionView = generateExecutionView(
			exerciseTarget,
			completedSets,
			this.compiledProgram.globalRules,
			[] // alternatives - could be populated from exercise data if needed
		);

		// Log the execution view result
		console.log('[FitnessDomainAdapter] getExecutionView OUTPUT:', {
			sets: executionView.sets.map(s => ({
				setNumber: s.setNumber,
				status: s.status,
				target: s.target,
				actual: s.actual,
			})),
		});

		return executionView;
	}
}
