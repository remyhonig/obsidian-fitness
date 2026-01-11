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
	evaluateSession,
	FitnessDSLEngine,
	isErrorResult,
	isStartWorkoutResult,
	isCompleteSetResult,
	type CompiledProgram,
	type ExerciseExecutionView,
	type CompletedSetInput,
	type MediaReference,
	type ChangeReport,
	type ExerciseTarget,
	type SessionResults,
	type EventResult,
	type StartWorkoutResult,
	type CompleteSetResult,
	type RuleProgress,
	type ExerciseRuleProgress,
	type SetResult,
} from 'fitness-dsl';
import { SessionRepository } from '../data/session-repository';
import type { Session } from '../types';

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
	// Rule progress tracking types
	RuleProgress,
	ExerciseRuleProgress,
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
	| { type: 'start_workout'; workoutName: string; programId?: string; startExerciseIndex?: number }
	| { type: 'complete_set'; exercise: string; reps: number; weight: number; rpe: number; restSeconds?: number }
	| { type: 'update_set'; exerciseIndex: number; setIndex: number; reps: number; weight: number; rpe: number }
	| { type: 'skip_exercise'; exercise: string }
	| { type: 'next_exercise' }
	| { type: 'set_current_exercise'; exerciseIndex: number }
	| { type: 'finish_session' }
	| { type: 'cancel_session' }
	| { type: 'navigate'; screen: string }
	| { type: 'add_extra_rest'; seconds: number }
	| { type: 'start_rest_timer' };

/**
 * Result of evaluating exercise completion for summary display
 */
export interface ExerciseCompletionResult {
	exerciseName: string;
	nextTarget: {
		sets: number;
		reps: string;  // e.g., "8-10"
		weight: string;
		rpe: number | null;
	};
	adjustment: {
		change: string;   // e.g., "-5kg"
		reason: string;   // e.g., "Too heavy man!"
		timing: 'next_set' | 'next_session';  // When the change applies
	} | null;
	/** Progress towards triggering progression rules */
	ruleProgress: ExerciseRuleProgress | null;
	/** Information about a broken streak, if any */
	streakBroken: {
		wasBroken: boolean;
		previousStreak: number;
		ruleDescription: string;
	} | null;
}

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
	private engine: FitnessDSLEngine;
	private sessionRepository: SessionRepository;

	constructor(app: App, basePath: string = 'Fitness') {
		this.app = app;
		this.basePath = basePath;
		this.sessionState = this.createEmptySessionState();
		this.engine = new FitnessDSLEngine({ debug: true, autoEvaluate: true });
		this.sessionRepository = new SessionRepository(app, basePath);
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
		this.sessionRepository = new SessionRepository(this.app, basePath);
	}

	/**
	 * Load all completed sessions into the engine for rule evaluation.
	 * This enables multi-session streak tracking and progression rules.
	 */
	private async loadSessionHistoryIntoEngine(): Promise<void> {
		try {
			const sessions = await this.sessionRepository.list();
			const setResults = this.convertSessionsToSetResults(sessions);

			console.log('[FitnessDomainAdapter] Loading session history:', {
				sessionCount: sessions.length,
				setResultCount: setResults.length,
			});

			if (setResults.length > 0) {
				this.engine.loadSessionHistory(setResults);
			}
		} catch (e) {
			console.warn('[FitnessDomainAdapter] Failed to load session history:', e);
		}
	}

	/**
	 * Convert Session objects from the repository to SetResult format for the DSL engine.
	 * Each completed set becomes a separate SetResult entry.
	 */
	private convertSessionsToSetResults(sessions: Session[]): SetResult[] {
		const results: SetResult[] = [];

		for (const session of sessions) {
			const date = session.date;
			const workout = session.workout || '';

			for (const exercise of session.exercises) {
				for (const set of exercise.sets) {
					// Only include completed sets
					if (!set.completed) continue;

					// Format timestamp: use set timestamp if available, otherwise session date
					const datetime = set.timestamp
						? set.timestamp.replace('T', ' ').substring(0, 16)
						: `${date} 00:00`;

					results.push({
						datetime,
						workout,
						exercise: exercise.exercise,
						reps: set.reps,
						weight: set.weight === 0 ? 'bodyweight' : `${set.weight}kg`,
						rpe: set.rpe ?? 0,
					});
				}
			}
		}

		// Sort by datetime to ensure chronological order
		results.sort((a, b) => a.datetime.localeCompare(b.datetime));

		return results;
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
	 * Load a program with custom training max values.
	 * User-provided TM values override the defaults from the program.
	 */
	async loadProgramWithTMs(
		programPath: string,
		trainingMaxes?: Array<{ exercise: string; value: number; unit: 'kg' | 'lbs' }>
	): Promise<ProgramData> {
		const file = this.app.vault.getAbstractFileByPath(programPath);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`Program file not found: ${programPath}`);
		}

		const content = await this.app.vault.read(file);
		this.programMarkdown = content;

		// Parse the program first
		this.programData = await this.parseProgram(content);

		// If custom TM values provided, override the compiled program's training maxes
		if (trainingMaxes && trainingMaxes.length > 0 && this.compiledProgram) {
			for (const userTM of trainingMaxes) {
				const existingIndex = this.compiledProgram.trainingMaxes.findIndex(
					tm => tm.exercise.toLowerCase() === userTM.exercise.toLowerCase()
				);
				const existingTM = existingIndex >= 0 ? this.compiledProgram.trainingMaxes[existingIndex] : undefined;
				if (existingTM) {
					// Override existing TM
					existingTM.weight = {
						type: 'absolute',
						value: userTM.value,
						unit: userTM.unit
					};
				} else {
					// Add new TM
					this.compiledProgram.trainingMaxes.push({
						exercise: userTM.exercise,
						weight: {
							type: 'absolute',
							value: userTM.value,
							unit: userTM.unit
						}
					});
				}
			}
			// Reload program into engine with updated TMs
			this.engine.loadProgram(this.compiledProgram);
		}

		return this.programData;
	}

	/**
	 * Load a program from a markdown string (for testing without file access).
	 */
	async loadProgramFromString(markdown: string): Promise<ProgramData> {
		this.programMarkdown = markdown;
		this.programData = await this.parseProgram(markdown);
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
					conditionTerms: r.condition.terms,
					effect: r.effect,
					timing: r.timing,
					sourceText: r.sourceText,
					description: r.description,
				})),
			});
			// Load program into the event-driven engine
			this.engine.loadProgram(this.compiledProgram);

			// Load session history for rule evaluation (streaks, multi-session rules)
			await this.loadSessionHistoryIntoEngine();
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
	 * Handle UI events and update session state.
	 * Delegates to the FitnessDSLEngine for core workout logic.
	 */
	dispatch(event: UIEvent): SessionState {
		switch (event.type) {
			case 'start_workout': {
				const result = this.engine.dispatch({ type: 'startWorkout', workoutName: event.workoutName });
				if (isErrorResult(result)) {
					console.error('[FitnessDomainAdapter] Engine error:', result.error);
					throw new Error(`Failed to start workout: ${result.error}`);
				}
				if (isStartWorkoutResult(result)) {
					this.syncSessionStateFromEngine(result, event.workoutName, event.programId);
				}
				// If a specific exercise index was requested, skip to it
				if (event.startExerciseIndex !== undefined && event.startExerciseIndex > 0) {
					this.sessionState.currentExerciseIndex = Math.min(
						event.startExerciseIndex,
						this.sessionState.exercises.length - 1
					);
				}
				break;
			}

			case 'complete_set': {
				const exerciseIndex = this.sessionState.currentExerciseIndex;
				const currentExercise = this.sessionState.exercises[exerciseIndex];

				// Ensure the correct exercise is active in the engine (using index for duplicate names)
				const engineState = this.engine.getState();
				if (currentExercise && engineState.currentExerciseIndex !== exerciseIndex) {
					const startResult = this.engine.dispatch({
						type: 'startExercise',
						exerciseName: currentExercise.exercise,
						exerciseIndex: exerciseIndex
					});
					if (isErrorResult(startResult)) {
						console.error('[FitnessDomainAdapter] Engine startExercise failed:', startResult.error);
						// Fall back to local state update
						this.recordCompletedSet(event.exercise, event.reps, event.weight, event.rpe, event.restSeconds);
						this.sessionState.extraRestTime = 0;
						break;
					}
				}

				// Complete set in engine
				const result = this.engine.dispatch({
					type: 'completeSet',
					setData: {
						reps: event.reps,
						weight: event.weight === 0 ? 'bodyweight' : `${event.weight}kg`,
						rpe: event.rpe,
						completedAt: new Date().toISOString(),
					}
				});

				if (isErrorResult(result)) {
					console.error('[FitnessDomainAdapter] Engine completeSet failed:', result.error);
					// Fall back to local state update
					this.recordCompletedSet(event.exercise, event.reps, event.weight, event.rpe, event.restSeconds);
				} else {
					// Engine succeeded - update local state to match
					this.recordCompletedSet(event.exercise, event.reps, event.weight, event.rpe, event.restSeconds);
				}

				this.sessionState.extraRestTime = 0;
				break;
			}

			case 'update_set':
				// Engine doesn't support set updates - keep local implementation
				this.updateSet(event.exerciseIndex, event.setIndex, event.reps, event.weight, event.rpe);
				break;

			case 'skip_exercise': {
				this.engine.dispatch({ type: 'skipExercise', exerciseName: event.exercise });
				this.sessionState.currentExerciseIndex++;
				this.sessionState.currentSetIndex = 0;
				this.sessionState.extraRestTime = 0;
				this.sessionState.restStartTime = Date.now();

				// Start next exercise in engine with correct index
				const nextAfterSkip = this.sessionState.exercises[this.sessionState.currentExerciseIndex];
				if (nextAfterSkip) {
					this.engine.dispatch({
						type: 'startExercise',
						exerciseName: nextAfterSkip.exercise,
						exerciseIndex: this.sessionState.currentExerciseIndex
					});
				}
				break;
			}

			case 'next_exercise': {
				const nextIdx = this.sessionState.currentExerciseIndex + 1;
				const nextExercise = this.sessionState.exercises[nextIdx];

				// Start next exercise in engine with correct index
				if (nextExercise) {
					const result = this.engine.dispatch({
						type: 'startExercise',
						exerciseName: nextExercise.exercise,
						exerciseIndex: nextIdx
					});
					if (isErrorResult(result)) {
						console.error('[FitnessDomainAdapter] Engine startExercise failed:', result.error);
					}
				}

				this.sessionState.currentExerciseIndex = nextIdx;
				this.sessionState.currentSetIndex = 0;
				this.sessionState.extraRestTime = 0;
				this.sessionState.restStartTime = Date.now();
				break;
			}

			case 'set_current_exercise': {
				const targetIdx = event.exerciseIndex;
				const targetExercise = this.sessionState.exercises[targetIdx];

				if (targetExercise && targetIdx >= 0 && targetIdx < this.sessionState.exercises.length) {
					// Start exercise in engine with correct index
					const result = this.engine.dispatch({
						type: 'startExercise',
						exerciseName: targetExercise.exercise,
						exerciseIndex: targetIdx
					});
					if (isErrorResult(result)) {
						console.error('[FitnessDomainAdapter] Engine startExercise failed:', result.error);
					}

					this.sessionState.currentExerciseIndex = targetIdx;
					this.sessionState.currentSetIndex = targetExercise.sets.length; // First incomplete set
					this.sessionState.extraRestTime = 0;
				}
				break;
			}

			case 'finish_session': {
				const result = this.engine.dispatch({ type: 'completeWorkout' });
				if (!isErrorResult(result)) {
					console.log('[FitnessDomainAdapter] Workout completed via engine');
				}
				this.sessionState.status = 'completed';
				this.sessionState.endTime = new Date().toISOString();
				this.sessionState.isActive = false;
				break;
			}

			case 'cancel_session':
				this.engine.dispatch({ type: 'abortWorkout' });
				this.sessionState = this.createEmptySessionState();
				break;

			case 'add_extra_rest': {
				// Dispatch to engine for tracking
				const addRestResult = this.engine.dispatch({
					type: 'addExtraRest',
					seconds: event.seconds
				});
				if (!isErrorResult(addRestResult)) {
					// Sync local state from engine
					const engineState = this.engine.getState();
					this.sessionState.extraRestTime = engineState.extraRestSeconds;
				}
				break;
			}

			case 'start_rest_timer': {
				// Dispatch to engine with timestamp from event (not generated internally)
				const startRestResult = this.engine.dispatch({
					type: 'startRest',
					timestamp: new Date().toISOString()
				});
				if (!isErrorResult(startRestResult)) {
					// Sync local state from engine
					const engineState = this.engine.getState();
					this.sessionState.extraRestTime = engineState.extraRestSeconds;
					// Convert ISO string to ms timestamp for UI compatibility
					this.sessionState.restStartTime = engineState.restStartedAt
						? new Date(engineState.restStartedAt).getTime()
						: null;
				}
				break;
			}
		}

		return this.sessionState;
	}

	/**
	 * Sync session state from engine's StartWorkoutResult
	 */
	private syncSessionStateFromEngine(
		result: StartWorkoutResult,
		workoutName: string,
		programId?: string
	): void {
		const startTime = new Date().toISOString();
		const date = startTime.split('T')[0] ?? startTime;
		const workout = result.workout;

		// Get compiled workout data for media (has richer ExerciseExport with media)
		const compiledWorkout = this.compiledProgram?.workouts.get(workoutName);

		// Map NextSessionExercise to SessionExerciseState
		const exercises: SessionExerciseState[] = workout.exercises.map(e => {
			// Parse weight from string like "80kg" or "bodyweight"
			let targetWeight: number | null = null;
			if (e.target.weight) {
				const weightMatch = e.target.weight.match(/(\d+)/);
				if (weightMatch?.[1]) {
					targetWeight = parseInt(weightMatch[1], 10);
				} else if (e.target.weight.toLowerCase().includes('body')) {
					targetWeight = 0;
				}
			}

			// Parse rest from timer
			let restSeconds = 120;
			if (e.timer?.type === 'rest' && e.timer.duration) {
				const restMatch = e.timer.duration.match(/(\d+)/);
				if (restMatch?.[1]) {
					restSeconds = parseInt(restMatch[1], 10);
				}
			}

			// Get media and note from compiled program
			const compiledExercise = compiledWorkout?.exercises.find(ce => ce.name === e.name);
			const media = compiledExercise?.media ?? [];
			const note = compiledExercise?.note ?? null;

			return {
				exercise: e.name,
				targetSets: e.target.sets,
				targetRepsMin: e.target.reps.min,
				targetRepsMax: e.target.reps.max,
				targetWeight,
				targetRPE: e.target.rpe,
				restSeconds,
				sets: [],
				media,
				note
			};
		});

		this.sessionState = {
			isActive: true,
			id: this.generateSessionId(startTime, workoutName),
			workout: workoutName,
			programId: programId ?? null,
			date,
			currentExerciseIndex: -1, // No exercise selected yet - user must click to start
			currentSetIndex: 0,
			exercises,
			startTime,
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null // No rest timer until first set is completed
		};
	}

	/**
	 * Record a completed set in local state (without auto-advance logic)
	 * Uses currentExerciseIndex to handle duplicate exercise names correctly.
	 */
	private recordCompletedSet(
		exercise: string,
		reps: number,
		weight: number,
		rpe: number,
		restSeconds?: number
	): void {
		// Use current exercise index to get the correct exercise (handles duplicate names)
		const exerciseIndex = this.sessionState.currentExerciseIndex;
		let exerciseState = this.sessionState.exercises[exerciseIndex];

		// Fallback: if index doesn't match, try to find by name (shouldn't happen normally)
		if (!exerciseState || exerciseState.exercise !== exercise) {
			console.warn(`[FitnessDomainAdapter] Exercise mismatch at index ${exerciseIndex}: expected ${exercise}, got ${exerciseState?.exercise}`);
			exerciseState = this.sessionState.exercises.find(e => e.exercise === exercise);
		}

		if (!exerciseState) {
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
	 * Get all completed sessions from the repository
	 */
	async getCompletedSessions(): Promise<Session[]> {
		return this.sessionRepository.list();
	}

	/**
	 * Get rest state directly from the engine.
	 * Returns the engine's authoritative rest state for platform-agnostic access.
	 */
	getRestState(): {
		restStartedAt: string | null;
		extraRestSeconds: number;
		targetRestSeconds: number;
	} {
		const engineState = this.engine.getState();
		return {
			restStartedAt: engineState.restStartedAt,
			extraRestSeconds: engineState.extraRestSeconds,
			targetRestSeconds: engineState.targetRestSeconds,
		};
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
				setScheme: exerciseTarget.setScheme,
				weight: exerciseTarget.weight,
				targetRPE: exerciseTarget.targetRPE,
				autoregulation: exerciseTarget.autoregulation,
			},
			completedSets,
			globalRulesCount: this.compiledProgram.globalRules.length,
			globalRulesWithNextSet: this.compiledProgram.globalRules.filter(r => r.timing === 'next_set').length,
			globalRulesNextSetDetail: this.compiledProgram.globalRules.filter(r => r.timing === 'next_set').map(r => ({
				timing: r.timing,
				sourceText: r.sourceText,
				effect: r.effect,
			})),
		});

		// Generate the execution view using the DSL engine
		const executionView = generateExecutionView(
			exerciseTarget,
			completedSets,
			this.compiledProgram.globalRules,
			[], // alternatives - could be populated from exercise data if needed
			this.compiledProgram
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

	/**
	 * Evaluate what adjustments (if any) apply to the next session after completing an exercise.
	 * Used to display a summary after the last set of an exercise.
	 */
	evaluateExerciseCompletion(exerciseIndex: number): ExerciseCompletionResult {
		const exerciseState = this.sessionState.exercises[exerciseIndex];
		if (!exerciseState || !this.compiledProgram) {
			return {
				exerciseName: exerciseState?.exercise ?? 'Unknown',
				nextTarget: {
					sets: 0,
					reps: '0',
					weight: '0kg',
					rpe: null,
				},
				adjustment: null,
				ruleProgress: null,
				streakBroken: null,
			};
		}

		// Find the compiled exercise target
		const exerciseTarget = this.compiledProgram.exercises.find(
			e => e.name === exerciseState.exercise && e.workout === this.sessionState.workout
		);

		// Build SessionResults from completed sets
		const sessionDate = (this.sessionState.date || new Date().toISOString().split('T')[0]) as string;
		const sessionWorkout = (this.sessionState.workout || '') as string;
		const sessionResults: SessionResults = {
			date: sessionDate,
			workout: sessionWorkout,
			exercise: exerciseState.exercise,
			sets: exerciseState.sets.map(s => ({
				datetime: `${sessionDate} 00:00`,
				workout: sessionWorkout,
				exercise: exerciseState.exercise,
				reps: s.reps,
				weight: s.weight === 0 ? 'bodyweight' : `${s.weight}kg`,
				rpe: s.rpe,
			})),
		};

		// Default next target (same as current if no rules fire)
		const defaultTarget = {
			sets: exerciseState.targetSets,
			reps: exerciseState.targetRepsMin === exerciseState.targetRepsMax
				? String(exerciseState.targetRepsMin)
				: `${exerciseState.targetRepsMin}-${exerciseState.targetRepsMax}`,
			weight: exerciseState.targetWeight === null || exerciseState.targetWeight === 0
				? 'bodyweight'
				: `${exerciseState.targetWeight}kg`,
			rpe: exerciseState.targetRPE,
		};

		// Get execution view for rule progress (it contains ruleProgress computed by fitness-dsl)
		const executionView = this.getExecutionView(exerciseIndex);
		const ruleProgress = executionView?.ruleProgress ?? null;

		// Check for any broken streaks in the rule progress
		let streakBroken: ExerciseCompletionResult['streakBroken'] = null;
		if (ruleProgress) {
			const brokenRule = ruleProgress.rules.find(r => r.streakBroken?.wasBroken);
			if (brokenRule && brokenRule.streakBroken) {
				streakBroken = {
					wasBroken: true,
					previousStreak: brokenRule.streakBroken.previousStreak,
					ruleDescription: brokenRule.ruleDescription || brokenRule.ruleSource,
				};
			}
		}

		if (!exerciseTarget) {
			return {
				exerciseName: exerciseState.exercise,
				nextTarget: defaultTarget,
				adjustment: null,
				ruleProgress,
				streakBroken,
			};
		}

		// Evaluate session with fitness-dsl
		// Use "next_session" timing filter to only show rules that affect the next session
		// (not "next_set" rules which already applied during the workout)
		const changeReport = evaluateSession(
			sessionResults,
			exerciseTarget as ExerciseTarget,
			this.compiledProgram.globalRules,
			[sessionResults], // allSessions - just current for now
			[], // previousReports
			"next_session" // timingFilter - only evaluate next_session rules
		);

		if (!changeReport) {
			// No rule fired
			return {
				exerciseName: exerciseState.exercise,
				nextTarget: defaultTarget,
				adjustment: null,
				ruleProgress,
				streakBroken,
			};
		}

		// Rule fired - return the adjustment info
		// For next_set rules: show what happened during the session
		// For next_session rules: show what will change next time
		const isNextSetRule = changeReport.timing === 'next_set';

		return {
			exerciseName: exerciseState.exercise,
			nextTarget: isNextSetRule ? defaultTarget : {
				sets: changeReport.after.sets,
				reps: changeReport.after.reps,
				weight: changeReport.after.weight,
				rpe: changeReport.after.rpe,
			},
			adjustment: {
				change: changeReport.change,
				reason: changeReport.reason,
				timing: changeReport.timing ?? 'next_session',
			},
			ruleProgress,
			streakBroken,
		};
	}

	/**
	 * Get rule progress for an exercise from the current execution view.
	 * Convenience method for UI components that need just the rule progress.
	 */
	getRuleProgress(exerciseIndex: number): ExerciseRuleProgress | null {
		const executionView = this.getExecutionView(exerciseIndex);
		return executionView?.ruleProgress ?? null;
	}
}
