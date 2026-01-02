import { describe, it, expect, beforeEach } from 'vitest';
import { WorkoutEditorScreen } from './workout-editor';
import {
	createMockScreenContext,
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
		it('should show not supported message', async () => {
			const ctx = createMockScreenContext();
			const screen = new WorkoutEditorScreen(container, ctx, {
				editSession: false
			});
			screen.render();
			await flushPromises();

			// Should show message about editing program files directly
			const message = container.querySelector('.fit-empty-message');
			expect(message?.textContent).toContain('Workout templates are defined inline within program files');
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
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Should have loaded exercises from session
			const exerciseRows = container.querySelectorAll('.fit-workout-exercise-row');
			expect(exerciseRows.length).toBe(2);
		});

		it('should show exercises with details', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({
					exercise: 'Bench Press',
					targetSets: 4,
					targetRepsMin: 6,
					targetRepsMax: 8,
					restSeconds: 180
				})]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Should have exercise name and details
			const exerciseName = container.querySelector('.fit-workout-exercise-name');
			expect(exerciseName?.textContent).toBe('Bench Press');

			const exerciseDetails = container.querySelector('.fit-workout-exercise-details');
			expect(exerciseDetails?.textContent).toContain('4 sets');
			expect(exerciseDetails?.textContent).toContain('6-8 reps');
		});

		it('should show save button', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				editSession: true
			});
			screen.render();
			await flushPromises();

			const saveButton = findButton(container, 'Save changes');
			expect(saveButton).not.toBeNull();
		});

		it('should save to session state', async () => {
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
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Delete an exercise to enable save button
			const deleteBtn = container.querySelector('.fit-workout-exercise-delete');
			click(deleteBtn as HTMLElement);
			await flushPromises();

			const saveButton = findButton(container, 'Save changes');
			expect(saveButton).not.toBeNull();
			click(saveButton!);
			await flushPromises();

			// Should save to session state
			expect(ctx.sessionState.updateExercises).toHaveBeenCalled();
		});

		it('should reorder exercises via drag and drop', async () => {
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
			const saveButton = findButton(container, 'Save changes');
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
					}),
					createSampleSessionExercise({ exercise: 'Overhead Press', targetSets: 3 })
				]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new WorkoutEditorScreen(container, ctx, {
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Delete an exercise to enable save button
			const deleteBtn = container.querySelectorAll('.fit-workout-exercise-delete')[1]; // Delete second exercise
			click(deleteBtn as HTMLElement);
			await flushPromises();

			const saveButton = findButton(container, 'Save changes');
			click(saveButton!);
			await flushPromises();

			// Should preserve the logged sets for remaining exercise
			expect(ctx.sessionState.updateExercises).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						exercise: 'Bench Press',
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
				editSession: true
			});
			screen.render();
			await flushPromises();

			// Header shows the workout name from active session
			const header = container.querySelector('.fit-program-workout-name');
			expect(header?.textContent).toBe('Push Day');
		});

		it('should show fallback header in template edit mode', async () => {
			const ctx = createMockScreenContext();
			const screen = new WorkoutEditorScreen(container, ctx, {
				editSession: false
			});
			screen.render();
			await flushPromises();

			// No active session, so fallback is used
			const header = container.querySelector('.fit-program-workout-name');
			expect(header?.textContent).toBe('Edit Workout');
		});
	});
});
