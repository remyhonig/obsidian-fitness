import { MarkdownRenderer, Component } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import { BaseScreen } from './base-screen';
import type { ScreenParams, SessionExercise, MuscleEngagement } from '../../types';
import { createPrimaryAction, createButton } from '../components/button';
import { createHorizontalRepsSelector } from '../components/reps-grid';
import { createRpeSelector } from '../components/rpe-selector';
import { createMuscleEngagementSelector } from '../components/muscle-engagement-selector';
import { createScreenHeader } from '../components/screen-header';
import { ExerciseFormState } from './exercise-form-state';
import {
	createWeightInput,
	WeightInputRefs
} from './exercise';
import { parseCoachFeedbackYaml, findExerciseFeedback } from '../../data/coach-feedback-parser';

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

		// Sync ViewModel's exercise index
		this.ctx.viewModel.selectExercise(this.exerciseIndex);

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
				this.ctx.viewModel.markSetStart();
			} else if (!this.ctx.sessionState.isSetTimerActive()) {
				// Otherwise only start if not already active
				this.ctx.viewModel.markSetStart();
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

		// Calculate completion status
		const completedSets = exercise.sets.filter(s => s.completed).length;
		const isExerciseComplete = completedSets >= exercise.targetSets;

		// Header with exercise name, set timer shown and clickable
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			exerciseName: exercise.exercise,
			showSetTimer: !isExerciseComplete,
			exerciseIndex: this.exerciseIndex,
			onTimerClick: !isExerciseComplete ? () => {
				if (this.ctx.sessionState.isRestTimerActive()) {
					// Add 15 seconds to rest timer when clicked during rest
					this.ctx.viewModel.addRestTime(15);
				} else {
					// Reset set timer when clicked outside of rest
					this.ctx.viewModel.markSetStart();
				}
			} : undefined,
			onBack: () => this.ctx.view.navigateTo('session')
		});

		// Scrollable content area (single scroll for entire page)
		const scrollContent = this.containerEl.createDiv({ cls: 'fit-exercise-scroll-content' });

		if (isExerciseComplete) {
			// Show muscle engagement selector first
			createMuscleEngagementSelector(scrollContent, {
				selectedValue: exercise.muscleEngagement,
				onSelect: (value: MuscleEngagement) => {
					void this.ctx.viewModel.setMuscleEngagement(value);
				}
			});

			// Show RPE selector below
			const lastSetIndex = exercise.sets.length - 1;
			const lastSet = exercise.sets[lastSetIndex];
			createRpeSelector(scrollContent, {
				selectedValue: lastSet?.rpe,
				onSelect: (value) => {
					// Save RPE to the last set
					void this.ctx.viewModel.editSet(lastSetIndex, { rpe: value });
				}
			});

			// Action button
			const actionArea = scrollContent.createDiv({ cls: 'fit-exercise-action' });
			const allStatuses = this.getAllExerciseStatuses();
			const allExercisesComplete = allStatuses.every(s => s.isComplete);
			const questionnaireComplete = exercise.muscleEngagement !== undefined && lastSet?.rpe !== undefined;

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
			// Weight/reps inputs
			const inputsSection = scrollContent.createDiv({ cls: 'fit-exercise-inputs-section' });

			// Weight card
			const weightCard = inputsSection.createDiv({ cls: 'fit-input-card-wide' });
			this.weightInputRefs = createWeightInput(weightCard, {
				settings: this.ctx.settings,
				initialWeight: this.formState.weight,
				onWeightChange: (weight) => this.formState.setWeight(weight)
			});

			// Reps card
			const repsCard = inputsSection.createDiv({ cls: 'fit-input-card-wide' });
			createHorizontalRepsSelector(repsCard, this.formState.reps, (value) => {
				this.formState.setReps(value);
			}, {
				targetRange: { min: exercise.targetRepsMin, max: exercise.targetRepsMax }
			});

			// Complete set button right after reps
			const actionArea = inputsSection.createDiv({ cls: 'fit-exercise-action' });
			const nextSetNumber = completedSets + 1;
			createPrimaryAction(actionArea, `Complete set ${nextSetNumber} of ${exercise.targetSets}`, () => void this.completeSet());

			// Create containers in correct order (coach cue is async)
			const coachCueContainer = scrollContent.createDiv({ cls: 'fit-coach-cue-container' });
			const explanationContainer = scrollContent.createDiv({ cls: 'fit-explanation-container' });

			// Coaching tips (renders into container)
			void this.renderCoachCue(exercise.exercise, coachCueContainer);

			// Exercise details at the bottom (always shown)
			this.renderExerciseExplanation(exercise.exercise, explanationContainer);
		}

		// Subscribe to specific events
		this.subscribeToEvents();
	}

	private subscribeToEvents(): void {
		const state = this.ctx.sessionState;

		// Re-render when rest timer cancelled (UI changes after rest period ends)
		this.subscribe(
			state.on('timer.cancelled', () => {
				if (!this.showingExercisePicker) {
					this.render();
				}
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

	private renderExerciseExplanation(exerciseName: string, parent: HTMLElement): void {
		// Look up full exercise details asynchronously
		void this.ctx.exerciseRepo.getByName(exerciseName).then(exercise => {
			// Check if we have any details to show (only images and notes)
			if (!exercise?.notes && !exercise?.image0) {
				return;
			}

			const section = parent.createDiv({ cls: 'fit-exercise-explanation' });
			section.createDiv({ cls: 'fit-exercise-explanation-title', text: 'Exercise explanation' });

			const content = section.createDiv({ cls: 'fit-exercise-explanation-content' });

			// Exercise images (side by side)
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

			// Notes - render as markdown
			if (exercise.notes) {
				const notesSection = content.createDiv({ cls: 'fit-exercise-notes' });
				const notesContent = notesSection.createDiv({ cls: 'fit-exercise-notes-content' });

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

	private async renderCoachCue(exerciseName: string, parent: HTMLElement): Promise<void> {
		// Get current session and exercise
		const session = this.ctx.sessionState.getSession();
		if (!session?.workout) return;

		const currentExercise = this.getExercise();

		// Get previous session for this workout
		const previousSession = await this.ctx.sessionRepo.getPreviousSession(
			session.workout,
			session.id
		);

		// Find previous exercise data
		const previousExercise = previousSession?.exercises.find(e =>
			e.exercise.toLowerCase() === exerciseName.toLowerCase()
		);

		// Parse structured feedback if available
		const structured = previousSession?.coachFeedback
			? parseCoachFeedbackYaml(previousSession.coachFeedback)
			: null;
		const exerciseFeedback = structured
			? findExerciseFeedback(structured, exerciseName)
			: null;

		// Check if we have any "This time" content
		const hasThisTimeContent = exerciseFeedback?.coach_cue_volgende_sessie || exerciseFeedback?.aanpak_volgende_sessie;
		const hasThisTimeSets = currentExercise && currentExercise.targetSets > 0;

		// Check if we have any "Last time" content
		const hasLastTimeContent = exerciseFeedback?.stimulus ||
			exerciseFeedback?.set_degradatie_en_vermoeidheid ||
			exerciseFeedback?.progressie_tov_vorige;
		const hasLastTimeSets = previousExercise && previousExercise.sets.length > 0;

		// Render "This time" callout (current session sets + coach cue)
		if (hasThisTimeContent || hasThisTimeSets) {
			const thisTimeContainer = parent.createDiv({ cls: 'fit-exercise-feedback-callout fit-exercise-feedback-this-time' });
			thisTimeContainer.createDiv({ cls: 'fit-exercise-feedback-callout-title', text: 'This time' });

			const content = thisTimeContainer.createDiv({ cls: 'fit-exercise-feedback-callout-content' });

			// Current session set pills (with placeholders for incomplete sets)
			if (currentExercise) {
				const setsRow = content.createDiv({ cls: 'fit-feedback-sets-row' });
				const completedSets = currentExercise.sets.filter(s => s.completed);

				for (let i = 0; i < currentExercise.targetSets; i++) {
					const set = completedSets[i];
					if (set) {
						// Completed set (tappable to delete)
						const pill = setsRow.createSpan({
							cls: 'fit-feedback-set-pill fit-feedback-set-completed fit-feedback-set-tappable',
							text: `${set.reps}×${set.weight}kg`
						});
						// Find the actual index in the sets array
						const setIndex = currentExercise.sets.findIndex(s => s === set);
						pill.addEventListener('click', () => {
							void this.deleteSet(setIndex);
						});
					} else {
						// Placeholder for incomplete set
						setsRow.createSpan({
							cls: 'fit-feedback-set-pill fit-feedback-set-pending',
							text: '?×?kg'
						});
					}
				}
			}

			if (exerciseFeedback?.coach_cue_volgende_sessie) {
				const item = content.createDiv({ cls: 'fit-exercise-feedback-callout-item' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-label', text: 'Coach cue: ' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-value', text: exerciseFeedback.coach_cue_volgende_sessie });
			}

			if (exerciseFeedback?.aanpak_volgende_sessie) {
				const item = content.createDiv({ cls: 'fit-exercise-feedback-callout-item' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-label', text: 'Approach: ' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-value', text: exerciseFeedback.aanpak_volgende_sessie });
			}
		}

		// Render "Last time" callout (previous session sets + feedback)
		if (hasLastTimeContent || hasLastTimeSets) {
			const lastTimeContainer = parent.createDiv({ cls: 'fit-exercise-feedback-callout fit-exercise-feedback-last-time' });
			lastTimeContainer.createDiv({ cls: 'fit-exercise-feedback-callout-title', text: 'Last time' });

			const content = lastTimeContainer.createDiv({ cls: 'fit-exercise-feedback-callout-content' });

			// Previous session set pills
			if (previousExercise) {
				const setsRow = content.createDiv({ cls: 'fit-feedback-sets-row' });
				for (const set of previousExercise.sets.filter(s => s.completed)) {
					setsRow.createSpan({
						cls: 'fit-feedback-set-pill fit-feedback-set-previous',
						text: `${set.reps}×${set.weight}kg`
					});
				}
			}

			if (exerciseFeedback?.stimulus) {
				const item = content.createDiv({ cls: 'fit-exercise-feedback-callout-item' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-label', text: 'Stimulus: ' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-value', text: exerciseFeedback.stimulus });
			}

			if (exerciseFeedback?.set_degradatie_en_vermoeidheid) {
				const item = content.createDiv({ cls: 'fit-exercise-feedback-callout-item' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-label', text: 'Set analysis: ' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-value', text: exerciseFeedback.set_degradatie_en_vermoeidheid });
			}

			if (exerciseFeedback?.progressie_tov_vorige) {
				const item = content.createDiv({ cls: 'fit-exercise-feedback-callout-item' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-label', text: 'Progress: ' });
				item.createSpan({ cls: 'fit-exercise-feedback-callout-value', text: exerciseFeedback.progressie_tov_vorige });
			}
		}
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
			await this.ctx.viewModel.logSet(
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
		await this.ctx.viewModel.deleteSet(setIndex);

		// Re-render
		this.render();
	}

	private async deleteSet(setIndex: number): Promise<void> {
		await this.ctx.viewModel.deleteSet(setIndex);
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
		this.ctx.viewModel.selectExercise(index);

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
			// ViewModel handles finishing session and advancing program
			const session = await this.ctx.viewModel.finishWorkout();
			if (session) {
				this.ctx.view.navigateTo('finish', { sessionId: session.id });
			} else {
				this.ctx.view.navigateTo('home');
			}
		} catch (error) {
			console.error('Failed to finish workout:', error);
			this.ctx.view.navigateTo('home');
		}
	}

	destroy(): void {
		this.weightInputRefs?.destroy();
		super.destroy();
	}
}
