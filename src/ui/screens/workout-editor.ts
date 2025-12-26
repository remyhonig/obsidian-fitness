import { Notice } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Workout, WorkoutExercise } from '../../types';
import { createBackButton, createButton, createPrimaryAction } from '../components/button';
import { createExerciseAutocomplete } from '../components/autocomplete';

/**
 * Workout editor screen - create/edit workouts
 */
export class WorkoutEditorScreen implements Screen {
	private containerEl: HTMLElement;
	private isNew: boolean;
	private workoutId: string | null;
	private workout: Workout | null = null;

	// Form state
	private name = '';
	private description = '';
	private exercises: WorkoutExercise[] = [];

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext,
		params: ScreenParams
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-workout-editor-screen' });
		this.isNew = params.isNew ?? true;
		this.workoutId = params.workoutId ?? null;
	}

	render(): void {
		this.containerEl.empty();

		// Load existing workout if editing
		if (!this.isNew && this.workoutId) {
			void this.ctx.workoutRepo.get(this.workoutId).then(workout => {
				if (workout) {
					this.workout = workout;
					this.name = workout.name;
					this.description = workout.description ?? '';
					this.exercises = [...workout.exercises];
					// Re-render the form with loaded data
					this.renderForm();
				}
			});
		}

		this.renderForm();
	}

	private renderForm(): void {
		// Clear and re-render content area (not header)
		const existingForm = this.containerEl.querySelector('.fit-form');
		const existingActions = this.containerEl.querySelector('.fit-bottom-actions');
		existingForm?.remove();
		existingActions?.remove();

		// Header (only render if not already present)
		if (!this.containerEl.querySelector('.fit-header')) {
			const header = this.containerEl.createDiv({ cls: 'fit-header' });
			createBackButton(header, () => this.ctx.view.goBack());
			header.createEl('h1', {
				text: this.isNew ? 'New workout' : 'Edit workout',
				cls: 'fit-title'
			});
		}

		// Form
		const form = this.containerEl.createDiv({ cls: 'fit-form' });

		// Name input
		const nameGroup = form.createDiv({ cls: 'fit-form-group' });
		nameGroup.createEl('label', { text: 'Workout name', cls: 'fit-form-label' });
		const nameInput = nameGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: {
				type: 'text',
				placeholder: 'Push day',
				value: this.name
			}
		});
		nameInput.addEventListener('input', (e) => {
			this.name = (e.target as HTMLInputElement).value;
		});

		// Description input
		const descGroup = form.createDiv({ cls: 'fit-form-group' });
		descGroup.createEl('label', { text: 'Description (optional)', cls: 'fit-form-label' });
		const descInput = descGroup.createEl('textarea', {
			cls: 'fit-form-textarea',
			attr: {
				placeholder: 'Describe this workout...',
				rows: '2'
			}
		});
		descInput.value = this.description;
		descInput.addEventListener('input', (e) => {
			this.description = (e.target as HTMLTextAreaElement).value;
		});

		// Exercises section
		const exercisesSection = form.createDiv({ cls: 'fit-form-section' });
		exercisesSection.createEl('h2', { text: 'Exercises', cls: 'fit-section-title' });

		const exerciseList = exercisesSection.createDiv({ cls: 'fit-workout-exercise-list' });
		this.renderExerciseList(exerciseList);

		// Add exercise button
		createButton(exercisesSection, {
			text: 'Add exercise',
			variant: 'secondary',
			fullWidth: true,
			onClick: () => { this.addExercise(); }
		});

		// Actions
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });

		if (!this.isNew) {
			createButton(actions, {
				text: 'Delete',
				variant: 'danger',
				onClick: () => {
					this.deleteWorkout().catch((err: unknown) => {
						console.error('Unhandled error in deleteWorkout:', err);
					});
				}
			});
		}

		createPrimaryAction(actions, 'Save workout', () => {
			this.saveWorkout().catch((err: unknown) => {
				console.error('Unhandled error in saveWorkout:', err);
				new Notice('An unexpected error occurred while saving');
			});
		});
	}

	private renderExerciseList(container: HTMLElement): void {
		container.empty();

		if (this.exercises.length === 0) {
			container.createDiv({
				cls: 'fit-empty-state',
				text: 'No exercises added yet'
			});
			return;
		}

		for (let i = 0; i < this.exercises.length; i++) {
			this.renderExerciseRow(container, i);
		}
	}

	private renderExerciseRow(container: HTMLElement, index: number): void {
		const exercise = this.exercises[index];
		if (!exercise) return;

		const row = container.createDiv({ cls: 'fit-workout-exercise-row' });

		// Exercise name with autocomplete
		createExerciseAutocomplete(row, {
			placeholder: 'Exercise name',
			value: exercise.exercise,
			getItems: () => this.ctx.exerciseRepo.list(),
			onSelect: (selectedExercise, text) => {
				const ex = this.exercises[index];
				if (ex) {
					ex.exercise = text;
					// If an exercise was selected from library, apply its defaults
					if (selectedExercise?.defaultWeight) {
						// Could populate default weight here if needed
					}
				}
			},
			onChange: (text) => {
				const ex = this.exercises[index];
				if (ex) ex.exercise = text;
			}
		});

		// Sets input
		const setsGroup = row.createDiv({ cls: 'fit-inline-group' });
		setsGroup.createEl('label', { text: 'Sets' });
		const setsInput = setsGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '1', max: '10', value: String(exercise.targetSets) }
		});
		setsInput.addEventListener('input', (e) => {
			const ex = this.exercises[index];
			if (ex) ex.targetSets = parseInt((e.target as HTMLInputElement).value) || 3;
		});

		// Reps range inputs
		const repsGroup = row.createDiv({ cls: 'fit-inline-group' });
		repsGroup.createEl('label', { text: 'Reps' });
		const minInput = repsGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '1', max: '50', value: String(exercise.targetRepsMin) }
		});
		repsGroup.createSpan({ text: '-' });
		const maxInput = repsGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '1', max: '50', value: String(exercise.targetRepsMax) }
		});
		minInput.addEventListener('input', (e) => {
			const ex = this.exercises[index];
			if (ex) ex.targetRepsMin = parseInt((e.target as HTMLInputElement).value) || 8;
		});
		maxInput.addEventListener('input', (e) => {
			const ex = this.exercises[index];
			if (ex) ex.targetRepsMax = parseInt((e.target as HTMLInputElement).value) || 12;
		});

		// Rest input
		const restGroup = row.createDiv({ cls: 'fit-inline-group' });
		restGroup.createEl('label', { text: 'Seconds' });
		const restInput = restGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '0', max: '600', value: String(exercise.restSeconds) }
		});
		restInput.addEventListener('input', (e) => {
			const ex = this.exercises[index];
			if (ex) ex.restSeconds = parseInt((e.target as HTMLInputElement).value) || 120;
		});

		// Delete button
		const deleteBtn = row.createEl('button', {
			cls: 'fit-button fit-button-ghost fit-exercise-delete',
			text: '×',
			attr: { 'aria-label': 'Remove exercise' }
		});
		deleteBtn.addEventListener('click', () => {
			this.exercises.splice(index, 1);
			const parentList = container.parentElement?.querySelector('.fit-workout-exercise-list');
			if (parentList) this.renderExerciseList(parentList as HTMLElement);
		});
	}

	private addExercise(): void {
		// Add a blank exercise
		this.exercises.push({
			exercise: '',
			targetSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 12,
			restSeconds: this.ctx.plugin.settings.defaultRestSeconds
		});

		// Re-render
		const list = this.containerEl.querySelector('.fit-workout-exercise-list');
		if (list) {
			this.renderExerciseList(list as HTMLElement);
		}
	}

	private async saveWorkout(): Promise<void> {
		// Validate
		if (!this.name.trim()) {
			new Notice('Please enter a workout name');
			return;
		}

		// Filter out empty exercises
		const validExercises = this.exercises.filter(e => e.exercise.trim());

		try {
			if (this.isNew) {
				await this.ctx.workoutRepo.create({
					name: this.name.trim(),
					description: this.description.trim() || undefined,
					exercises: validExercises
				});
				new Notice(`Workout "${this.name}" created`);
			} else if (this.workoutId) {
				await this.ctx.workoutRepo.update(this.workoutId, {
					name: this.name.trim(),
					description: this.description.trim() || undefined,
					exercises: validExercises
				});
				new Notice(`Workout "${this.name}" updated`);
			} else {
				// Invalid state: not new and no workout ID
				new Notice('Unable to save: invalid workout state');
				console.error('saveWorkout called with isNew=false and no workoutId');
				return;
			}

			this.ctx.view.navigateTo('home');
		} catch (error) {
			console.error('Failed to save workout:', error);
			new Notice(`Failed to save workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private async deleteWorkout(): Promise<void> {
		if (!this.workoutId) return;

		try {
			await this.ctx.workoutRepo.delete(this.workoutId);
			new Notice('Workout deleted');
			this.ctx.view.navigateTo('home');
		} catch (error) {
			console.error('Failed to delete workout:', error);
			new Notice(`Failed to delete workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
