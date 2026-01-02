import { Notice, setIcon } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams, WorkoutExercise, Exercise } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton } from '../components/button';
import { createExerciseAutocomplete } from '../components/autocomplete';

/**
 * Workout editor screen - edit session exercises
 *
 * Modes:
 * - editSession=true: Edit session exercises only (doesn't modify program)
 * - editSession=false/undefined: Not supported (edit program files directly)
 */
export class WorkoutEditorScreen extends BaseScreen {
	private editSession: boolean;

	// Form state
	private exercises: WorkoutExercise[] = [];

	// Original state for change detection
	private originalExercises: WorkoutExercise[] = [];

	// Save button reference
	private saveBtn: HTMLButtonElement | null = null;

	// Drag state
	private draggedIndex: number | null = null;

	// Exercise lookup map for images
	private exerciseMap = new Map<string, Exercise>();

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-workout-editor-screen');
		this.editSession = params.editSession ?? false;
	}

	render(): void {
		this.prepareRender();

		if (this.editSession) {
			// Session edit mode - load from session state
			this.loadFromSession();
			this.renderForm();
		} else {
			// Editing program workouts not supported through UI
			this.renderNotSupported();
		}
	}

	private renderNotSupported(): void {
		// Header
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			fallbackWorkoutName: 'Edit Workout',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: () => this.ctx.view.goBack()
		});

		const content = this.containerEl.createDiv({ cls: 'fit-content' });
		const message = content.createDiv({ cls: 'fit-empty-message' });
		message.createEl('p', { text: 'Workout templates are defined inline within program files.' });
		message.createEl('p', { text: 'To edit a workout, open the program file in your vault and modify the workout section directly.' });
	}

	private loadFromSession(): void {
		const session = this.ctx.sessionState.getSession();
		if (session) {
			this.exercises = session.exercises.map(e => ({
				exercise: e.exercise,
				targetSets: e.targetSets,
				targetRepsMin: e.targetRepsMin,
				targetRepsMax: e.targetRepsMax,
				restSeconds: e.restSeconds
			}));
			this.originalExercises = this.exercises.map(e => ({ ...e }));
		}
	}

	private renderForm(): void {
		// Clear and re-render (preserve container)
		this.containerEl.empty();

		// Header
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			fallbackWorkoutName: 'Edit Session',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: () => this.ctx.view.goBack()
		});

		// Content
		const content = this.containerEl.createDiv({ cls: 'fit-content' });

		// Exercises section
		const exercisesSection = content.createDiv({ cls: 'fit-workout-editor-exercises' });
		this.renderExerciseList(exercisesSection);

		// Add exercise button
		const addExerciseBtn = content.createDiv({ cls: 'fit-add-exercise-btn' });
		createButton(addExerciseBtn, {
			text: 'Add exercise',
			variant: 'secondary',
			icon: 'plus',
			fullWidth: true,
			onClick: () => this.showExerciseAutocomplete()
		});

		// Save button at bottom
		const saveContainer = content.createDiv({ cls: 'fit-workout-editor-save' });
		this.saveBtn = createButton(saveContainer, {
			text: 'Save changes',
			variant: 'primary',
			fullWidth: true,
			disabled: !this.hasChanges(),
			onClick: () => this.save()
		});
	}

	private renderExerciseList(container: HTMLElement): void {
		container.empty();

		if (this.exercises.length === 0) {
			container.createDiv({
				cls: 'fit-empty-state',
				text: 'No exercises yet. Add exercises to get started.'
			});
			return;
		}

		// Load exercise details asynchronously for images
		void this.loadExerciseDetails().then(() => {
			container.empty();
			for (let i = 0; i < this.exercises.length; i++) {
				this.renderExerciseRow(container, i);
			}
		});

		// Render immediately without images (will be replaced when loaded)
		for (let i = 0; i < this.exercises.length; i++) {
			this.renderExerciseRow(container, i);
		}
	}

	private async loadExerciseDetails(): Promise<void> {
		const exercises = await this.ctx.exerciseRepo.list();
		this.exerciseMap.clear();
		for (const ex of exercises) {
			// Store by both name and slug for flexible lookup
			this.exerciseMap.set(ex.name.toLowerCase(), ex);
			this.exerciseMap.set(ex.id.toLowerCase(), ex);
		}
	}

	private renderExerciseRow(container: HTMLElement, index: number): void {
		const exercise = this.exercises[index];
		if (!exercise) return;

		// Look up exercise details for image
		const exerciseLower = exercise.exercise.toLowerCase();
		const exerciseSlug = exerciseLower.replace(/\s+/g, '-');
		const exerciseDetails = this.exerciseMap.get(exerciseLower) ?? this.exerciseMap.get(exerciseSlug);

		const row = container.createDiv({
			cls: 'fit-workout-exercise-row',
			attr: { draggable: 'true' }
		});

		// Drag handle
		const dragHandle = row.createDiv({ cls: 'fit-drag-handle' });
		setIcon(dragHandle, 'grip-vertical');

		// Drag events
		row.addEventListener('dragstart', () => {
			this.draggedIndex = index;
			row.addClass('fit-dragging');
		});

		row.addEventListener('dragend', () => {
			this.draggedIndex = null;
			row.removeClass('fit-dragging');
		});

		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (this.draggedIndex !== null && this.draggedIndex !== index) {
				row.addClass('fit-drag-over');
			}
		});

		row.addEventListener('dragleave', () => {
			row.removeClass('fit-drag-over');
		});

		row.addEventListener('drop', (e) => {
			e.preventDefault();
			row.removeClass('fit-drag-over');
			if (this.draggedIndex !== null && this.draggedIndex !== index) {
				this.moveExercise(this.draggedIndex, index);
			}
		});

		// Exercise image (thumbnail)
		if (exerciseDetails?.image1) {
			row.createEl('img', {
				cls: 'fit-workout-exercise-img',
				attr: { src: exerciseDetails.image1, alt: exercise.exercise }
			});
		}

		// Exercise info (clickable to change exercise)
		const info = row.createDiv({ cls: 'fit-workout-exercise-info' });
		const nameEl = info.createDiv({ cls: 'fit-workout-exercise-name', text: exerciseDetails?.name ?? exercise.exercise });
		nameEl.addEventListener('click', () => {
			this.showExerciseAutocompleteForEdit(index);
		});

		const reps = exercise.targetRepsMin === exercise.targetRepsMax
			? `${exercise.targetRepsMin}`
			: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
		info.createDiv({
			cls: 'fit-workout-exercise-details',
			text: `${exercise.targetSets} sets × ${reps} reps • ${exercise.restSeconds}s rest`
		});

		// Delete button
		const deleteBtn = row.createDiv({ cls: 'fit-workout-exercise-delete' });
		setIcon(deleteBtn, 'trash-2');
		deleteBtn.addEventListener('click', () => {
			this.exercises.splice(index, 1);
			this.updateSaveButton();
			this.renderExerciseList(container);
		});
	}

	private moveExercise(fromIndex: number, toIndex: number): void {
		const [moved] = this.exercises.splice(fromIndex, 1);
		if (moved) {
			this.exercises.splice(toIndex, 0, moved);
			this.updateSaveButton();
			// Re-render the list
			const container = this.containerEl.querySelector('.fit-workout-editor-exercises') as HTMLElement;
			if (container) {
				this.renderExerciseList(container);
			}
		}
	}

	private showExerciseAutocomplete(): void {
		createExerciseAutocomplete(this.containerEl, {
			autoOpen: true,
			getItems: () => this.ctx.exerciseRepo.list(),
			onSelect: (exercise) => {
				if (!exercise) return;
				// Add exercise with default values
				this.exercises.push({
					exercise: exercise.name,
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 12,
					restSeconds: 120
				});
				// Update exercise map with selected exercise for immediate image display
				this.exerciseMap.set(exercise.name.toLowerCase(), exercise);
				this.exerciseMap.set(exercise.id.toLowerCase(), exercise);
				this.updateSaveButton();
				// Re-render the list
				const container = this.containerEl.querySelector('.fit-workout-editor-exercises') as HTMLElement;
				if (container) {
					this.renderExerciseList(container);
				}
			}
		});
	}

	private showExerciseAutocompleteForEdit(index: number): void {
		const existing = this.exercises[index];
		if (!existing) return;

		// Look up proper display name from exercise map
		const exerciseLower = existing.exercise.toLowerCase();
		const exerciseSlug = exerciseLower.replace(/\s+/g, '-');
		const exerciseDetails = this.exerciseMap.get(exerciseLower) ?? this.exerciseMap.get(exerciseSlug);
		const currentName = exerciseDetails?.name ?? existing.exercise;

		createExerciseAutocomplete(this.containerEl, {
			value: currentName,
			autoOpen: true,
			getItems: () => this.ctx.exerciseRepo.list(),
			onSelect: (exercise) => {
				if (!exercise) return;
				// Update the exercise name, keep other properties
				existing.exercise = exercise.name;
				// Update exercise map with selected exercise for immediate image display
				this.exerciseMap.set(exercise.name.toLowerCase(), exercise);
				this.exerciseMap.set(exercise.id.toLowerCase(), exercise);
				this.updateSaveButton();
				// Re-render the list
				const container = this.containerEl.querySelector('.fit-workout-editor-exercises') as HTMLElement;
				if (container) {
					this.renderExerciseList(container);
				}
			}
		});
	}

	private hasChanges(): boolean {
		if (this.exercises.length !== this.originalExercises.length) {
			return true;
		}

		for (let i = 0; i < this.exercises.length; i++) {
			const current = this.exercises[i];
			const original = this.originalExercises[i];
			if (!current || !original) return true;

			if (
				current.exercise !== original.exercise ||
				current.targetSets !== original.targetSets ||
				current.targetRepsMin !== original.targetRepsMin ||
				current.targetRepsMax !== original.targetRepsMax ||
				current.restSeconds !== original.restSeconds
			) {
				return true;
			}
		}

		return false;
	}

	private updateSaveButton(): void {
		if (this.saveBtn) {
			this.saveBtn.disabled = !this.hasChanges();
		}
	}

	private save(): void {
		if (!this.hasChanges()) return;

		if (this.editSession) {
			// Get current session to preserve logged sets
			const session = this.ctx.sessionState.getSession();
			if (!session) return;

			// Build a map of existing sets by exercise name
			const existingSets = new Map(
				session.exercises.map(e => [e.exercise, e.sets])
			);

			// Create session exercises with preserved sets
			const sessionExercises = this.exercises.map(e => ({
				exercise: e.exercise,
				targetSets: e.targetSets,
				targetRepsMin: e.targetRepsMin,
				targetRepsMax: e.targetRepsMax,
				restSeconds: e.restSeconds,
				sets: existingSets.get(e.exercise) ?? []
			}));

			// Update session exercises
			this.ctx.sessionState.updateExercises(sessionExercises);
			new Notice('Session exercises updated');
			this.ctx.view.goBack();
		}
	}

	destroy(): void {
		super.destroy();
	}
}
