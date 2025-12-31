import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FitViewModel } from './fit-viewmodel';
import {
	createMockSessionState,
	createMockProgramRepo,
	createMockSettings,
	createSampleWorkout,
	flushPromises
} from '../test/mocks';
import type { Workout, Program } from '../types';
import type { SessionStateManager } from '../state/session-state';
import type { ProgramRepository } from '../data/program-repository';
import type { PluginSettings } from '../settings';

/**
 * Creates a FitViewModel with mock dependencies for testing.
 */
function createTestViewModel(options: {
	workouts?: Workout[];
	programs?: Program[];
	settings?: Partial<PluginSettings>;
} = {}): {
	vm: FitViewModel;
	sessionState: ReturnType<typeof createMockSessionState>;
	programRepo: ReturnType<typeof createMockProgramRepo>;
	settings: PluginSettings;
	saveSettings: ReturnType<typeof vi.fn>;
} {
	const settings = { ...createMockSettings(), ...options.settings };
	const sessionState = createMockSessionState(null);
	const programRepo = createMockProgramRepo(options.programs ?? []);
	const saveSettings = vi.fn().mockResolvedValue(undefined);

	const vm = new FitViewModel(
		sessionState as unknown as SessionStateManager,
		settings,
		programRepo as unknown as ProgramRepository,
		saveSettings
	);

	return { vm, sessionState, programRepo, settings, saveSettings };
}

describe('FitViewModel', () => {
	describe('initial state', () => {
		it('should have no active session initially', () => {
			const { vm } = createTestViewModel();
			const state = vm.getState();

			expect(state.hasActiveSession).toBe(false);
			expect(state.isInProgress).toBe(false);
			expect(state.session).toBeNull();
		});

		it('should have default form state', () => {
			const { vm } = createTestViewModel();
			const state = vm.getState();

			expect(state.weight).toBe(0);
			expect(state.reps).toBe(8);
		});
	});

	describe('starting a workout', () => {
		it('should start a workout from template', () => {
			const { vm } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			const state = vm.getState();

			expect(state.hasActiveSession).toBe(true);
			expect(state.session?.workout).toBe(workout.name);
			expect(state.session?.exercises.length).toBe(workout.exercises.length);
		});

		it('should initialize form state from exercise defaults', () => {
			const { vm } = createTestViewModel();
			const workout = createSampleWorkout({
				exercises: [{
					exercise: 'Bench Press',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					restSeconds: 120
				}]
			});

			vm.startWorkout(workout);
			const state = vm.getState();

			// Weight defaults to 0 (no previous sets)
			expect(state.weight).toBe(0);
			// Reps defaults to target min
			expect(state.reps).toBe(8);
		});

		it('should start an empty workout', () => {
			const { vm } = createTestViewModel();

			vm.startEmptyWorkout();
			const state = vm.getState();

			expect(state.hasActiveSession).toBe(true);
			expect(state.session?.exercises.length).toBe(0);
		});
	});

	describe('logging sets', () => {
		it('should log a set to the current exercise', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(80);
			vm.setReps(8);

			await vm.logSet();

			expect(sessionState.logSet).toHaveBeenCalledWith(0, 80, 8, undefined);
		});

		it('should allow overriding weight and reps in logSet', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(80);
			vm.setReps(8);

			await vm.logSet(100, 5, 9);

			expect(sessionState.logSet).toHaveBeenCalledWith(0, 100, 5, 9);
		});

		it('should throw error for zero weight', async () => {
			const { vm } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(0);
			vm.setReps(8);

			await expect(vm.logSet()).rejects.toThrow('Weight must be greater than 0');
		});

		it('should throw error for zero reps', async () => {
			const { vm } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(80);
			vm.setReps(0);

			await expect(vm.logSet()).rejects.toThrow('Reps must be greater than 0');
		});
	});

	describe('exercise completion tracking', () => {
		it('should track exercise completion status', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout({
				exercises: [{
					exercise: 'Bench Press',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					restSeconds: 120
				}]
			});

			vm.startWorkout(workout);

			// Initially not complete
			let state = vm.getState();
			expect(state.exerciseCompletion.completedSets).toBe(0);
			expect(state.exerciseCompletion.targetSets).toBe(3);
			expect(state.exerciseCompletion.isComplete).toBe(false);

			// Simulate logging 3 sets
			vm.setWeight(80);
			await vm.logSet();
			await vm.logSet();
			await vm.logSet();

			// Should have called logSet 3 times
			expect(sessionState.logSet).toHaveBeenCalledTimes(3);
		});
	});

	describe('form state management', () => {
		it('should update weight', () => {
			const { vm } = createTestViewModel();

			vm.setWeight(100);
			expect(vm.getState().weight).toBe(100);
		});

		it('should update reps', () => {
			const { vm } = createTestViewModel();

			vm.setReps(12);
			expect(vm.getState().reps).toBe(12);
		});

		it('should adjust weight by delta', () => {
			const { vm } = createTestViewModel();

			vm.setWeight(80);
			vm.adjustWeight(2.5);
			expect(vm.getState().weight).toBe(82.5);

			vm.adjustWeight(-5);
			expect(vm.getState().weight).toBe(77.5);
		});

		it('should not allow negative weight', () => {
			const { vm } = createTestViewModel();

			vm.setWeight(5);
			vm.adjustWeight(-10);
			expect(vm.getState().weight).toBe(0);
		});
	});

	describe('exercise selection', () => {
		it('should select an exercise by index', () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.selectExercise(1);

			expect(sessionState.setCurrentExerciseIndex).toHaveBeenCalledWith(1);
		});
	});

	describe('timer actions', () => {
		it('should start rest timer', () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.startRestTimer(90);

			expect(sessionState.startRestTimer).toHaveBeenCalledWith(90, 0);
		});

		it('should add time to rest timer', () => {
			const { vm, sessionState } = createTestViewModel();

			vm.addRestTime(15);

			expect(sessionState.addRestTime).toHaveBeenCalledWith(15);
		});

		it('should cancel rest timer', () => {
			const { vm, sessionState } = createTestViewModel();

			vm.cancelRestTimer();

			expect(sessionState.cancelRestTimer).toHaveBeenCalled();
		});

		it('should mark set start', () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.markSetStart();

			expect(sessionState.markSetStart).toHaveBeenCalledWith(0);
		});
	});

	describe('questionnaire actions', () => {
		it('should set exercise RPE', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			await vm.setExerciseRpe(8);

			expect(sessionState.setExerciseRpe).toHaveBeenCalledWith(0, 8);
		});

		it('should set muscle engagement', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			await vm.setMuscleEngagement('yes-clearly');

			expect(sessionState.setExerciseMuscleEngagement).toHaveBeenCalledWith(0, 'yes-clearly');
		});
	});

	describe('finishing workout', () => {
		it('should finish workout and return session', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(80);
			await vm.logSet();

			const finishedSession = await vm.finishWorkout();

			expect(sessionState.finishSession).toHaveBeenCalled();
			expect(finishedSession).not.toBeNull();
		});
	});

	describe('discarding workout', () => {
		it('should discard workout', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			await vm.discardWorkout();

			expect(sessionState.discardSession).toHaveBeenCalled();
		});
	});

	describe('program advancement', () => {
		it('should advance program after completing matching workout', async () => {
			const program: Program = {
				id: 'ppl',
				name: 'Push Pull Legs',
				workouts: ['push-day', 'pull-day', 'leg-day']
			};
			const { vm, saveSettings, settings } = createTestViewModel({
				programs: [program],
				settings: {
					activeProgram: 'ppl',
					programWorkoutIndex: 0
				}
			});

			// Start the first workout in the program
			const workout = createSampleWorkout({ id: 'push-day', name: 'Push Day' });
			vm.startWorkout(workout);
			vm.setWeight(80);
			await vm.logSet();

			// Finish the workout
			await vm.finishWorkout();
			await flushPromises();

			// Program index should advance
			expect(settings.programWorkoutIndex).toBe(1);
			expect(saveSettings).toHaveBeenCalled();
		});

		it('should wrap around at end of program', async () => {
			const program: Program = {
				id: 'ppl',
				name: 'Push Pull Legs',
				workouts: ['push-day', 'pull-day', 'leg-day']
			};
			const { vm, saveSettings, settings } = createTestViewModel({
				programs: [program],
				settings: {
					activeProgram: 'ppl',
					programWorkoutIndex: 2 // Last workout
				}
			});

			// Start the last workout
			const workout = createSampleWorkout({ id: 'leg-day', name: 'Leg Day' });
			vm.startWorkout(workout);
			vm.setWeight(100);
			await vm.logSet();

			await vm.finishWorkout();
			await flushPromises();

			// Should wrap back to 0
			expect(settings.programWorkoutIndex).toBe(0);
		});

		it('should not advance if workout does not match program', async () => {
			const program: Program = {
				id: 'ppl',
				name: 'Push Pull Legs',
				workouts: ['push-day', 'pull-day', 'leg-day']
			};
			const { vm, saveSettings, settings } = createTestViewModel({
				programs: [program],
				settings: {
					activeProgram: 'ppl',
					programWorkoutIndex: 0 // Expecting push-day
				}
			});

			// Start a different workout (not the current program workout)
			const workout = createSampleWorkout({ id: 'arm-day', name: 'Arm Day' });
			vm.startWorkout(workout);
			vm.setWeight(30);
			await vm.logSet();

			await vm.finishWorkout();
			await flushPromises();

			// Should NOT advance
			expect(settings.programWorkoutIndex).toBe(0);
		});
	});

	describe('exercise management', () => {
		it('should add exercise to session', () => {
			const { vm, sessionState } = createTestViewModel();

			vm.startEmptyWorkout();
			vm.addExercise('Bicep Curls', {
				exercise: 'Bicep Curls',
				targetSets: 3,
				targetRepsMin: 10,
				targetRepsMax: 12,
				restSeconds: 60
			});

			expect(sessionState.addExercise).toHaveBeenCalledWith('Bicep Curls', expect.objectContaining({
				exercise: 'Bicep Curls',
				targetSets: 3
			}));
		});

		it('should remove exercise from session', () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.removeExercise(0);

			expect(sessionState.removeExercise).toHaveBeenCalledWith(0);
		});

		it('should reorder exercises', () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.reorderExercises(0, 1);

			expect(sessionState.reorderExercises).toHaveBeenCalledWith(0, 1);
		});
	});

	describe('set management', () => {
		it('should edit a set', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(80);
			await vm.logSet();

			await vm.editSet(0, { weight: 85, reps: 6 });

			expect(sessionState.editSet).toHaveBeenCalledWith(0, 0, { weight: 85, reps: 6 });
		});

		it('should delete a set', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout();

			vm.startWorkout(workout);
			vm.setWeight(80);
			await vm.logSet();

			await vm.deleteSet(0);

			expect(sessionState.deleteSet).toHaveBeenCalledWith(0, 0);
		});
	});

	describe('state subscriptions', () => {
		it('should notify subscribers on state change', () => {
			const { vm } = createTestViewModel();
			const listener = vi.fn();

			vm.subscribe(listener);
			vm.setWeight(100);

			expect(listener).toHaveBeenCalled();
		});

		it('should return unsubscribe function', () => {
			const { vm } = createTestViewModel();
			const listener = vi.fn();

			const unsubscribe = vm.subscribe(listener);
			unsubscribe();
			vm.setWeight(100);

			// Listener should have been called once during subscribe (initial notification)
			// but not after unsubscribe
			const callsAfterUnsubscribe = listener.mock.calls.length;
			vm.setWeight(200);

			expect(listener.mock.calls.length).toBe(callsAfterUnsubscribe);
		});
	});

	describe('complete workout journey', () => {
		it('should support a complete workout from start to finish', async () => {
			const { vm, sessionState } = createTestViewModel();
			const workout = createSampleWorkout({
				exercises: [{
					exercise: 'Bench Press',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					restSeconds: 120
				}]
			});

			// 1. Start workout
			vm.startWorkout(workout);
			expect(vm.getState().hasActiveSession).toBe(true);

			// 2. Log sets
			vm.setWeight(80);
			vm.setReps(8);
			for (let i = 0; i < 3; i++) {
				await vm.logSet();
			}

			expect(sessionState.logSet).toHaveBeenCalledTimes(3);

			// 3. Fill questionnaire
			await vm.setExerciseRpe(8);
			await vm.setMuscleEngagement('yes-clearly');

			expect(sessionState.setExerciseRpe).toHaveBeenCalledWith(0, 8);
			expect(sessionState.setExerciseMuscleEngagement).toHaveBeenCalledWith(0, 'yes-clearly');

			// 4. Finish workout
			const session = await vm.finishWorkout();
			expect(session).not.toBeNull();
			expect(sessionState.finishSession).toHaveBeenCalled();
		});
	});
});
