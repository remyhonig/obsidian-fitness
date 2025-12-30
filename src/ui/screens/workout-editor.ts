import { Notice, setIcon } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Workout, WorkoutExercise } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton } from '../components/button';
import { createExerciseAutocomplete } from '../components/autocomplete';

/**
 * Workout editor screen - create/edit workouts or session exercises
 *
 * Modes:
 * - isNew=true: Create a new workout template
 * - isNew=false, editSession=false: Edit an existing workout template
 * - isNew=false, editSession=true: Edit session exercises only (doesn't modify template)
 */
export class WorkoutEditorScreen extends BaseScreen {
	private isNew: boolean;
	private workoutId: string | null;
	private workout: Workout | null = null;
	private editSession: boolean;

	// Form state
	private name = '';
	private description = '';
	private exercises: WorkoutExercise[] = [];

	// Original state for change detection
	private originalName = '';
	private originalDescription = '';
	private originalExercises: WorkoutExercise[] = [];

	// Save button reference
	private saveBtn: HTMLButtonElement | null = null;

	// Drag state
	private draggedIndex: number | null = null;

	// File watcher cleanup
	private unsubscribeFileWatch: (() => void) | null = null;

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-workout-editor-screen');
		this.isNew = params.isNew ?? true;
		this.workoutId = params.workoutId ?? null;
		this.editSession = params.editSession ?? false;

		// Subscribe to file changes when editing an existing workout template (not session)
		if (!this.isNew && this.workoutId && !this.editSession) {
			const workoutPath = `${ctx.settings.basePath}/Workouts/${this.workoutId}.md`;
			this.unsubscribeFileWatch = ctx.watchFile(workoutPath, () => {
				void this.reloadWorkout();
			});
		}
	}

	/**
	 * Reloads workout data from file and re-renders
	 */
	private async reloadWorkout(): Promise<void> {
		if (!this.workoutId) return;

		const workout = await this.ctx.workoutRepo.get(this.workoutId);
		if (workout) {
			this.workout = workout;
			this.name = workout.name;
			this.description = workout.description ?? '';
			this.exercises = workout.exercises.map(e => ({ ...e }));

			// Update original state
			this.originalName = workout.name;
			this.originalDescription = workout.description ?? '';
			this.originalExercises = workout.exercises.map(e => ({ ...e }));

			// Re-render the form
			this.renderForm();
		}
	}

	render(): void {
		this.prepareRender();

		if (this.editSession) {
			// Session edit mode - load from session state
			this.loadFromSession();
			this.renderForm();
		} else if (!this.isNew && this.workoutId) {
			// Edit existing workout template
			void this.loadWorkout().then(() => {
				this.renderForm();
			});
		} else {
			// New workout - render empty form immediately
			this.renderForm();
		}
	}

	/**
	 * Loads exercise data from current session state
	 */
	private loadFromSession(): void {
		const session = this.ctx.sessionState.getSession();
		if (!session) return;

		this.name = session.workout ?? 'Workout';
		this.description = '';
		this.exercises = session.exercises.map(se => ({
			exercise: se.exercise,
			targetSets: se.targetSets,
			targetRepsMin: se.targetRepsMin,
			targetRepsMax: se.targetRepsMax,
			restSeconds: se.restSeconds
		}));

		// Store original state for change detection
		this.originalName = this.name;
		this.originalDescription = '';
		this.originalExercises = this.exercises.map(e => ({ ...e }));
	}

	private async loadWorkout(): Promise<void> {
		if (!this.workoutId) return;

		// Try by ID first, then fall back to name lookup
		let workout = await this.ctx.workoutRepo.get(this.workoutId);
		if (!workout) {
			// workoutId might be a slugified name, try looking up by name
			workout = await this.ctx.workoutRepo.getByName(this.workoutId);
		}

		if (workout) {
			this.workout = workout;
			this.workoutId = workout.id; // Update to actual ID for saving
			this.name = workout.name;
			this.description = workout.description ?? '';
			this.exercises = workout.exercises.map(e => ({ ...e }));

			// Store original state for change detection
			this.originalName = workout.name;
			this.originalDescription = workout.description ?? '';
			this.originalExercises = workout.exercises.map(e => ({ ...e }));
		}
	}

	private renderForm(): void {
		// Clear and re-render content area (not header)
		const existingForm = this.containerEl.querySelector('.fit-form');
		const existingActions = this.containerEl.querySelector('.fit-bottom-actions');
		existingForm?.remove();
		existingActions?.remove();

		// Determine header title based on mode
		let headerTitle: string;
		if (this.editSession) {
			headerTitle = 'Edit exercises';
		} else if (this.isNew) {
			headerTitle = 'New workout';
		} else {
			headerTitle = 'Edit workout';
		}

		// Header (only render if not already present)
		if (!this.containerEl.querySelector('.fit-section')) {
			this.headerRefs = createScreenHeader(this.containerEl, {
				leftElement: 'back',
				fallbackWorkoutName: headerTitle,
				view: this.ctx.view,
				sessionState: this.ctx.sessionState,
				onBack: () => this.ctx.view.goBack()
			});
		}

		// Form
		const form = this.containerEl.createDiv({ cls: 'fit-form' });

		// Name and description inputs - only show for workout template editing (not session)
		if (!this.editSession) {
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
				this.updateSaveButton();
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
				this.updateSaveButton();
			});
		}

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

		// Delete button - only show for existing workout templates (not new or session edit)
		if (!this.isNew && !this.editSession) {
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

		// Save button (disabled when no changes for existing workouts)
		const saveButtonText = this.editSession ? 'Save exercises' : 'Save workout';
		this.saveBtn = actions.createEl('button', {
			cls: 'fit-button fit-button-primary fit-button-full fit-button-large',
			text: saveButtonText
		});
		this.saveBtn.addEventListener('click', () => {
			this.saveWorkout().catch((err: unknown) => {
				console.error('Unhandled error in saveWorkout:', err);
				new Notice('An unexpected error occurred while saving');
			});
		});

		// Update save button state
		this.updateSaveButton();
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

		const row = container.createDiv({
			cls: 'fit-workout-exercise-row',
			attr: { draggable: 'true', 'data-index': String(index) }
		});

		// Drag handle
		const dragHandle = row.createDiv({ cls: 'fit-drag-handle' });
		setIcon(dragHandle, 'grip-vertical');

		// Drag events
		row.addEventListener('dragstart', (e) => {
			this.draggedIndex = index;
			row.addClass('fit-dragging');
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
			}
		});

		row.addEventListener('dragend', () => {
			this.draggedIndex = null;
			row.removeClass('fit-dragging');
			// Remove all drag-over classes
			container.querySelectorAll('.fit-drag-over').forEach(el => el.removeClass('fit-drag-over'));
		});

		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (this.draggedIndex === null || this.draggedIndex === index) return;
			row.addClass('fit-drag-over');
		});

		row.addEventListener('dragleave', () => {
			row.removeClass('fit-drag-over');
		});

		row.addEventListener('drop', (e) => {
			e.preventDefault();
			row.removeClass('fit-drag-over');
			if (this.draggedIndex === null || this.draggedIndex === index) return;

			// Reorder exercises
			const draggedExercise = this.exercises[this.draggedIndex];
			if (!draggedExercise) return;
			this.exercises.splice(this.draggedIndex, 1);
			this.exercises.splice(index, 0, draggedExercise);

			// Re-render and update save button
			this.renderExerciseList(container);
			this.updateSaveButton();
		});

		// Exercise name with autocomplete
		createExerciseAutocomplete(row, {
			placeholder: 'Exercise name',
			value: exercise.exercise,
			getItems: () => this.ctx.exerciseRepo.list(),
			onSelect: (selectedExercise, text) => {
				const ex = this.exercises[index];
				if (ex) {
					if (selectedExercise) {
						// Selected from dropdown - use proper name, id, and source
						ex.exercise = selectedExercise.name;
						ex.exerciseId = selectedExercise.id;
						ex.source = selectedExercise.source;
					} else {
						// Free text entry
						ex.exercise = text;
						ex.exerciseId = undefined;
						ex.source = undefined;
					}
				}
				this.updateSaveButton();
			},
			onChange: (text) => {
				const ex = this.exercises[index];
				if (ex) ex.exercise = text;
				this.updateSaveButton();
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
			this.updateSaveButton();
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
			this.updateSaveButton();
		});
		maxInput.addEventListener('input', (e) => {
			const ex = this.exercises[index];
			if (ex) ex.targetRepsMax = parseInt((e.target as HTMLInputElement).value) || 12;
			this.updateSaveButton();
		});

		// Rest input
		const restGroup = row.createDiv({ cls: 'fit-inline-group' });
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		restGroup.createEl('label', { text: 'rest' });
		const restInput = restGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '0', max: '600', value: String(exercise.restSeconds) }
		});
		restInput.addEventListener('input', (e) => {
			const ex = this.exercises[index];
			if (ex) ex.restSeconds = parseInt((e.target as HTMLInputElement).value) || 120;
			this.updateSaveButton();
		});

		// Delete button
		const deleteBtn = row.createEl('button', {
			cls: 'fit-button fit-button-ghost fit-exercise-delete',
			attr: { 'aria-label': 'Remove exercise' }
		});
		setIcon(deleteBtn, 'trash-2');
		deleteBtn.addEventListener('click', () => {
			this.exercises.splice(index, 1);
			this.renderExerciseList(container);
			this.updateSaveButton();
		});
	}

	private addExercise(): void {
		// Add a blank exercise
		this.exercises.push({
			exercise: '',
			targetSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 12,
			restSeconds: this.ctx.settings.defaultRestSeconds
		});

		// Re-render
		const list = this.containerEl.querySelector('.fit-workout-exercise-list');
		if (list) {
			this.renderExerciseList(list as HTMLElement);
		}
		this.updateSaveButton();
	}

	/**
	 * Checks if the current form state differs from the original
	 */
	private hasChanges(): boolean {
		// For new workouts, always allow save if there's a name
		if (this.isNew) {
			return this.name.trim().length > 0;
		}

		// For session edit mode, only check exercises
		if (this.editSession) {
			return this.exercisesChanged();
		}

		// Check name
		if (this.name !== this.originalName) return true;

		// Check description
		if (this.description !== this.originalDescription) return true;

		return this.exercisesChanged();
	}

	/**
	 * Checks if exercises have changed from original
	 */
	private exercisesChanged(): boolean {
		// Check exercises count
		if (this.exercises.length !== this.originalExercises.length) return true;

		// Check each exercise
		for (let i = 0; i < this.exercises.length; i++) {
			const current = this.exercises[i];
			const original = this.originalExercises[i];
			if (!current || !original) return true;

			if (current.exercise !== original.exercise) return true;
			if (current.targetSets !== original.targetSets) return true;
			if (current.targetRepsMin !== original.targetRepsMin) return true;
			if (current.targetRepsMax !== original.targetRepsMax) return true;
			if (current.restSeconds !== original.restSeconds) return true;
		}

		return false;
	}

	/**
	 * Updates the save button enabled/disabled state
	 */
	private updateSaveButton(): void {
		if (!this.saveBtn) return;

		const canSave = this.hasChanges();
		this.saveBtn.disabled = !canSave;
		this.saveBtn.classList.toggle('fit-button-disabled', !canSave);
	}

	private async saveWorkout(): Promise<void> {
		// Filter out empty exercises
		const validExercises = this.exercises.filter(e => e.exercise.trim());

		try {
			if (this.editSession) {
				// Session edit mode - update session exercises only
				this.saveToSession(validExercises);
				new Notice('Exercises updated');
				this.ctx.view.goBack();
				return;
			}

			// Validate name for workout template
			if (!this.name.trim()) {
				new Notice('Please enter a workout name');
				return;
			}

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

			this.ctx.view.goBack();
		} catch (error) {
			console.error('Failed to save workout:', error);
			new Notice(`Failed to save workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Saves exercises to the current session state
	 * Preserves logged sets while updating exercise definitions
	 */
	private saveToSession(exercises: WorkoutExercise[]): void {
		const session = this.ctx.sessionState.getSession();
		if (!session) return;

		// Build a map of existing exercises to preserve logged sets
		const existingSets = new Map<string, typeof session.exercises[0]['sets']>();
		const existingRpe = new Map<string, number | undefined>();
		const existingEngagement = new Map<string, typeof session.exercises[0]['muscleEngagement']>();

		for (const ex of session.exercises) {
			existingSets.set(ex.exercise.toLowerCase(), ex.sets);
			existingRpe.set(ex.exercise.toLowerCase(), ex.rpe);
			existingEngagement.set(ex.exercise.toLowerCase(), ex.muscleEngagement);
		}

		// Convert workout exercises to session exercises, preserving logged data
		const sessionExercises = exercises.map(we => {
			const key = we.exercise.toLowerCase();
			return {
				exercise: we.exercise,
				targetSets: we.targetSets,
				targetRepsMin: we.targetRepsMin,
				targetRepsMax: we.targetRepsMax,
				restSeconds: we.restSeconds,
				sets: existingSets.get(key) ?? [],
				rpe: existingRpe.get(key),
				muscleEngagement: existingEngagement.get(key)
			};
		});

		// Update session state
		this.ctx.sessionState.updateExercises(sessionExercises);
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
		// Clean up file watcher
		this.unsubscribeFileWatch?.();
		this.unsubscribeFileWatch = null;
		super.destroy();
	}
}
