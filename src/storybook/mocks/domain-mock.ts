/**
 * Domain mock for Storybook
 *
 * Provides a mock FitnessDomainAdapter that uses real fitness-dsl parsing
 * but doesn't require Obsidian vault operations.
 */

import {
	compileProgramFromString,
	parseProgram as parseFitnessDSL,
	type CompiledProgram,
	type MediaReference,
	type ExerciseRuleProgress,
	type RuleProgress,
} from 'fitness-dsl';
import type {
	ProgramData,
	SessionState,
	SessionExerciseState,
	CompletedSet,
	UIEvent,
	ExerciseCompletionResult,
	ExerciseExecutionView,
} from '../../domain/fitness-domain-adapter';

/** Mock exercise completion result for stories */
export interface MockExerciseCompletionConfig {
	adjustment?: { change: string; reason: string; timing?: 'next_set' | 'next_session' } | null;
	ruleProgress?: ExerciseRuleProgress | null;
	streakBroken?: {
		wasBroken: boolean;
		previousStreak: number;
		ruleDescription: string;
	} | null;
}

/** Helper to create a mock RuleProgress for stories */
export function createMockRuleProgress(options: {
	ruleSource: string;
	ruleDescription?: string | null;
	currentlyMet?: boolean;
	progress?: { current: number; required: number; unit: 'sessions' | 'sets' };
	streakBroken?: { wasBroken: boolean; previousStreak: number };
	effect?: string;
	timing?: 'next_set' | 'next_session' | null;
	layer?: 'autoregulation' | 'inline' | 'global';
}): RuleProgress {
	return {
		ruleSource: options.ruleSource,
		ruleDescription: options.ruleDescription ?? null,
		currentlyMet: options.currentlyMet ?? false,
		progress: options.progress ?? null,
		streakBroken: options.streakBroken ?? null,
		termProgress: [],
		effect: options.effect ?? '+2.5kg',
		timing: options.timing ?? 'next_session',
		layer: options.layer ?? 'global',
	};
}

/** Helper to create a mock ExerciseRuleProgress for stories */
export function createMockExerciseRuleProgress(rules: RuleProgress[]): ExerciseRuleProgress {
	// Find the rule closest to triggering
	let closestToTrigger: RuleProgress | null = null;
	let bestProgress = 0;
	for (const rule of rules) {
		if (rule.progress && rule.progress.current > 0) {
			const progressPercent = rule.progress.current / rule.progress.required;
			if (progressPercent > bestProgress) {
				bestProgress = progressPercent;
				closestToTrigger = rule;
			}
		}
	}
	return { rules, closestToTrigger };
}

export interface MockDomainConfig {
	programMarkdown?: string;
	sessionState?: Partial<SessionState>;
	/** Mock adjustment to return from evaluateExerciseCompletion (legacy, use exerciseCompletions instead) */
	exerciseAdjustment?: { change: string; reason: string } | null;
	/** Per-exercise completion configs (keyed by exercise name or index) */
	exerciseCompletions?: Record<string | number, MockExerciseCompletionConfig>;
}

/**
 * Creates a mock FitnessDomainAdapter for Storybook stories.
 * Uses real fitness-dsl parsing when programMarkdown is provided.
 */
export function createMockDomainAdapter(config: MockDomainConfig = {}) {
	let programData: ProgramData | null = null;
	let compiledProgram: CompiledProgram | null = null;

	// Parse program if markdown provided
	if (config.programMarkdown) {
		try {
			const result = parseFitnessDSL(config.programMarkdown);
			if (result.success && result.program) {
				programData = {
					program: {
						name: result.program.program.name,
						description: result.program.program.description,
					},
					schedule: result.program.schedule,
					progression: result.program.progression,
					workouts: result.program.workouts,
					nextSession: result.program.nextSession,
					sessionHistory: result.program.sessionHistory,
				};
			}
			compiledProgram = compileProgramFromString(config.programMarkdown);
		} catch (e) {
			console.error('[MockDomainAdapter] Failed to parse program:', e);
		}
	}

	const createEmptySession = (): SessionState => ({
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
		restStartTime: null,
	});

	let sessionState: SessionState = {
		...createEmptySession(),
		...config.sessionState,
	};

	const generateSessionId = (startTime: string, workoutName: string): string => {
		const date = new Date(startTime);
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		const ss = String(date.getSeconds()).padStart(2, '0');
		const slug = workoutName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}-${slug}`;
	};

	return {
		getProgram: (): ProgramData | null => programData,
		getProgramMarkdown: (): string | null => config.programMarkdown ?? null,
		getSessionState: (): SessionState => sessionState,

		getExecutionView: (_exerciseIndex: number): ExerciseExecutionView | null => {
			// Simplified execution view for Storybook
			return null;
		},

		evaluateExerciseCompletion: (exerciseIndex: number): ExerciseCompletionResult => {
			const exercise = sessionState.exercises[exerciseIndex];
			const exerciseName = exercise?.exercise ?? 'Unknown';

			// Look up exercise-specific config by index or name
			const exerciseConfig = config.exerciseCompletions?.[exerciseIndex]
				?? config.exerciseCompletions?.[exerciseName]
				?? {};

			// Support legacy exerciseAdjustment config
			let adjustment: { change: string; reason: string; timing: 'next_set' | 'next_session' } | null = null;
			if (exerciseConfig.adjustment) {
				adjustment = {
					change: exerciseConfig.adjustment.change,
					reason: exerciseConfig.adjustment.reason,
					timing: exerciseConfig.adjustment.timing ?? 'next_session',
				};
			} else if (config.exerciseAdjustment) {
				adjustment = {
					...config.exerciseAdjustment,
					timing: 'next_session',
				};
			}

			return {
				exerciseName,
				nextTarget: {
					sets: exercise?.targetSets ?? 3,
					reps: exercise ? `${exercise.targetRepsMin}-${exercise.targetRepsMax}` : '8-10',
					weight: exercise?.targetWeight ? `${exercise.targetWeight}kg` : 'bodyweight',
					rpe: exercise?.targetRPE ?? null,
				},
				adjustment,
				ruleProgress: exerciseConfig.ruleProgress ?? null,
				streakBroken: exerciseConfig.streakBroken ?? null,
			};
		},

		dispatch: (event: UIEvent): SessionState => {
			switch (event.type) {
				case 'start_workout': {
					const workoutDef = programData?.workouts.find(w => w.name === event.workoutName);
					const compiledWorkout = compiledProgram?.workouts.get(event.workoutName);
					const startTime = new Date().toISOString();
					const date = startTime.split('T')[0] ?? startTime;

					const exercises: SessionExerciseState[] = workoutDef?.exercises.map(e => {
						const reps = e.reps === 'AMRAP' ? { min: 1, max: 99 } : e.reps;
						const restMatch = e.rest?.match(/(\d+)/);
						const restSeconds = restMatch?.[1] ? parseInt(restMatch[1], 10) : 120;

						let targetWeight: number | null = null;
						if (e.weight) {
							const weightMatch = e.weight.match(/(\d+)/);
							if (weightMatch?.[1]) {
								targetWeight = parseInt(weightMatch[1], 10);
							} else if (e.weight.toLowerCase().includes('body')) {
								targetWeight = 0;
							}
						}

						const targetRPE = e.intensity?.type === 'RPE' ? e.intensity.value : null;
						const compiledExercise = compiledWorkout?.exercises.find(ce => ce.name === e.name);
						const media: MediaReference[] = compiledExercise?.media ?? [];
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
							note,
						};
					}) ?? [];

					sessionState = {
						isActive: true,
						id: generateSessionId(startTime, event.workoutName),
						workout: event.workoutName,
						programId: event.programId ?? null,
						date,
						currentExerciseIndex: -1, // No exercise selected yet - user must click to start
						currentSetIndex: 0,
						exercises,
						startTime,
						endTime: null,
						status: 'active',
						extraRestTime: 0,
						restStartTime: null, // No rest timer until first set
					};
					break;
				}

				case 'complete_set': {
					const exerciseState = sessionState.exercises[sessionState.currentExerciseIndex];
					if (exerciseState) {
						const setNumber = exerciseState.sets.length + 1;
						const newSet: CompletedSet = {
							exercise: event.exercise,
							setNumber,
							reps: event.reps,
							weight: event.weight,
							rpe: event.rpe,
							timestamp: new Date().toISOString(),
							actualRestSeconds: event.restSeconds,
						};
						exerciseState.sets.push(newSet);
						sessionState.currentSetIndex = setNumber;
						sessionState.extraRestTime = 0;
						sessionState.restStartTime = Date.now();
					}
					break;
				}

				case 'next_exercise':
					sessionState.currentExerciseIndex++;
					sessionState.currentSetIndex = 0;
					sessionState.extraRestTime = 0;
					sessionState.restStartTime = Date.now();
					break;

				case 'skip_exercise':
					sessionState.currentExerciseIndex++;
					sessionState.currentSetIndex = 0;
					sessionState.extraRestTime = 0;
					sessionState.restStartTime = Date.now();
					break;

				case 'set_current_exercise':
					if ('exerciseIndex' in event) {
						sessionState.currentExerciseIndex = event.exerciseIndex;
						sessionState.currentSetIndex = sessionState.exercises[event.exerciseIndex]?.sets.length ?? 0;
						sessionState.extraRestTime = 0;
					}
					break;

				case 'finish_session':
					sessionState.status = 'completed';
					sessionState.endTime = new Date().toISOString();
					sessionState.isActive = false;
					break;

				case 'cancel_session':
					sessionState = createEmptySession();
					break;

				case 'add_extra_rest':
					sessionState.extraRestTime += event.seconds;
					break;

				case 'start_rest_timer':
					sessionState.restStartTime = Date.now();
					break;
			}

			// Return a deep clone to trigger React re-renders
			return JSON.parse(JSON.stringify(sessionState));
		},

		loadProgram: async (path: string): Promise<ProgramData> => {
			console.log('[MockDomainAdapter] loadProgram called with path:', path);
			if (!programData) throw new Error('No program loaded');
			return programData;
		},

		loadProgramWithTMs: async (
			path: string,
			_trainingMaxes?: Array<{ exercise: string; value: number; unit: 'kg' | 'lbs' }>
		): Promise<ProgramData> => {
			console.log('[MockDomainAdapter] loadProgramWithTMs called with path:', path);
			if (!programData) throw new Error('No program loaded');
			return programData;
		},

		saveSession: async (): Promise<string | null> => {
			console.log('[MockDomainAdapter] saveSession called');
			return sessionState.id ? `Sessions/${sessionState.id}.md` : null;
		},

		getSessionProgress: (): number => {
			if (!sessionState.isActive || sessionState.exercises.length === 0) return 0;
			const totalSets = sessionState.exercises.reduce((sum, e) => sum + e.targetSets, 0);
			const completedSets = sessionState.exercises.reduce((sum, e) => sum + e.sets.length, 0);
			return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
		},

		isSessionComplete: (): boolean => {
			if (!sessionState.isActive) return false;
			return sessionState.exercises.every(e => e.sets.length >= e.targetSets);
		},

		getCurrentExercise: (): SessionExerciseState | null => {
			if (!sessionState.isActive) return null;
			return sessionState.exercises[sessionState.currentExerciseIndex] ?? null;
		},

		getNextWorkout: (): string | null => {
			return programData?.workouts[0]?.name ?? null;
		},

		setBasePath: (_path: string): void => {},

		getRestState: () => ({
			restStartedAt: sessionState.restStartTime ? new Date(sessionState.restStartTime).toISOString() : null,
			extraRestSeconds: sessionState.extraRestTime,
			targetRestSeconds: 120,
		}),
	};
}

export type MockDomainAdapter = ReturnType<typeof createMockDomainAdapter>;
