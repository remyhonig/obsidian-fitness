import { Notice } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { Exercise } from '../../types';
import { createBackButton, createButton, createPrimaryAction } from '../components/button';

/**
 * Exercise library screen - manage exercises
 */
export class ExerciseLibraryScreen implements Screen {
	private containerEl: HTMLElement;
	private exercises: Exercise[] = [];
	private searchQuery = '';
	private resultsEl: HTMLElement | null = null;
	private isEditing = false;
	private editingExercise: Exercise | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-exercise-library-screen' });
	}

	render(): void {
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => {
			if (this.isEditing) {
				this.isEditing = false;
				this.editingExercise = null;
				this.render();
			} else {
				this.ctx.view.goBack();
			}
		});
		header.createEl('h1', {
			text: this.isEditing ? (this.editingExercise ? 'Edit exercise' : 'New exercise') : 'Exercises',
			cls: 'fit-title'
		});

		if (this.isEditing) {
			this.renderEditForm();
		} else {
			void this.renderList();
		}
	}

	private async renderList(): Promise<void> {
		// Search bar
		const searchContainer = this.containerEl.createDiv({ cls: 'fit-search-container' });
		const searchInput = searchContainer.createEl('input', {
			cls: 'fit-search-input',
			attr: {
				type: 'text',
				placeholder: 'Search exercises...'
			}
		});

		searchInput.addEventListener('input', (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			this.renderResults();
		});

		// Load exercises
		this.exercises = await this.ctx.exerciseRepo.list();

		// Results container
		this.resultsEl = this.containerEl.createDiv({ cls: 'fit-exercise-list' });
		this.renderResults();

		// Add exercise button
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });
		createPrimaryAction(actions, 'Add exercise', () => {
			this.isEditing = true;
			this.editingExercise = null;
			void Promise.resolve().then(() => this.render());
		});
	}

	private renderResults(): void {
		if (!this.resultsEl) return;
		this.resultsEl.empty();

		// Filter exercises
		let filtered = this.exercises;
		if (this.searchQuery) {
			const query = this.searchQuery.toLowerCase();
			filtered = this.exercises.filter(e =>
				e.name.toLowerCase().includes(query) ||
				e.category?.toLowerCase().includes(query) ||
				e.equipment?.toLowerCase().includes(query) ||
				e.muscleGroups?.some(m => m.toLowerCase().includes(query))
			);
		}

		if (filtered.length === 0) {
			if (this.searchQuery) {
				this.resultsEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No exercises found'
				});
			} else {
				this.resultsEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No exercises yet. Add your first exercise!'
				});
			}
			return;
		}

		for (const exercise of filtered) {
			this.renderExerciseRow(this.resultsEl, exercise);
		}
	}

	private renderExerciseRow(parent: HTMLElement, exercise: Exercise): void {
		const isDatabase = exercise.source === 'database';
		const row = parent.createDiv({
			cls: `fit-library-exercise-row ${isDatabase ? 'fit-library-exercise-row-database' : ''}`
		});

		const info = row.createDiv({ cls: 'fit-library-exercise-info' });

		// Name with source badge
		const nameRow = info.createDiv({ cls: 'fit-library-exercise-name-row' });
		nameRow.createSpan({ cls: 'fit-library-exercise-name', text: exercise.name });
		if (isDatabase) {
			nameRow.createSpan({ cls: 'fit-library-exercise-badge fit-badge-database', text: 'DB' });
		} else {
			nameRow.createSpan({ cls: 'fit-library-exercise-badge fit-badge-custom', text: 'Custom' });
		}

		const meta = info.createDiv({ cls: 'fit-library-exercise-meta' });
		if (exercise.category) {
			meta.createSpan({ text: exercise.category });
		}
		if (exercise.equipment) {
			if (exercise.category) meta.createSpan({ text: ' • ' });
			meta.createSpan({ text: exercise.equipment });
		}

		// Edit/Copy button based on source
		if (isDatabase) {
			const copyBtn = row.createEl('button', {
				cls: 'fit-button fit-button-ghost',
				text: 'Copy'
			});
			copyBtn.addEventListener('click', () => {
				void this.copyToCustom(exercise);
			});
		} else {
			const editBtn = row.createEl('button', {
				cls: 'fit-button fit-button-ghost',
				text: 'Edit'
			});
			editBtn.addEventListener('click', () => {
				this.isEditing = true;
				this.editingExercise = exercise;
				void Promise.resolve().then(() => this.render());
			});
		}
	}

	private async copyToCustom(exercise: Exercise): Promise<void> {
		try {
			const copied = await this.ctx.exerciseRepo.copyToCustom(exercise.id);
			if (copied) {
				new Notice(`Copied "${exercise.name}" to your exercises`);
				// Reload and re-render
				this.exercises = await this.ctx.exerciseRepo.list();
				this.renderResults();
			}
		} catch (error) {
			console.error('Failed to copy exercise:', error);
			new Notice(`Failed to copy: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private renderEditForm(): void {
		const exercise = this.editingExercise;

		// Form state
		let name = exercise?.name ?? '';
		let category = exercise?.category ?? '';
		let equipment = exercise?.equipment ?? '';
		let muscleGroups = exercise?.muscleGroups?.join(', ') ?? '';
		let defaultWeight = exercise?.defaultWeight ?? 0;
		let weightIncrement = exercise?.weightIncrement ?? 2.5;
		let notes = exercise?.notes ?? '';

		const form = this.containerEl.createDiv({ cls: 'fit-form' });

		// Name
		const nameGroup = form.createDiv({ cls: 'fit-form-group' });
		nameGroup.createEl('label', { text: 'Exercise name', cls: 'fit-form-label' });
		const nameInput = nameGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: { type: 'text', placeholder: 'Barbell squat', value: name }
		});
		nameInput.addEventListener('input', (e) => {
			name = (e.target as HTMLInputElement).value;
		});

		// Category
		const categoryGroup = form.createDiv({ cls: 'fit-form-group' });
		categoryGroup.createEl('label', { text: 'Category', cls: 'fit-form-label' });
		const categoryInput = categoryGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: { type: 'text', placeholder: 'Legs', value: category }
		});
		categoryInput.addEventListener('input', (e) => {
			category = (e.target as HTMLInputElement).value;
		});

		// Equipment
		const equipmentGroup = form.createDiv({ cls: 'fit-form-group' });
		equipmentGroup.createEl('label', { text: 'Equipment', cls: 'fit-form-label' });
		const equipmentInput = equipmentGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: { type: 'text', placeholder: 'Barbell', value: equipment }
		});
		equipmentInput.addEventListener('input', (e) => {
			equipment = (e.target as HTMLInputElement).value;
		});

		// Muscle groups
		const musclesGroup = form.createDiv({ cls: 'fit-form-group' });
		musclesGroup.createEl('label', { text: 'Muscle groups (comma-separated)', cls: 'fit-form-label' });
		const musclesInput = musclesGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: { type: 'text', placeholder: 'Quadriceps', value: muscleGroups }
		});
		musclesInput.addEventListener('input', (e) => {
			muscleGroups = (e.target as HTMLInputElement).value;
		});

		// Default weight
		const weightGroup = form.createDiv({ cls: 'fit-form-group' });
		const unit = this.ctx.plugin.settings.weightUnit;
		weightGroup.createEl('label', { text: `Default weight (${unit})`, cls: 'fit-form-label' });
		const weightInput = weightGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: { type: 'number', min: '0', step: '0.25', value: String(defaultWeight) }
		});
		weightInput.addEventListener('input', (e) => {
			defaultWeight = parseFloat((e.target as HTMLInputElement).value) || 0;
		});

		// Weight increment
		const incGroup = form.createDiv({ cls: 'fit-form-group' });
		incGroup.createEl('label', { text: `Weight increment (${unit})`, cls: 'fit-form-label' });
		const incInput = incGroup.createEl('input', {
			cls: 'fit-form-input',
			attr: { type: 'number', min: '0', step: '0.25', value: String(weightIncrement) }
		});
		incInput.addEventListener('input', (e) => {
			weightIncrement = parseFloat((e.target as HTMLInputElement).value) || 2.5;
		});

		// Notes
		const notesGroup = form.createDiv({ cls: 'fit-form-group' });
		notesGroup.createEl('label', { text: 'Notes (optional)', cls: 'fit-form-label' });
		const notesInput = notesGroup.createEl('textarea', {
			cls: 'fit-form-textarea',
			attr: { placeholder: 'Form cues, tips, etc.', rows: '3' }
		});
		notesInput.value = notes;
		notesInput.addEventListener('input', (e) => {
			notes = (e.target as HTMLTextAreaElement).value;
		});

		// Actions
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });

		if (exercise) {
			createButton(actions, {
				text: 'Delete',
				variant: 'danger',
				onClick: () => {
					void this.ctx.exerciseRepo.delete(exercise.id).then(() => {
						new Notice('Exercise deleted');
						this.isEditing = false;
						this.editingExercise = null;
						this.render();
					}).catch((error: unknown) => {
						console.error('Failed to delete exercise:', error);
						new Notice(`Failed to delete exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
					});
				}
			});
		}

		createPrimaryAction(actions, 'Save exercise', () => {
			if (!name.trim()) {
				new Notice('Please enter an exercise name');
				return;
			}

			const parsedMuscles = muscleGroups
				.split(',')
				.map(s => s.trim())
				.filter(s => s.length > 0);

			const isUpdate = !!exercise;
			const savePromise = exercise
				? this.ctx.exerciseRepo.update(exercise.id, {
						name: name.trim(),
						category: category.trim() || undefined,
						equipment: equipment.trim() || undefined,
						muscleGroups: parsedMuscles.length > 0 ? parsedMuscles : undefined,
						defaultWeight: defaultWeight || undefined,
						weightIncrement: weightIncrement || undefined,
						notes: notes.trim() || undefined
					})
				: this.ctx.exerciseRepo.create({
						name: name.trim(),
						category: category.trim() || undefined,
						equipment: equipment.trim() || undefined,
						muscleGroups: parsedMuscles.length > 0 ? parsedMuscles : undefined,
						defaultWeight: defaultWeight || undefined,
						weightIncrement: weightIncrement || undefined,
						notes: notes.trim() || undefined,
						source: 'custom'
					});

			void savePromise.then(() => {
				new Notice(isUpdate ? `Exercise "${name}" updated` : `Exercise "${name}" created`);
				this.isEditing = false;
				this.editingExercise = null;
				this.render();
			}).catch((error: unknown) => {
				console.error('Failed to save exercise:', error);
				new Notice(`Failed to save exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
			});
		});
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
