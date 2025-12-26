import { App, FuzzySuggestModal, FuzzyMatch } from 'obsidian';
import type { Exercise } from '../../types';
import { ExerciseRepository } from '../../data/exercise-repository';

/**
 * Exercise picker modal using fuzzy search
 */
export class ExercisePickerModal extends FuzzySuggestModal<Exercise> {
	private exercises: Exercise[] = [];
	private onSelectExercise: (exercise: Exercise) => void;

	constructor(
		app: App,
		private exerciseRepo: ExerciseRepository,
		onSelect: (exercise: Exercise) => void
	) {
		super(app);
		this.onSelectExercise = onSelect;
		this.setPlaceholder('Search exercises...');
	}

	onOpen(): void {
		void super.onOpen();
		this.exerciseRepo.list()
			.then(exercises => {
				this.exercises = exercises;
			})
			.catch(() => {
				// Silently fail if exercises can't be loaded
			});
	}

	getItems(): Exercise[] {
		return this.exercises;
	}

	getItemText(exercise: Exercise): string {
		return exercise.name;
	}

	onChooseItem(exercise: Exercise): void {
		this.onSelectExercise(exercise);
	}

	renderSuggestion(match: FuzzyMatch<Exercise>, el: HTMLElement): void {
		const exercise = match.item;
		el.addClass('fit-exercise-suggestion');

		const nameEl = el.createDiv({ cls: 'fit-exercise-suggestion-name' });
		nameEl.textContent = exercise.name;

		if (exercise.category || exercise.equipment) {
			const metaEl = el.createDiv({ cls: 'fit-exercise-suggestion-meta' });
			const parts: string[] = [];
			if (exercise.category) parts.push(exercise.category);
			if (exercise.equipment) parts.push(exercise.equipment);
			metaEl.textContent = parts.join(' • ');
		}
	}
}

/**
 * Helper function to pick an exercise
 */
export async function pickExercise(
	app: App,
	exerciseRepo: ExerciseRepository
): Promise<Exercise | null> {
	return new Promise((resolve) => {
		const modal = new ExercisePickerModal(app, exerciseRepo, (exercise) => {
			resolve(exercise);
		});

		// Handle modal close without selection
		const originalOnClose = modal.onClose.bind(modal);
		modal.onClose = () => {
			originalOnClose();
			resolve(null);
		};

		modal.open();
	});
}
