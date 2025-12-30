import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutEditorScreen } from './workout-editor';
import {
	createMockScreenContext,
	createSampleWorkout,
	createSampleSession,
	createSampleSessionExercise,
	flushPromises,
	click,
	findButton
} from '../../test/mocks';

// Polyfill DragEvent for jsdom
class MockDragEvent extends Event {
	dataTransfer: DataTransfer | null = null;
	constructor(type: string, init?: EventInit) {
		super(type, init);
	}
}
(globalThis as Record<string, unknown>).DragEvent = MockDragEvent;

describe('WorkoutEditorScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('template editing mode (editSession=false)', () => {
		it('should load workout from repository', async () => {
			const workout = createSampleWorkout({
				id: 'push-day',
				name: 'Push Day',
				exercises: [
					{ exercise: 'Bench Press', targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 180 },
					{ exercise: 'Overhead Press', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 }
				]
			});
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: false
			});
			screen.render();
			await flushPromises();

			expect(ctx.workoutRepo.get).toHaveBeenCalledWith('push-day');
		});

		it('should show name and description fields', async () => {
			const workout = createSampleWorkout({ id: 'push-day', name: 'Push Day' });
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: false
			});
			screen.render();
			await flushPromises();

			const nameInput = container.querySelector('input[value="Push Day"]');
			const descLabel = container.querySelector('label');
			expect(nameInput).not.toBeNull();
			expect(descLabel?.textContent).toContain('Workout name');
		});

		it('should show delete button for existing workouts', async () => {
			const workout = createSampleWorkout({ id: 'push-day', name: 'Push Day' });
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: false
			});
			screen.render();
			await flushPromises();

			const deleteButton = findButton(container, 'Delete');
			expect(deleteButton).not.toBeNull();
		});

		it('should save to workout repository', async () => {
			const workout = createSampleWorkout({
				id: 'push-day',
				name: 'Push Day',
				exercises: [
					{ exercise: 'Bench Press', targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 180 }
				]
			});
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: false
			});
			screen.render();
			await flushPromises();

			// Modify exercise to enable save
			const setsInput = container.querySelector('input[value="4"]') as HTMLInputElement;
			setsInput.value = '5';
			setsInput.dispatchEvent(new Event('input', { bubbles: true }));

			const saveButton = findButton(container, 'Save workout');
			expect(saveButton).not.toBeNull();
			click(saveButton!);
			await flushPromises();

			expect(ctx.workoutRepo.update).toHaveBeenCalledWith('push-day', expect.objectContaining({
				name: 'Push Day'
			}));
			expect(ctx.sessionState.updateExercises).not.toHaveBeenCalled();
		});

		it('should reorder exercises and save to workout repository', async () => {
			const workout = createSampleWorkout({
				id: 'push-day',
				name: 'Push Day',
				exercises: [
					{ exercise: 'Bench Press', targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 180 },
					{ exercise: 'Overhead Press', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 }
				]
			});
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: false
			});
			screen.render();
			await flushPromises();

			// Simulate drag and drop reorder
			const rows = container.querySelectorAll('.fit-workout-exercise-row');
			expect(rows.length).toBe(2);

			// Simulate dragstart on first row
			const firstRow = rows[0] as HTMLElement;
			firstRow.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));

			// Simulate drop on second row
			const secondRow = rows[1] as HTMLElement;
			secondRow.dispatchEvent(new DragEvent('drop', { bubbles: true }));

			// Save should be enabled after reorder
			const saveButton = findButton(container, 'Save workout');
			expect(saveButton).not.toBeNull();
			expect(saveButton?.disabled).toBe(false);

			click(saveButton!);
			await flushPromises();

			// Should save to workout repo with reordered exercises
			expect(ctx.workoutRepo.update).toHaveBeenCalledWith('push-day', expect.objectContaining({
				exercises: expect.arrayContaining([
					expect.objectContaining({ exercise: 'Overhead Press' }),
					expect.objectContaining({ exercise: 'Bench Press' })
				])
			}));
			expect(ctx.sessionState.updateExercises).not.toHaveBeenCalled();
		});
	});

	describe('session editing mode (editSession=true)', () => {
		it('should load exercises from session state', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [
					createSampleSessionExercise({ exercise: 'Bench Press', targetSets: 4 }),
					createSampleSessionExercise({ exercise: 'Overhead Press', targetSets: 3 })
				]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Should NOT load from workout repo
			expect(ctx.workoutRepo.get).not.toHaveBeenCalled();

			// Should have loaded exercises from session
			const exerciseRows = container.querySelectorAll('.fit-workout-exercise-row');
			expect(exerciseRows.length).toBe(2);
		});

		it('should hide name and description fields', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Should NOT have name/description labels
			const labels = Array.from(container.querySelectorAll('.fit-form-label'));
			const hasNameLabel = labels.some(l => l.textContent?.includes('Workout name'));
			const hasDescLabel = labels.some(l => l.textContent?.includes('Description'));
			expect(hasNameLabel).toBe(false);
			expect(hasDescLabel).toBe(false);
		});

		it('should hide delete button', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			const deleteButton = findButton(container, 'Delete');
			expect(deleteButton).toBeNull();
		});

		it('should show "Save exercises" button instead of "Save workout"', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			const saveWorkoutButton = findButton(container, 'Save workout');
			const saveExercisesButton = findButton(container, 'Save exercises');
			expect(saveWorkoutButton).toBeNull();
			expect(saveExercisesButton).not.toBeNull();
		});

		it('should save to session state, not workout repository', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [
					createSampleSessionExercise({ exercise: 'Bench Press', targetSets: 4 })
				]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Modify exercise to enable save
			const setsInput = container.querySelector('input[value="4"]') as HTMLInputElement;
			setsInput.value = '5';
			setsInput.dispatchEvent(new Event('input', { bubbles: true }));

			const saveButton = findButton(container, 'Save exercises');
			expect(saveButton).not.toBeNull();
			click(saveButton!);
			await flushPromises();

			// Should save to session state
			expect(ctx.sessionState.updateExercises).toHaveBeenCalled();
			// Should NOT save to workout repo
			expect(ctx.workoutRepo.update).not.toHaveBeenCalled();
		});

		it('should reorder exercises and save to session state only', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [
					createSampleSessionExercise({ exercise: 'Bench Press', targetSets: 4 }),
					createSampleSessionExercise({ exercise: 'Overhead Press', targetSets: 3 })
				]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Simulate drag and drop reorder
			const rows = container.querySelectorAll('.fit-workout-exercise-row');
			expect(rows.length).toBe(2);

			// Simulate dragstart on first row
			const firstRow = rows[0] as HTMLElement;
			firstRow.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));

			// Simulate drop on second row
			const secondRow = rows[1] as HTMLElement;
			secondRow.dispatchEvent(new DragEvent('drop', { bubbles: true }));

			// Save should be enabled after reorder
			const saveButton = findButton(container, 'Save exercises');
			expect(saveButton).not.toBeNull();
			expect(saveButton?.disabled).toBe(false);

			click(saveButton!);
			await flushPromises();

			// Should save to session state with reordered exercises
			expect(ctx.sessionState.updateExercises).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ exercise: 'Overhead Press' }),
					expect.objectContaining({ exercise: 'Bench Press' })
				])
			);
			// Should NOT save to workout repo
			expect(ctx.workoutRepo.update).not.toHaveBeenCalled();
		});

		it('should preserve logged sets when saving session exercises', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [
					createSampleSessionExercise({
						exercise: 'Bench Press',
						targetSets: 4,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' },
							{ weight: 80, reps: 7, completed: true, timestamp: '2025-01-01T10:10:00Z' }
						]
					})
				]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Modify exercise to enable save
			const setsInput = container.querySelector('input[value="4"]') as HTMLInputElement;
			setsInput.value = '5';
			setsInput.dispatchEvent(new Event('input', { bubbles: true }));

			const saveButton = findButton(container, 'Save exercises');
			click(saveButton!);
			await flushPromises();

			// Should preserve the logged sets
			expect(ctx.sessionState.updateExercises).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						exercise: 'Bench Press',
						targetSets: 5,
						sets: expect.arrayContaining([
							expect.objectContaining({ weight: 80, reps: 8 }),
							expect.objectContaining({ weight: 80, reps: 7 })
						])
					})
				])
			);
		});
	});

	describe('header', () => {
		it('should show workout name in header when in session edit mode', async () => {
			// Note: screen-header prioritizes session.workout over fallbackWorkoutName
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Header shows the workout name from active session
			const header = container.querySelector('.fit-program-workout-name');
			expect(header?.textContent).toBe('Push Day');
		});

		it('should show "Edit workout" header in template edit mode (no active session)', async () => {
			const workout = createSampleWorkout({ id: 'push-day', name: 'Push Day' });
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new WorkoutEditorScreen(container, ctx, {
				workoutId: 'push-day',
				isNew: false,
				editSession: false
			});
			screen.render();
			await flushPromises();

			// No active session, so fallback is used
			const header = container.querySelector('.fit-program-workout-name');
			expect(header?.textContent).toBe('Edit workout');
		});

		it('should show "New workout" header when creating new workout', () => {
			const ctx = createMockScreenContext();
			const screen = new WorkoutEditorScreen(container, ctx, {
				isNew: true
			});
			screen.render();

			const header = container.querySelector('.fit-program-workout-name');
			expect(header?.textContent).toBe('New workout');
		});
	});
});
