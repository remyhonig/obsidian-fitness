/**
 * Storybook decorators that wrap stories with required context providers
 *
 * Two modes are available:
 * 1. Mock mode (withProviders, withActiveSession, etc.) - Uses mock adapter with manual state
 * 2. Engine mode (withEngine, withEngineSession, etc.) - Uses real FitnessDSLEngine for rule evaluation
 *
 * Use engine mode when you need realistic rule evaluation, streaks, and adjustments.
 * Use mock mode for simple component stories or when you need specific mock data.
 */

import React from 'react';
import type { Decorator, StoryContext } from '@storybook/react';
import { App, Plugin, setStorybookFiles } from '../mocks/obsidian-storybook-mock';
import { createMockDomainAdapter, type MockExerciseCompletionConfig } from '../mocks/domain-mock';
import {
	createEngineAdapter,
	simulateWorkout,
	simulateSets,
	type EngineAdapter,
	type SetData,
	type SessionHistoryEntry,
} from '../mocks/engine-adapter';
import { AppProvider, PluginProvider, DomainProvider, FullscreenProvider } from '../../ui/react/contexts';
import type { FitnessDomainAdapter } from '../../domain/fitness-domain-adapter';
import type { UserSettingsRepository } from '../../data/user-settings-repository';

/**
 * Available programs organized by goal category
 */
interface MockProgramCategory {
	goal: string;
	programPaths: string[];
}

/**
 * Mock UserSettingsRepository for Storybook
 */
function createMockUserSettings(availablePrograms: MockProgramCategory[] = []): UserSettingsRepository {
	return {
		setBasePath: () => {},
		getSettings: async () => ({ activeProgram: null, availablePrograms, programTrainingMaxes: [] }),
		getActiveProgram: async () => null,
		setActiveProgram: async () => {},
		getAvailablePrograms: async () => availablePrograms,
		setAvailablePrograms: async () => {},
		getTrainingMaxes: async () => null,
		hasTrainingMaxes: async () => false,
		saveTrainingMaxes: async () => {},
		deleteTrainingMaxes: async () => {},
		clearCache: () => {},
	} as unknown as UserSettingsRepository;
}

// Default example program for stories that don't provide their own
const DEFAULT_PROGRAM = `# Simple Workout Program

A simple program for testing.

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body
- Friday: Full Body

---

# Workouts

## Upper Body

Chest and back focused workout.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s

---

## Lower Body

Leg focused workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s

---

## Full Body

Full body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 120s
`;

/**
 * Extended args that can be passed to stories using withProviders decorator.
 * Use this type when defining story args to get proper type checking.
 */
export interface StoryArgs {
	programMarkdown?: string;
	sessionState?: Record<string, unknown>;
	files?: Record<string, string>;
	exerciseAdjustment?: { change: string; reason: string } | null;
	/** Per-exercise completion configs (keyed by exercise name or index) */
	exerciseCompletions?: Record<string | number, MockExerciseCompletionConfig>;
	/** Set to true to show state with no program loaded */
	noProgram?: boolean;
	/** Available programs organized by goal category */
	availablePrograms?: MockProgramCategory[];
}

/**
 * Main decorator that provides all required contexts for stories
 */
export const withProviders: Decorator = (Story, context: StoryContext) => {
	const args = context.args as StoryArgs;
	// Use undefined for noProgram state, otherwise use provided or default
	const programMarkdown = args.noProgram ? undefined : (args.programMarkdown ?? DEFAULT_PROGRAM);
	const sessionState = args.sessionState;
	const files = args.files;
	const exerciseAdjustment = args.exerciseAdjustment;
	const exerciseCompletions = args.exerciseCompletions;
	const availablePrograms = args.availablePrograms ?? [];

	// Set up mock files if provided
	if (files) {
		setStorybookFiles(files);
	} else if (args.noProgram) {
		// No files for noProgram state
		setStorybookFiles({});
	} else {
		// Set up default files
		setStorybookFiles({
			'Fitness/Programs/Simple.md': programMarkdown ?? DEFAULT_PROGRAM,
		});
	}

	const app = new App();
	const plugin = new Plugin(app);
	const adapter = createMockDomainAdapter({
		programMarkdown,
		sessionState,
		exerciseAdjustment,
		exerciseCompletions,
	});

	return (
		<AppProvider app={app as unknown as import('obsidian').App}>
			<PluginProvider plugin={plugin as unknown as import('../../main').default}>
				<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings(availablePrograms)}>
					<FullscreenProvider>
						<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
							<Story />
						</div>
					</FullscreenProvider>
				</DomainProvider>
			</PluginProvider>
		</AppProvider>
	);
};

/**
 * Decorator for stories that only need App context (no domain)
 */
export const withAppProvider: Decorator = (Story) => {
	const app = new App();

	return (
		<AppProvider app={app as unknown as import('obsidian').App}>
			<Story />
		</AppProvider>
	);
};

/**
 * Helper to create a decorator with custom program markdown
 */
export function withProgram(programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);
		const adapter = createMockDomainAdapter({ programMarkdown });

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Helper to create a decorator with an active session
 */
export function withActiveSession(workoutName: string, programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);
		const adapter = createMockDomainAdapter({ programMarkdown });

		// Start the workout session
		adapter.dispatch({ type: 'start_workout', workoutName });

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Helper to create a decorator with a loaded program (no active session)
 */
export function withLoadedProgram(programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);
		const adapter = createMockDomainAdapter({ programMarkdown });

		// Verify program was loaded
		const program = adapter.getProgram();
		if (!program) {
			console.error('[withLoadedProgram] Failed to parse program markdown');
		}

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

// =============================================================================
// ENGINE-BASED DECORATORS
//
// These decorators use the real FitnessDSLEngine for rule evaluation.
// Use these when you need realistic progression rules, streaks, and adjustments.
// =============================================================================

/**
 * Creates a decorator with a loaded program using the engine adapter.
 * No session is started - useful for screens that just display program info.
 *
 * @example
 * export const WorkoutDetail: Story = {
 *   decorators: [withEngineProgram(PROGRAM_MARKDOWN)],
 * };
 */
export function withEngineProgram(programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);

		const adapter = createEngineAdapter({ programMarkdown });

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Configuration for engine-based stories
 */
export interface EngineStoryArgs extends StoryArgs {
	/** Enable engine mode (uses real rule engine instead of mocks) */
	useEngine?: boolean;
	/** Session history to pre-populate for rule evaluation */
	sessionHistory?: SessionHistoryEntry[];
	/** Sets to simulate for the current workout (keyed by exercise name) */
	simulatedSets?: Record<string, SetData[]>;
	/** Workout to start automatically */
	startWorkout?: string;
}

/**
 * Creates a decorator that uses the real FitnessDSLEngine.
 *
 * The engine evaluates progression rules based on dispatched events,
 * so stories get realistic rule progress, adjustments, and streaks.
 *
 * @example
 * // Story that shows a workout where rules have been triggered
 * export const WithTriggeredRule: Story = {
 *   decorators: [withEngine(PROGRAM_WITH_RULES)],
 *   args: {
 *     startWorkout: 'Upper Body',
 *     simulatedSets: {
 *       'Bench Press': [
 *         { reps: 10, weight: 80, rpe: 6 },
 *         { reps: 10, weight: 80, rpe: 6 },
 *         { reps: 10, weight: 80, rpe: 7 },
 *       ],
 *     },
 *   },
 * };
 */
export function withEngine(programMarkdown: string, sessionHistory?: SessionHistoryEntry[]): Decorator {
	return (Story, context: StoryContext) => {
		const args = context.args as EngineStoryArgs;
		const app = new App();
		const plugin = new Plugin(app);

		// Create engine adapter with optional session history
		const adapter = createEngineAdapter({
			programMarkdown,
			sessionHistory: sessionHistory ?? args.sessionHistory,
		});

		// Start workout if requested
		if (args.startWorkout) {
			adapter.dispatch({ type: 'start_workout', workoutName: args.startWorkout });

			// Simulate sets if provided
			if (args.simulatedSets) {
				const sessionState = adapter.getSessionState();
				for (let i = 0; i < sessionState.exercises.length; i++) {
					const exercise = sessionState.exercises[i];
					if (!exercise) continue;

					const sets = args.simulatedSets[exercise.exercise];
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
		}

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Creates a decorator for a workout session using the engine.
 * Automatically starts the specified workout and optionally simulates sets.
 *
 * @example
 * // Basic session
 * export const ActiveSession: Story = {
 *   decorators: [withEngineSession('Upper Body', PROGRAM_MARKDOWN)],
 * };
 *
 * // Session with sets completed
 * export const MidWorkout: Story = {
 *   decorators: [withEngineSession('Upper Body', PROGRAM, {
 *     'Bench Press': [{ reps: 10, weight: 80, rpe: 7 }],
 *   })],
 * };
 *
 * // Session with history for rule evaluation
 * export const WithHistory: Story = {
 *   decorators: [withEngineSession('Upper Body', PROGRAM, {
 *     'Bench Press': [{ reps: 10, weight: 80, rpe: 6 }],
 *   }, [{ date: '2024-01-08', workout: 'Upper Body', exercises: [...] }])],
 * };
 */
export function withEngineSession(
	workoutName: string,
	programMarkdown: string,
	exerciseSets?: Record<string, SetData[]>,
	sessionHistory?: SessionHistoryEntry[]
): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);

		const adapter = createEngineAdapter({
			programMarkdown,
			sessionHistory,
		});

		// Start the workout
		adapter.dispatch({ type: 'start_workout', workoutName });

		// Simulate sets if provided
		if (exerciseSets) {
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

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Creates a decorator that simulates a completed workout with the engine.
 * Useful for FinishScreen stories where rules should evaluate realistically.
 *
 * @example
 * export const WithRuleTriggered: Story = {
 *   decorators: [withCompletedEngineSession('Upper Body', PROGRAM, {
 *     'Bench Press': [
 *       { reps: 10, weight: 80, rpe: 6 },
 *       { reps: 10, weight: 80, rpe: 6 },
 *       { reps: 10, weight: 80, rpe: 7 },
 *     ],
 *   })],
 * };
 */
export function withCompletedEngineSession(
	workoutName: string,
	programMarkdown: string,
	exerciseSets: Record<string, SetData[]>,
	sessionHistory?: SessionHistoryEntry[]
): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);

		const adapter = createEngineAdapter({
			programMarkdown,
			sessionHistory,
		});

		// Simulate the workout
		simulateWorkout(adapter, workoutName, exerciseSets);

		// Finish the session
		adapter.dispatch({ type: 'finish_session' });

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter} userSettings={createMockUserSettings()}>
						<FullscreenProvider>
							<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
								<Story />
							</div>
						</FullscreenProvider>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

// Re-export types and helpers for stories
export type { SetData, SessionHistoryEntry, EngineAdapter };
export { simulateWorkout, simulateSets, createEngineAdapter };
