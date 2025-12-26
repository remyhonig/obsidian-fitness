import type { Screen, ScreenContext } from '../../views/fit-view';
import type { Session, Exercise } from '../../types';
import { createBackButton, createButton, createPrimaryAction } from '../components/button';
import { createExerciseCard } from '../components/card';
import { toFilename } from '../../data/file-utils';

/**
 * Session screen - shows the active workout overview
 */
export class SessionScreen implements Screen {
	private containerEl: HTMLElement;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-session-screen' });
	}

	render(): void {
		this.containerEl.empty();

		const session = this.ctx.sessionState.getSession();
		if (!session) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'No active workout'
			});
			return;
		}

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.confirmExit());

		const titleContainer = header.createDiv({ cls: 'fit-header-title' });
		titleContainer.createEl('h1', {
			text: session.workout ?? 'Workout',
			cls: 'fit-title'
		});

		// Exercise list
		const exerciseList = this.containerEl.createDiv({ cls: 'fit-exercise-list' });

		if (session.exercises.length === 0) {
			exerciseList.createDiv({
				cls: 'fit-empty-state',
				text: 'No exercises yet. Add your first exercise!'
			});
		} else {
			// Render exercise cards with images loaded asynchronously
			void this.renderExerciseCards(session, exerciseList);
		}

		// Bottom actions
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });

		createButton(actions, {
			text: 'Add exercise',
			variant: 'secondary',
			onClick: () => { void this.showExercisePicker(); }
		});

		// Show Cancel if no sets logged, Finish workout if there are sets
		const totalSets = this.getTotalCompletedSets(session);
		if (totalSets > 0) {
			createPrimaryAction(actions, 'Finish workout', () => {
				void this.finishWorkout();
			});
		} else {
			createButton(actions, {
				text: 'Cancel',
				variant: 'ghost',
				onClick: () => { void this.cancelWorkout(); }
			});
		}

	}

	private async renderExerciseCards(session: Session, exerciseList: HTMLElement): Promise<void> {
		// Build maps for exercise lookup by both name and ID (slug)
		const exerciseByName = new Map<string, Exercise>();
		const exerciseById = new Map<string, Exercise>();
		const exercises = await this.ctx.exerciseRepo.list();
		for (const ex of exercises) {
			exerciseByName.set(ex.name.toLowerCase(), ex);
			exerciseById.set(ex.id.toLowerCase(), ex);
		}

		// Render each exercise card
		for (let i = 0; i < session.exercises.length; i++) {
			const sessionExercise = session.exercises[i];
			if (!sessionExercise) continue;

			// Look up the exercise to get images - try name first, then ID (slug)
			const exerciseLower = sessionExercise.exercise.toLowerCase();
			const exerciseSlug = exerciseLower.replace(/\s+/g, '-');
			const exerciseDetails = exerciseByName.get(exerciseLower) ?? exerciseById.get(exerciseSlug);

			createExerciseCard(exerciseList, {
				exercise: sessionExercise,
				index: i,
				image0: exerciseDetails?.image0,
				image1: exerciseDetails?.image1,
				onClick: () => this.ctx.view.navigateTo('exercise', { exerciseIndex: i })
			});
		}
	}

	private async showExercisePicker(): Promise<void> {
		// Get all exercises
		const exercises = await this.ctx.exerciseRepo.list();

		if (exercises.length === 0) {
			// No exercises, prompt to create one
			this.ctx.view.navigateTo('exercise-library');
			return;
		}

		// For now, show a simple prompt
		// In a full implementation, this would be a SuggestModal
		const firstExercise = exercises[0];
		if (firstExercise) {
			this.ctx.sessionState.addExercise(firstExercise.name);
			this.render();
		}
	}

	private confirmExit(): void {
		// For now, just go back. Could add confirmation dialog.
		this.ctx.view.navigateTo('home');
	}

	private getTotalCompletedSets(session: Session): number {
		let total = 0;
		for (const exercise of session.exercises) {
			total += exercise.sets.filter(s => s.completed).length;
		}
		return total;
	}

	private async cancelWorkout(): Promise<void> {
		// Discard session without saving
		await this.ctx.sessionState.discardSession();
		this.ctx.view.navigateTo('home');
	}

	private async finishWorkout(): Promise<void> {
		try {
			const session = await this.ctx.sessionState.finishSession();
			if (session) {
				// Advance program if this workout matches the current program workout
				await this.advanceProgramIfMatching(session);
				this.ctx.view.navigateTo('finish', { sessionId: session.id });
			} else {
				this.ctx.view.navigateTo('home');
			}
		} catch (error) {
			console.error('Failed to finish workout:', error);
			// Still navigate home on error
			this.ctx.view.navigateTo('home');
		}
	}

	private async advanceProgramIfMatching(session: Session): Promise<void> {
		const settings = this.ctx.plugin.settings;
		if (!settings.activeProgram || !session.workout) return;

		try {
			const program = await this.ctx.programRepo.get(settings.activeProgram);
			if (!program || program.workouts.length === 0) return;

			// Get the current workout in the program
			const currentIndex = settings.programWorkoutIndex % program.workouts.length;
			const currentWorkoutId = program.workouts[currentIndex];

			// Check if the completed session's workout matches the current program workout
			// Compare by ID (slug) since that's what's stored in the program
			const sessionWorkoutId = toFilename(session.workout);
			if (currentWorkoutId === sessionWorkoutId) {
				// Advance to next workout in the program
				settings.programWorkoutIndex = (currentIndex + 1) % program.workouts.length;
				await this.ctx.plugin.saveSettings();
			}
		} catch (error) {
			console.error('Failed to advance program:', error);
		}
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
