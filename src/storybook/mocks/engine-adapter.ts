/**
 * Engine-based domain adapter for Storybook
 *
 * Uses the real FitnessDSLEngine to evaluate progression rules,
 * so stories only need to dispatch events and the engine computes state.
 *
 * This is preferred over the mock adapter for stories that need realistic
 * rule evaluation, streaks, and adjustments.
 */

import {
	compileProgramFromString,
	parseProgram as parseFitnessDSL,
	FitnessDSLEngine,
	generateExecutionView,
	evaluateSession,
	isErrorResult,
	isStartWorkoutResult,
	computeRuleProgress,
	type CompiledProgram,
	type ExerciseExecutionView,
	type CompletedSetInput,
	type MediaReference,
	type ExerciseRuleProgress,
	type ExerciseTarget,
	type SessionResults,
	type PreviousStreaks,
} from 'fitness-dsl';

/** SessionData format required by generateExecutionView for rule progress */
interface SessionDataForRules {
	date: string;
	workout: string;
	exercise: string;
	sets: Array<{ reps: number; weight: string; rpe: number }>;
}

import type {
	ProgramData,
	SessionState,
	SessionExerciseState,
	CompletedSet,
	UIEvent,
	ExerciseCompletionResult,
} from '../../domain/fitness-domain-adapter';

export interface EngineAdapterConfig {
	/** Program markdown to parse and load */
	programMarkdown: string;
	/** Optional session history to pre-populate for rule evaluation */
	sessionHistory?: SessionHistoryEntry[];
}

export interface SessionHistoryEntry {
	date: string;
	workout: string;
	exercises: Array<{
		name: string;
		sets: Array<{ reps: number; weight: number | string; rpe: number }>;
	}>;
}

/**
 * Creates a domain adapter that uses the real FitnessDSLEngine.
 * Stories dispatch events and get real computed state including rule evaluation.
 */
export function createEngineAdapter(config: EngineAdapterConfig) {
	let programData: ProgramData | null = null;
	let compiledProgram: CompiledProgram | null = null;
	const engine = new FitnessDSLEngine({ debug: false, autoEvaluate: true });

	// Convert session history to SessionData[] format for rule evaluation
	// SessionData is per-exercise, so we flatten the structure
	const sessionHistory: SessionDataForRules[] = (config.sessionHistory ?? []).flatMap(entry =>
		entry.exercises.map(ex => ({
			date: entry.date,
			workout: entry.workout,
			exercise: ex.name,
			sets: ex.sets.map(s => ({
				reps: s.reps,
				weight: typeof s.weight === 'number'
					? (s.weight === 0 ? 'bodyweight' : `${s.weight}kg`)
					: s.weight,
				rpe: s.rpe,
			})),
		}))
	);

	// Parse and compile the program
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

		// Load program into engine
		engine.loadProgram(compiledProgram);

		// Pre-populate session history if provided
		if (config.sessionHistory) {
			for (const historyEntry of config.sessionHistory) {
				// Simulate past sessions by dispatching events
				engine.dispatch({ type: 'startWorkout', workoutName: historyEntry.workout });
				for (const exercise of historyEntry.exercises) {
					engine.dispatch({
						type: 'startExercise',
						exerciseName: exercise.name,
						exerciseIndex: 0,
					});
					for (const set of exercise.sets) {
						engine.dispatch({
							type: 'completeSet',
							setData: {
								reps: set.reps,
								weight: typeof set.weight === 'number'
									? (set.weight === 0 ? 'bodyweight' : `${set.weight}kg`)
									: set.weight,
								rpe: set.rpe,
								completedAt: `${historyEntry.date}T12:00:00Z`,
							},
						});
					}
				}
				engine.dispatch({ type: 'completeWorkout' });
			}
		}
	} catch (e) {
		console.error('[EngineAdapter] Failed to parse/compile program:', e);
	}

	// Session state managed locally (synced from engine results)
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

	let sessionState: SessionState = createEmptySession();

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

	// Define getExecutionView as a standalone function so it can be referenced in evaluateExerciseCompletion
	const getExecutionView = (exerciseIndex: number): ExerciseExecutionView | null => {
		// Allow getting execution view for both active and completed sessions
		// (FinishScreen needs this for completed sessions)
		if (!compiledProgram || (sessionState.exercises.length === 0)) {
			return null;
		}

		const sessionExercise = sessionState.exercises[exerciseIndex];
		if (!sessionExercise) {
			return null;
		}

		// Find the matching exercise target from the compiled program
		const exerciseTarget = compiledProgram.exercises.find(
			e => e.name.toLowerCase() === sessionExercise.exercise.toLowerCase() &&
			     e.workout.toLowerCase() === sessionState.workout?.toLowerCase()
		);

		if (!exerciseTarget) {
			return null;
		}

		// Convert completed sets to CompletedSetInput format
		const completedSets: CompletedSetInput[] = sessionExercise.sets.map(set => ({
			reps: set.reps,
			weight: set.weight === 0 ? 'bodyweight' : `${set.weight}kg`,
			rpe: set.rpe,
		}));

		// Build current session data for rule evaluation
		const currentSessionData: SessionDataForRules = {
			date: sessionState.date ?? new Date().toISOString().split('T')[0] ?? '',
			workout: sessionState.workout ?? '',
			exercise: sessionExercise.exercise,
			sets: sessionExercise.sets.map(s => ({
				reps: s.reps,
				weight: s.weight === 0 ? 'bodyweight' : `${s.weight}kg`,
				rpe: s.rpe,
			})),
		};

		// Filter historical sessions for this exercise
		const exerciseHistory = sessionHistory.filter(
			h => h.exercise.toLowerCase() === sessionExercise.exercise.toLowerCase()
		);

		// Calculate previousStreaks from history BEFORE current session
		// This allows streak broken detection when current session breaks the streak
		// We treat the last historical session as "current" to properly count the streak
		const previousStreaks: PreviousStreaks = [];
		if (exerciseHistory.length > 0) {
			// To properly count streaks, we need to evaluate with the last historical
			// session as the "current" session (streak counting requires currentSessionMatches)
			const lastHistorySession = exerciseHistory[exerciseHistory.length - 1];
			const historyWithoutLast = exerciseHistory.slice(0, -1);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const historyProgress = computeRuleProgress(
				exerciseTarget,
				compiledProgram.globalRules,
				historyWithoutLast as any,
				lastHistorySession as any // Treat last history session as "current"
			);
			// Extract streak counts from each rule's progress
			for (const rule of historyProgress.rules) {
				if (rule.progress && rule.progress.current > 0) {
					previousStreaks.push([rule.ruleSource, rule.progress.current]);
				}
			}
		}

		// Combine history with current session
		const allSessionData = [...exerciseHistory, currentSessionData];

		// Generate the execution view using the DSL engine
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const executionView = generateExecutionView(
			exerciseTarget,
			completedSets,
			compiledProgram.globalRules,
			[],
			compiledProgram,
			allSessionData as any,
			previousStreaks
		);

		// Debug: log rule progress and streak broken detection
		if (executionView.ruleProgress) {
			console.log('[DEBUG] Final ruleProgress for', sessionExercise.exercise);
			for (const rule of executionView.ruleProgress.rules) {
				console.log('[DEBUG] Final rule:', rule.ruleSource,
					'progress:', rule.progress ? `${rule.progress.current}/${rule.progress.required}` : 'none',
					'currentlyMet:', rule.currentlyMet,
					'streakBroken:', rule.streakBroken);
			}
		}

		return executionView;
	};

	return {
		getProgram: (): ProgramData | null => programData,
		getProgramMarkdown: (): string | null => config.programMarkdown,
		getSessionState: (): SessionState => sessionState,

		getExecutionView,

		evaluateExerciseCompletion: (exerciseIndex: number): ExerciseCompletionResult => {
			const exerciseState = sessionState.exercises[exerciseIndex];
			if (!exerciseState || !compiledProgram) {
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
			const exerciseTarget = compiledProgram.exercises.find(
				e => e.name === exerciseState.exercise && e.workout === sessionState.workout
			);

			// Default next target
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

			// Get execution view for rule progress
			const executionView = getExecutionView(exerciseIndex);
			const ruleProgress = executionView?.ruleProgress ?? null;

			// Check for broken streaks
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

			// Build SessionResults from completed sets
			const sessionDate = (sessionState.date || new Date().toISOString().split('T')[0]) as string;
			const sessionWorkout = (sessionState.workout || '') as string;
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

			// Convert historical sessions for this exercise to SessionResults format
			const historicalSessionResults: SessionResults[] = sessionHistory
				.filter(h => h.exercise.toLowerCase() === exerciseState.exercise.toLowerCase())
				.map(h => ({
					date: h.date,
					workout: h.workout,
					exercise: h.exercise,
					sets: h.sets.map(s => ({
						datetime: `${h.date} 00:00`,
						workout: h.workout,
						exercise: h.exercise,
						reps: s.reps,
						weight: s.weight,
						rpe: s.rpe,
					})),
				}));

			// Combine historical sessions with current session
			const allSessions = [...historicalSessionResults, sessionResults];

			// Evaluate session rules (next_session timing only)
			const changeReport = evaluateSession(
				sessionResults,
				exerciseTarget as ExerciseTarget,
				compiledProgram.globalRules,
				allSessions,
				[],
				'next_session'
			);

			if (!changeReport) {
				return {
					exerciseName: exerciseState.exercise,
					nextTarget: defaultTarget,
					adjustment: null,
					ruleProgress,
					streakBroken,
				};
			}

			// Rule fired - return the adjustment info
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
		},

		dispatch: (event: UIEvent): SessionState => {
			switch (event.type) {
				case 'start_workout': {
					const result = engine.dispatch({ type: 'startWorkout', workoutName: event.workoutName });
					if (isErrorResult(result)) {
						console.error('[EngineAdapter] Engine error:', result.error);
						break;
					}

					if (isStartWorkoutResult(result)) {
						const startTime = new Date().toISOString();
						const date = startTime.split('T')[0] ?? startTime;
						const workout = result.workout;
						const compiledWorkout = compiledProgram?.workouts.get(event.workoutName);

						const exercises: SessionExerciseState[] = workout.exercises.map(e => {
							let targetWeight: number | null = null;
							if (e.target.weight) {
								const weightMatch = e.target.weight.match(/(\d+)/);
								if (weightMatch?.[1]) {
									targetWeight = parseInt(weightMatch[1], 10);
								} else if (e.target.weight.toLowerCase().includes('body')) {
									targetWeight = 0;
								}
							}

							let restSeconds = 120;
							if (e.timer?.type === 'rest' && e.timer.duration) {
								const restMatch = e.timer.duration.match(/(\d+)/);
								if (restMatch?.[1]) {
									restSeconds = parseInt(restMatch[1], 10);
								}
							}

							const compiledExercise = compiledWorkout?.exercises.find(ce => ce.name === e.name);
							const media: MediaReference[] = compiledExercise?.media ?? [];
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
								note,
							};
						});

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
					}

					if (event.startExerciseIndex !== undefined && event.startExerciseIndex > 0) {
						sessionState.currentExerciseIndex = Math.min(
							event.startExerciseIndex,
							sessionState.exercises.length - 1
						);
					}
					break;
				}

				case 'complete_set': {
					const exerciseIndex = sessionState.currentExerciseIndex;
					const currentExercise = sessionState.exercises[exerciseIndex];

					// Ensure correct exercise is active in engine
					const engineState = engine.getState();
					if (currentExercise && engineState.currentExerciseIndex !== exerciseIndex) {
						engine.dispatch({
							type: 'startExercise',
							exerciseName: currentExercise.exercise,
							exerciseIndex: exerciseIndex,
						});
					}

					// Complete set in engine
					engine.dispatch({
						type: 'completeSet',
						setData: {
							reps: event.reps,
							weight: event.weight === 0 ? 'bodyweight' : `${event.weight}kg`,
							rpe: event.rpe,
							completedAt: new Date().toISOString(),
						},
					});

					// Record in local state
					const exerciseState = sessionState.exercises[exerciseIndex];
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

				case 'next_exercise': {
					const nextIdx = sessionState.currentExerciseIndex + 1;
					const nextExercise = sessionState.exercises[nextIdx];

					if (nextExercise) {
						engine.dispatch({
							type: 'startExercise',
							exerciseName: nextExercise.exercise,
							exerciseIndex: nextIdx,
						});
					}

					sessionState.currentExerciseIndex = nextIdx;
					sessionState.currentSetIndex = 0;
					sessionState.extraRestTime = 0;
					sessionState.restStartTime = Date.now();
					break;
				}

				case 'skip_exercise': {
					engine.dispatch({ type: 'skipExercise', exerciseName: event.exercise });
					sessionState.currentExerciseIndex++;
					sessionState.currentSetIndex = 0;
					sessionState.extraRestTime = 0;
					sessionState.restStartTime = Date.now();

					const nextAfterSkip = sessionState.exercises[sessionState.currentExerciseIndex];
					if (nextAfterSkip) {
						engine.dispatch({
							type: 'startExercise',
							exerciseName: nextAfterSkip.exercise,
							exerciseIndex: sessionState.currentExerciseIndex,
						});
					}
					break;
				}

				case 'set_current_exercise': {
					const targetIdx = event.exerciseIndex;
					const targetExercise = sessionState.exercises[targetIdx];

					if (targetExercise && targetIdx >= 0 && targetIdx < sessionState.exercises.length) {
						engine.dispatch({
							type: 'startExercise',
							exerciseName: targetExercise.exercise,
							exerciseIndex: targetIdx,
						});

						sessionState.currentExerciseIndex = targetIdx;
						sessionState.currentSetIndex = targetExercise.sets.length;
						sessionState.extraRestTime = 0;
					}
					break;
				}

				case 'finish_session':
					engine.dispatch({ type: 'completeWorkout' });
					sessionState.status = 'completed';
					sessionState.endTime = new Date().toISOString();
					sessionState.isActive = false;
					break;

				case 'cancel_session':
					engine.dispatch({ type: 'abortWorkout' });
					sessionState = createEmptySession();
					break;

				case 'add_extra_rest': {
					const result = engine.dispatch({ type: 'addExtraRest', seconds: event.seconds });
					if (!isErrorResult(result)) {
						const engineState = engine.getState();
						sessionState.extraRestTime = engineState.extraRestSeconds;
					}
					break;
				}

				case 'start_rest_timer': {
					const result = engine.dispatch({
						type: 'startRest',
						timestamp: new Date().toISOString(),
					});
					if (!isErrorResult(result)) {
						const engineState = engine.getState();
						sessionState.extraRestTime = engineState.extraRestSeconds;
						sessionState.restStartTime = engineState.restStartedAt
							? new Date(engineState.restStartedAt).getTime()
							: null;
					}
					break;
				}
			}

			return JSON.parse(JSON.stringify(sessionState));
		},

		loadProgram: async (path: string): Promise<ProgramData> => {
			console.log('[EngineAdapter] loadProgram called with path:', path);
			if (!programData) throw new Error('No program loaded');
			return programData;
		},

		loadProgramWithTMs: async (
			path: string,
			_trainingMaxes?: Array<{ exercise: string; value: number; unit: 'kg' | 'lbs' }>
		): Promise<ProgramData> => {
			console.log('[EngineAdapter] loadProgramWithTMs called with path:', path);
			if (!programData) throw new Error('No program loaded');
			return programData;
		},

		saveSession: async (): Promise<string | null> => {
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

		getRestState: () => {
			const engineState = engine.getState();
			return {
				restStartedAt: engineState.restStartedAt,
				extraRestSeconds: engineState.extraRestSeconds,
				targetRestSeconds: engineState.targetRestSeconds,
			};
		},

		/** Access to the underlying engine for advanced usage */
		getEngine: () => engine,
	};
}

export type EngineAdapter = ReturnType<typeof createEngineAdapter>;

/**
 * Helper type for defining set data when simulating workouts
 */
export interface SetData {
	reps: number;
	weight: number;
	rpe: number;
}

/**
 * Simulates completing a workout with the given sets.
 * Useful for building up session state for stories.
 *
 * @example
 * const adapter = createEngineAdapter({ programMarkdown: PROGRAM });
 * simulateWorkout(adapter, 'Upper Body', {
 *   'Bench Press': [
 *     { reps: 10, weight: 80, rpe: 7 },
 *     { reps: 9, weight: 80, rpe: 8 },
 *     { reps: 8, weight: 80, rpe: 9 },
 *   ],
 * });
 */
export function simulateWorkout(
	adapter: EngineAdapter,
	workoutName: string,
	exerciseSets: Record<string, SetData[]>
): void {
	adapter.dispatch({ type: 'start_workout', workoutName });

	const sessionState = adapter.getSessionState();
	for (let i = 0; i < sessionState.exercises.length; i++) {
		const exercise = sessionState.exercises[i];
		if (!exercise) continue;

		const sets = exerciseSets[exercise.exercise];
		if (sets) {
			// Select this exercise (handles currentExerciseIndex starting at -1)
			if (adapter.getSessionState().currentExerciseIndex !== i) {
				adapter.dispatch({ type: 'set_current_exercise', exerciseIndex: i });
			}

			// Complete each set
			for (const set of sets) {
				adapter.dispatch({
					type: 'complete_set',
					exercise: exercise.exercise,
					reps: set.reps,
					weight: set.weight,
					rpe: set.rpe,
				});
			}
		}
	}
}

/**
 * Simulates completing sets for the current exercise only.
 * Useful for stories that show mid-workout states.
 */
export function simulateSets(
	adapter: EngineAdapter,
	sets: SetData[]
): void {
	const sessionState = adapter.getSessionState();
	const currentExercise = sessionState.exercises[sessionState.currentExerciseIndex];
	if (!currentExercise) return;

	for (const set of sets) {
		adapter.dispatch({
			type: 'complete_set',
			exercise: currentExercise.exercise,
			reps: set.reps,
			weight: set.weight,
			rpe: set.rpe,
		});
	}
}
