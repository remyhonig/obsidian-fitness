import { MarkdownRenderer, Component } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import { BaseScreen } from './base-screen';
import type { ScreenParams, SessionExercise, Session, MuscleEngagement } from '../../types';
import { createPrimaryAction, createButton } from '../components/button';
import { createHorizontalRepsSelector } from '../components/reps-grid';
import { createRpeSelector } from '../components/rpe-selector';
import { createMuscleEngagementSelector } from '../components/muscle-engagement-selector';
import { createScreenHeader } from '../components/screen-header';
import { toFilename } from '../../data/file-utils';
import { ExerciseFormState } from './exercise-form-state';
import {
	TimerDisplayRefs,
	updateTimerDisplay,
	updateRestTimerDisplay,
	createProgressCard,
	createWeightInput,
	renderIntegratedSets,
	WeightInputRefs
} from './exercise';

interface ExerciseStatus {
	index: number;
	exercise: SessionExercise;
	completedSets: number;
	targetSets: number;
	isComplete: boolean;
}

/**
 * Exercise screen - fullscreen set logging for an exercise
 */
export class ExerciseScreen extends BaseScreen {
	private exerciseIndex: number;
	private formState: ExerciseFormState;
	private showingExercisePicker = false;
	private timerRefs: TimerDisplayRefs | null = null;
	private weightInputRefs: WeightInputRefs | null = null;
	private isCompletingSet = false;

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-exercise-screen');
		this.exerciseIndex = params.exerciseIndex ?? 0;
		this.formState = new ExerciseFormState();

		// Initialize values from current session's last set or defaults
		const exercise = this.getExercise();
		const lastSet = this.ctx.sessionState.getLastSet(this.exerciseIndex);

		if (exercise) {
			this.formState.loadFromCurrentSession(exercise, lastSet);
		}

		// If no current session set, load from history (will update weight/reps)
		if (!lastSet && exercise) {
			this.abortController = new AbortController();
			void this.loadFromHistory(this.abortController.signal);
		}

		// Auto-mark set start when opening exercise screen
		const completedSets = exercise?.sets.filter(s => s.completed).length ?? 0;
		const isComplete = exercise && completedSets >= exercise.targetSets;

		if (!isComplete && !this.ctx.sessionState.isRestTimerActive()) {
			// If no sets completed for this exercise, always reset the timer
			// (user may have been walking around, finding equipment, reading notes)
			if (completedSets === 0) {
				this.ctx.sessionState.markSetStart(this.exerciseIndex);
			} else if (!this.ctx.sessionState.isSetTimerActive()) {
				// Otherwise only start if not already active
				this.ctx.sessionState.markSetStart(this.exerciseIndex);
			}
		}
	}

	/**
	 * Load weight/reps from the last session's matching exercise
	 */
	private async loadFromHistory(signal: AbortSignal): Promise<void> {
		const exercise = this.getExercise();
		if (!exercise) return;

		const updated = await this.formState.loadFromHistory(
			exercise.exercise,
			this.ctx.sessionRepo,
			signal
		);

		if (updated && !signal.aborted) {
			this.render();
		}
	}

	render(): void {
		this.prepareRender();

		const exercise = this.getExercise();
		if (!exercise) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'Exercise not found'
			});
			return;
		}

		// Header with resume-style card
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: () => this.ctx.view.navigateTo('session')
		});

		// Top section: Progress stats + Sets history (integrated)
		const topSection = this.containerEl.createDiv({ cls: 'fit-exercise-top' });

		// Exercise title (moved from header)
		topSection.createEl('h2', { text: exercise.exercise, cls: 'fit-exercise-title' });

		// Progress card - sets, timer, target reps
		const progressCardRefs = createProgressCard(topSection, {
			exercise,
			sessionState: this.ctx.sessionState,
			exerciseIndex: this.exerciseIndex
		});
		this.timerRefs = progressCardRefs.timerRefs;
		const isExerciseComplete = progressCardRefs.isComplete;

		// Integrated sets row (current session in accent, history in gray)
		const setsRow = topSection.createDiv({ cls: 'fit-sets-integrated' });
		renderIntegratedSets(setsRow, {
			exercise,
			weightUnit: this.ctx.settings.weightUnit,
			sessionRepo: this.ctx.sessionRepo,
			onDeleteSet: (setIndex) => this.deleteSet(setIndex)
		});

		// Middle content area (scrollable)
		const middleContent = this.containerEl.createDiv({ cls: 'fit-middle-content' });

		if (isExerciseComplete) {
			// Show muscle engagement selector first
			createMuscleEngagementSelector(middleContent, {
				selectedValue: exercise.muscleEngagement,
				onSelect: (value: MuscleEngagement) => {
					void this.ctx.sessionState.setExerciseMuscleEngagement(this.exerciseIndex, value);
				}
			});

			// Show RPE selector below
			const lastSetIndex = exercise.sets.length - 1;
			const lastSet = exercise.sets[lastSetIndex];
			createRpeSelector(middleContent, {
				selectedValue: lastSet?.rpe,
				onSelect: (value) => {
					// Save RPE to the last set
					void this.ctx.sessionState.editSet(this.exerciseIndex, lastSetIndex, { rpe: value });
				}
			});
		} else {
			// Show exercise details when still logging sets
			this.renderExerciseDetails(exercise, middleContent);

			// Bottom input area (fixed above action button)
			const bottomInputs = this.containerEl.createDiv({ cls: 'fit-bottom-inputs' });

			// Weight card - full width (no title, just controls)
			const weightCard = bottomInputs.createDiv({ cls: 'fit-input-card-wide' });
			this.weightInputRefs = createWeightInput(weightCard, {
				settings: this.ctx.settings,
				initialWeight: this.formState.weight,
				onWeightChange: (weight) => this.formState.setWeight(weight)
			});

			// Reps card - full width (no title, just controls)
			const repsCard = bottomInputs.createDiv({ cls: 'fit-input-card-wide' });
			createHorizontalRepsSelector(repsCard, this.formState.reps, (value) => {
				this.formState.setReps(value);
			});
		}

		// Action area
		const actionArea = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });
		const allStatuses = this.getAllExerciseStatuses();
		const allExercisesComplete = allStatuses.every(s => s.isComplete);

		if (isExerciseComplete) {
			// Check if questionnaire is complete (muscle engagement and RPE)
			const lastSetIndex = exercise.sets.length - 1;
			const lastSet = exercise.sets[lastSetIndex];
			const questionnaireComplete = exercise.muscleEngagement !== undefined && lastSet?.rpe !== undefined;

			// Show navigation button (next exercise or complete session)
			if (allExercisesComplete) {
				createPrimaryAction(actionArea, 'Complete session', () => {
					void this.finishWorkout();
				}, !questionnaireComplete);
			} else {
				createPrimaryAction(actionArea, 'Next exercise', () => {
					this.ctx.view.navigateTo('session');
				}, !questionnaireComplete);
			}
		} else {
			// Complete set button
			createPrimaryAction(actionArea, 'Complete set', () => void this.completeSet());
		}

		// Subscribe to specific events
		this.subscribeToEvents();
	}

	private subscribeToEvents(): void {
		const state = this.ctx.sessionState;

		// Rest timer events - update progress card timer
		this.subscribe(
			state.on('timer.tick', ({ remaining }) => {
				updateRestTimerDisplay(this.timerRefs, remaining);
			})
		);

		this.subscribe(
			state.on('timer.started', () => {
				this.updateTimer();
			})
		);

		this.subscribe(
			state.on('timer.cancelled', () => {
				this.updateTimer();
				// Re-render to show updated UI (e.g., after rest period ends)
				if (!this.showingExercisePicker) {
					this.render();
				}
			})
		);

		// Duration timer events - update progress card timer (only if rest timer is not active)
		this.subscribe(
			state.on('duration.tick', () => {
				if (!state.isRestTimerActive()) {
					this.updateTimer();
				}
			})
		);

		// Set started event - update timer to show set duration
		this.subscribe(
			state.on('set.started', () => {
				this.updateTimer();
			})
		);

		// Set events - re-render to show updated sets
		const reRenderIfNotPicking = () => {
			if (!this.showingExercisePicker) {
				this.render();
			}
		};

		this.subscribe(state.on('set.logged', reRenderIfNotPicking));
		this.subscribe(state.on('set.edited', reRenderIfNotPicking));
		this.subscribe(state.on('set.deleted', reRenderIfNotPicking));

		// RPE/muscle events - re-render
		this.subscribe(state.on('rpe.changed', reRenderIfNotPicking));
		this.subscribe(state.on('muscle.changed', reRenderIfNotPicking));
	}

	/**
	 * Update timer display
	 */
	private updateTimer(): void {
		updateTimerDisplay(this.timerRefs, this.ctx.sessionState);
	}

	private renderExerciseDetails(sessionExercise: SessionExercise, parent: HTMLElement): void {
		// Look up full exercise details asynchronously
		void this.ctx.exerciseRepo.getByName(sessionExercise.exercise).then(exercise => {
			// Check if we have any details to show (only images and notes, skip properties)
			if (!exercise?.notes && !exercise?.image0) {
				return;
			}

			const section = parent.createDiv({ cls: 'fit-exercise-details' });
			const content = section.createDiv({ cls: 'fit-exercise-details-content' });

			// Exercise images at the top (side by side)
			if (exercise.image0 || exercise.image1) {
				const imagesRow = content.createDiv({ cls: 'fit-exercise-images' });
				if (exercise.image0) {
					imagesRow.createEl('img', {
						cls: 'fit-exercise-image',
						attr: { src: exercise.image0, alt: exercise.name }
					});
				}
				if (exercise.image1) {
					imagesRow.createEl('img', {
						cls: 'fit-exercise-image',
						attr: { src: exercise.image1, alt: exercise.name }
					});
				}
			}

			// Notes - render as markdown (skip muscles, equipment, category)
			if (exercise.notes) {
				const notesSection = content.createDiv({ cls: 'fit-exercise-notes' });
				const notesContent = notesSection.createDiv({ cls: 'fit-exercise-notes-content' });

				// Use a temporary component for markdown rendering lifecycle
				const tempComponent = new Component();
				tempComponent.load();

				void MarkdownRenderer.render(
					this.ctx.app,
					exercise.notes,
					notesContent,
					'',
					tempComponent
				);
			}
		});
	}

	private getExercise(): SessionExercise | null {
		return this.ctx.sessionState.getExercise(this.exerciseIndex);
	}

	private async completeSet(): Promise<void> {
		// Prevent multiple rapid clicks
		if (this.isCompletingSet) return;

		if (!this.formState.isValid()) {
			return;
		}

		this.isCompletingSet = true;

		try {
			// Log the set and wait for persistence
			await this.ctx.sessionState.logSet(
				this.exerciseIndex,
				this.formState.weight,
				this.formState.reps
			);

			// Explicitly re-render (subscription handler may be blocked by rest timer)
			this.render();
		} finally {
			this.isCompletingSet = false;
		}
	}

	private async editSet(setIndex: number): Promise<void> {
		const exercise = this.getExercise();
		if (!exercise) return;

		const set = exercise.sets[setIndex];
		if (!set) return;

		// Load set values into form state
		this.formState.loadFromSet(set);

		// Delete the set so it can be re-logged
		await this.ctx.sessionState.deleteSet(this.exerciseIndex, setIndex);

		// Re-render
		this.render();
	}

	private async deleteSet(setIndex: number): Promise<void> {
		await this.ctx.sessionState.deleteSet(this.exerciseIndex, setIndex);
		this.render();
	}

	private getAllExerciseStatuses(): ExerciseStatus[] {
		const session = this.ctx.sessionState.getSession();
		if (!session) return [];

		return session.exercises.map((exercise, index) => {
			const completedSets = exercise.sets.filter(s => s.completed).length;
			return {
				index,
				exercise,
				completedSets,
				targetSets: exercise.targetSets,
				isComplete: completedSets >= exercise.targetSets
			};
		});
	}

	private showExercisePicker(): void {
		this.showingExercisePicker = true;

		// Create overlay
		const overlay = this.containerEl.createDiv({ cls: 'fit-exercise-picker-overlay' });

		const modal = overlay.createDiv({ cls: 'fit-exercise-picker-modal' });

		// Header
		const header = modal.createDiv({ cls: 'fit-picker-header' });
		header.createEl('h2', { text: 'Next exercise' });
		createButton(header, {
			text: '×',
			variant: 'ghost',
			size: 'small',
			onClick: () => this.closeExercisePicker(overlay)
		});

		// Exercise list
		const list = modal.createDiv({ cls: 'fit-exercise-picker-list' });

		const statuses = this.getAllExerciseStatuses();
		const pendingExercises = statuses.filter(s => !s.isComplete && s.index !== this.exerciseIndex);
		const completedExercises = statuses.filter(s => s.isComplete && s.index !== this.exerciseIndex);

		// Pending exercises section
		if (pendingExercises.length > 0) {
			list.createEl('h3', { text: 'To do', cls: 'fit-picker-section-title' });
			for (const status of pendingExercises) {
				this.renderExercisePickerItem(list, status, false, overlay);
			}
		}

		// Completed exercises section (for editing)
		if (completedExercises.length > 0) {
			list.createEl('h3', { text: 'Completed (tap to edit)', cls: 'fit-picker-section-title' });
			for (const status of completedExercises) {
				this.renderExercisePickerItem(list, status, true, overlay);
			}
		}

		// Complete session button if all done
		const allComplete = statuses.every(s => s.isComplete);
		if (allComplete) {
			const actions = modal.createDiv({ cls: 'fit-picker-actions' });
			createPrimaryAction(actions, 'Complete session', () => {
				this.closeExercisePicker(overlay);
				void this.finishWorkout();
			});
		}

		// Back to session button
		const backActions = modal.createDiv({ cls: 'fit-picker-back' });
		createButton(backActions, {
			text: 'Back to session overview',
			variant: 'secondary',
			onClick: () => {
				this.closeExercisePicker(overlay);
				this.ctx.view.navigateTo('session');
			}
		});
	}

	private renderExercisePickerItem(
		parent: HTMLElement,
		status: ExerciseStatus,
		isCompleted: boolean,
		overlay: HTMLElement
	): void {
		const item = parent.createDiv({
			cls: `fit-exercise-picker-item ${isCompleted ? 'fit-exercise-picker-item-completed' : ''}`
		});

		const info = item.createDiv({ cls: 'fit-picker-item-info' });
		info.createDiv({ cls: 'fit-picker-item-name', text: status.exercise.exercise });

		const progressText = `${status.completedSets}/${status.targetSets} sets`;
		const repsText = status.exercise.targetRepsMin === status.exercise.targetRepsMax
			? `${status.exercise.targetRepsMin} reps`
			: `${status.exercise.targetRepsMin}-${status.exercise.targetRepsMax} reps`;

		info.createDiv({
			cls: 'fit-picker-item-progress',
			text: `${progressText} • ${repsText}`
		});

		// Status indicator
		if (isCompleted) {
			item.createDiv({ cls: 'fit-picker-item-check', text: '✓' });
		}

		item.addEventListener('click', () => {
			this.closeExercisePicker(overlay);
			this.navigateToExercise(status.index);
		});
	}

	private closeExercisePicker(overlay: HTMLElement): void {
		this.showingExercisePicker = false;
		overlay.remove();
	}

	private navigateToExercise(index: number): void {
		this.exerciseIndex = index;
		this.ctx.sessionState.setCurrentExerciseIndex(index);

		// Reset form state from the new exercise's last set
		const exercise = this.getExercise();
		const lastSet = this.ctx.sessionState.getLastSet(index);

		if (exercise) {
			this.formState.resetForExercise(exercise, lastSet);
		}

		this.render();

		if (!lastSet && exercise) {
			// No current session set, load from history
			this.abortController?.abort();
			this.abortController = new AbortController();
			void this.loadFromHistory(this.abortController.signal);
		}
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
			this.ctx.view.navigateTo('home');
		}
	}

	private async advanceProgramIfMatching(session: Session): Promise<void> {
		const settings = this.ctx.settings;
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
				await this.ctx.saveSettings();
			}
		} catch (error) {
			console.error('Failed to advance program:', error);
		}
	}

	destroy(): void {
		this.weightInputRefs?.destroy();
		super.destroy();
	}
}
