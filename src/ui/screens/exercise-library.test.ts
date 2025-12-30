import { describe, it, expect, beforeEach } from 'vitest';
import { ExerciseLibraryScreen } from './exercise-library';
import {
	createMockScreenContext,
	createSampleExercise,
	flushPromises,
	click,
	changeInput,
	findButton
} from '../../test/mocks';

describe('ExerciseLibraryScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering - list view', () => {
		it('should render header with "Exercises" title', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const title = container.querySelector('.fit-program-workout-name');
			expect(title?.textContent).toBe('Exercises');
		});

		it('should render back button', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const backButton = container.querySelector('.fit-back-button');
			expect(backButton).not.toBeNull();
		});

		it('should render search input', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			expect(searchInput).not.toBeNull();
			expect(searchInput.placeholder).toBe('Search exercises...');
		});

		it('should render exercise rows', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' }),
				createSampleExercise({ id: 'squat', name: 'Squat' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const exerciseRows = container.querySelectorAll('.fit-library-exercise-row');
			expect(exerciseRows.length).toBe(2);
		});

		it('should show empty state when no exercises', async () => {
			const ctx = createMockScreenContext({ exercises: [] });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState?.textContent).toContain('No exercises yet');
		});

		it('should render "Add exercise" button', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const button = findButton(container, 'Add exercise');
			expect(button).not.toBeNull();
		});

		it('should display exercise category', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press', category: 'Chest' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const exerciseRow = container.querySelector('.fit-library-exercise-row');
			expect(exerciseRow?.textContent).toContain('Chest');
		});

		it('should display exercise equipment', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press', equipment: 'Barbell' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const exerciseRow = container.querySelector('.fit-library-exercise-row');
			expect(exerciseRow?.textContent).toContain('Barbell');
		});

		it('should render edit button for each exercise', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const editButton = findButton(container, 'Edit');
			expect(editButton).not.toBeNull();
		});
	});

	describe('search', () => {
		it('should filter exercises by name', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' }),
				createSampleExercise({ id: 'squat', name: 'Squat' }),
				createSampleExercise({ id: 'deadlift', name: 'Deadlift' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'bench');

			const exerciseRows = container.querySelectorAll('.fit-library-exercise-row');
			expect(exerciseRows.length).toBe(1);
		});

		it('should filter exercises by category', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press', category: 'Chest' }),
				createSampleExercise({ id: 'squat', name: 'Squat', category: 'Legs' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'legs');

			const exerciseRows = container.querySelectorAll('.fit-library-exercise-row');
			expect(exerciseRows.length).toBe(1);
		});

		it('should filter exercises by equipment', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press', equipment: 'Barbell' }),
				createSampleExercise({ id: 'flyes', name: 'Chest Flyes', equipment: 'Dumbbells' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'dumbbell');

			const exerciseRows = container.querySelectorAll('.fit-library-exercise-row');
			expect(exerciseRows.length).toBe(1);
		});

		it('should filter exercises by muscle group', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press', muscleGroups: ['Chest', 'Triceps'] }),
				createSampleExercise({ id: 'curl', name: 'Bicep Curl', muscleGroups: ['Biceps'] })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'triceps');

			const exerciseRows = container.querySelectorAll('.fit-library-exercise-row');
			expect(exerciseRows.length).toBe(1);
		});

		it('should show no results message', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'nonexistent');

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState?.textContent).toBe('No exercises found');
		});
	});

	describe('edit mode - new exercise', () => {
		it('should switch to edit mode when "Add exercise" is clicked', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const button = findButton(container, 'Add exercise');
			click(button!);
			await flushPromises();

			const title = container.querySelector('.fit-program-workout-name');
			expect(title?.textContent).toBe('New exercise');
		});

		it('should render form fields', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const button = findButton(container, 'Add exercise');
			click(button!);
			await flushPromises();

			const labels = container.querySelectorAll('.fit-form-label');
			const labelTexts = Array.from(labels).map(l => l.textContent);

			expect(labelTexts).toContain('Exercise name');
			expect(labelTexts).toContain('Category');
			expect(labelTexts).toContain('Equipment');
			expect(labelTexts).toContain('Muscle groups (comma-separated)');
		});

		it('should render "Save exercise" button', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const addButton = findButton(container, 'Add exercise');
			click(addButton!);
			await flushPromises();

			const saveButton = findButton(container, 'Save exercise');
			expect(saveButton).not.toBeNull();
		});

		it('should NOT render "Delete" button for new exercise', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const addButton = findButton(container, 'Add exercise');
			click(addButton!);
			await flushPromises();

			const deleteButton = findButton(container, 'Delete');
			expect(deleteButton).toBeNull();
		});

		it('should create exercise when save is clicked', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const addButton = findButton(container, 'Add exercise');
			click(addButton!);
			await flushPromises();

			// Fill in the name
			const nameInput = container.querySelector('input[placeholder="Barbell squat"]') as HTMLInputElement;
			changeInput(nameInput, 'New Exercise');

			const saveButton = findButton(container, 'Save exercise');
			click(saveButton!);
			await flushPromises();

			expect(ctx.exerciseRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'New Exercise' })
			);
		});

		it('should not create exercise with empty name', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const addButton = findButton(container, 'Add exercise');
			click(addButton!);
			await flushPromises();

			const saveButton = findButton(container, 'Save exercise');
			click(saveButton!);
			await flushPromises();

			expect(ctx.exerciseRepo.create).not.toHaveBeenCalled();
		});
	});

	describe('edit mode - existing exercise', () => {
		it('should switch to edit mode when "Edit" is clicked', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const editButton = findButton(container, 'Edit');
			click(editButton!);
			await flushPromises();

			const title = container.querySelector('.fit-program-workout-name');
			expect(title?.textContent).toBe('Edit exercise');
		});

		it('should render "Delete" button for existing exercise', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const editButton = findButton(container, 'Edit');
			click(editButton!);
			await flushPromises();

			const deleteButton = findButton(container, 'Delete');
			expect(deleteButton).not.toBeNull();
		});

		it('should populate form with exercise data', async () => {
			const exercises = [
				createSampleExercise({
					id: 'bench',
					name: 'Bench Press',
					category: 'Chest',
					equipment: 'Barbell'
				})
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const editButton = findButton(container, 'Edit');
			click(editButton!);
			await flushPromises();

			const nameInput = container.querySelector('input[placeholder="Barbell squat"]') as HTMLInputElement;
			expect(nameInput.value).toBe('Bench Press');

			const categoryInput = container.querySelector('input[placeholder="Legs"]') as HTMLInputElement;
			expect(categoryInput.value).toBe('Chest');
		});

		it('should update exercise when save is clicked', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const editButton = findButton(container, 'Edit');
			click(editButton!);
			await flushPromises();

			const nameInput = container.querySelector('input[placeholder="Barbell squat"]') as HTMLInputElement;
			changeInput(nameInput, 'Updated Bench Press');

			const saveButton = findButton(container, 'Save exercise');
			click(saveButton!);
			await flushPromises();

			expect(ctx.exerciseRepo.update).toHaveBeenCalledWith(
				'bench',
				expect.objectContaining({ name: 'Updated Bench Press' })
			);
		});

		it('should delete exercise when delete is clicked', async () => {
			const exercises = [
				createSampleExercise({ id: 'bench', name: 'Bench Press' })
			];
			const ctx = createMockScreenContext({ exercises });
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const editButton = findButton(container, 'Edit');
			click(editButton!);
			await flushPromises();

			const deleteButton = findButton(container, 'Delete');
			click(deleteButton!);
			await flushPromises();

			expect(ctx.exerciseRepo.delete).toHaveBeenCalledWith('bench');
		});
	});

	describe('navigation', () => {
		it('should go back when back button is clicked in list view', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const backButton = container.querySelector('.fit-back-button') as HTMLElement;
			click(backButton);

			expect(ctx.view.goBack).toHaveBeenCalled();
		});

		it('should return to list view when back button is clicked in edit mode', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			// Enter edit mode
			const addButton = findButton(container, 'Add exercise');
			click(addButton!);
			await flushPromises();

			expect(container.querySelector('.fit-program-workout-name')?.textContent).toBe('New exercise');

			// Click back
			const backButton = container.querySelector('.fit-back-button') as HTMLElement;
			click(backButton);

			expect(container.querySelector('.fit-program-workout-name')?.textContent).toBe('Exercises');
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', async () => {
			const ctx = createMockScreenContext();
			const screen = new ExerciseLibraryScreen(container, ctx);
			screen.render();
			await flushPromises();

			expect(container.querySelector('.fit-exercise-library-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-exercise-library-screen')).toBeNull();
		});
	});
});
