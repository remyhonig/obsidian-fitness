import { setIcon } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { Session, Exercise } from '../../types';
import { createButton, createPrimaryAction } from '../components/button';
import { createExerciseCard } from '../components/card';
import { createExerciseAutocomplete } from '../components/autocomplete';
import { toFilename } from '../../data/file-utils';

/**
 * Session screen - shows the active workout overview
 */
export class SessionScreen implements Screen {
	private containerEl: HTMLElement;
	private unsubscribeFileWatch: (() => void) | null = null;
	private abortController: AbortController | null = null;
	private eventUnsubscribers: (() => void)[] = [];
	private playIconEl: HTMLElement | null = null;
	private durationEl: HTMLElement | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-session-screen' });

		// Subscribe to workout file changes if there's an active session
		const session = ctx.sessionState.getSession();
		if (session?.workout) {
			const workoutId = toFilename(session.workout);
			const workoutPath = `${ctx.settings.basePath}/Workouts/${workoutId}.md`;
			this.unsubscribeFileWatch = ctx.watchFile(workoutPath, () => {
				// Abort previous sync, start new one
				this.abortController?.abort();
				this.abortController = new AbortController();
				void this.syncSessionWithWorkout(workoutId, this.abortController.signal);
			});
		}
	}

	/**
	 * Syncs session exercises with the workout file
	 * Preserves logged sets while updating exercise definitions
	 */
	private async syncSessionWithWorkout(workoutId: string, signal: AbortSignal): Promise<void> {
		const workout = await this.ctx.workoutRepo.get(workoutId);
		if (signal.aborted || !workout) return;

		const session = this.ctx.sessionState.getSession();
		if (signal.aborted || !session) return;

		// Build a map of existing exercises by their ID for preserving logged sets
		const existingSets = new Map<string, typeof session.exercises[0]['sets']>();
		for (const ex of session.exercises) {
			const exId = toFilename(ex.exercise);
			existingSets.set(exId, ex.sets);
		}

		// Update session exercises from workout, preserving logged sets where possible
		const updatedExercises = workout.exercises.map(we => {
			const exerciseId = we.exerciseId ?? toFilename(we.exercise);
			const existingSetData = existingSets.get(exerciseId);

			return {
				exercise: we.exercise,
				targetSets: we.targetSets,
				targetRepsMin: we.targetRepsMin,
				targetRepsMax: we.targetRepsMax,
				restSeconds: we.restSeconds,
				sets: existingSetData ?? []
			};
		});

		if (signal.aborted) return;

		// Check if anything actually changed before updating
		const hasChanges = this.exercisesChanged(session.exercises, updatedExercises);
		if (hasChanges) {
			// Update session state (this saves and notifies listeners)
			this.ctx.sessionState.updateExercises(updatedExercises);
			this.render();
		}
	}

	/**
	 * Checks if exercise definitions have changed (ignoring logged sets)
	 */
	private exercisesChanged(
		current: Session['exercises'],
		updated: Session['exercises']
	): boolean {
		if (current.length !== updated.length) return true;

		for (let i = 0; i < current.length; i++) {
			const c = current[i];
			const u = updated[i];
			if (!c || !u) return true;
			if (c.exercise !== u.exercise) return true;
			if (c.targetSets !== u.targetSets) return true;
			if (c.targetRepsMin !== u.targetRepsMin) return true;
			if (c.targetRepsMax !== u.targetRepsMax) return true;
			if (c.restSeconds !== u.restSeconds) return true;
		}
		return false;
	}

	render(): void {
		// Clear element references
		this.playIconEl = null;
		this.durationEl = null;

		this.containerEl.empty();

		const session = this.ctx.sessionState.getSession();
		if (!session) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'No active workout'
			});
			return;
		}

		// Check if any sets have been completed (for accent styling)
		const hasCompletedSets = session.exercises.some(ex =>
			ex.sets.some(s => s.completed)
		);

		// Header section with resume-style card (like home screen)
		const section = this.containerEl.createDiv({ cls: 'fit-section' });
		const row = section.createDiv({ cls: 'fit-resume-row' });

		// Back button
		const backBtn = row.createEl('button', {
			cls: 'fit-back-button',
			attr: { 'aria-label': 'Back' }
		});
		setIcon(backBtn, 'arrow-left');
		backBtn.addEventListener('click', () => this.confirmExit());

		// Resume-style card with workout name and timer
		// Only accent if at least one set has been completed
		const resumeCard = row.createDiv({
			cls: `fit-program-workout-card ${hasCompletedSets ? 'fit-program-workout-current' : ''}`
		});

		// Play icon
		this.playIconEl = resumeCard.createDiv({ cls: 'fit-program-workout-play' });
		setIcon(this.playIconEl, 'play');

		// Workout name
		resumeCard.createDiv({
			cls: 'fit-program-workout-name',
			text: session.workout ?? 'Workout'
		});

		// Duration display (updated via duration.tick event)
		this.durationEl = resumeCard.createDiv({
			cls: 'fit-program-workout-time'
		});

		// Set initial display - rest time if resting, otherwise session duration
		if (this.ctx.sessionState.isRestTimerActive()) {
			const remaining = this.ctx.sessionState.getRestTimeRemaining();
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
			this.durationEl.addClass('fit-timer-rest');
		} else {
			const elapsed = this.ctx.sessionState.getElapsedDuration();
			const minutes = Math.floor(elapsed / 60);
			const seconds = elapsed % 60;
			this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}

		// Click navigates to first unfinished exercise
		resumeCard.addEventListener('click', () => {
			const firstUnfinishedIndex = this.findFirstUnfinishedExerciseIndex(session);
			if (firstUnfinishedIndex >= 0) {
				this.ctx.view.navigateTo('exercise', { exerciseIndex: firstUnfinishedIndex });
			}
		});

		// Fullscreen toggle button
		if (this.ctx.view.isInFullscreen()) {
			// Exit fullscreen button
			const exitBtn = row.createEl('button', {
				cls: 'fit-fullscreen-exit',
				attr: { 'aria-label': 'Exit fullscreen' }
			});
			exitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
			exitBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.ctx.view.exitFullscreen();
			});
		} else {
			// Enter fullscreen button
			const enterBtn = row.createEl('button', {
				cls: 'fit-fullscreen-enter',
				attr: { 'aria-label': 'Enter fullscreen' }
			});
			enterBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
			enterBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.ctx.view.enterFullscreen();
			});
		}

		// Subscribe to duration tick events
		this.subscribeToEvents();

		// Show coach feedback notice from previous session if available
		if (session.workout) {
			void this.renderFeedbackNotice(session);
		}

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
			text: 'Add exercise this session',
			variant: 'secondary',
			onClick: () => { this.showExercisePicker(); }
		});

		// Edit workout button (if workout has a name/ID)
		if (session.workout) {
			createButton(actions, {
				text: 'Edit workout',
				variant: 'ghost',
				onClick: () => {
					this.ctx.view.navigateTo('workout-editor', { workoutId: session.workout, isNew: false });
				}
			});
		}

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

	private async renderFeedbackNotice(currentSession: Session): Promise<void> {
		if (!currentSession.workout) return;

		// Get previous session for this workout to check for feedback
		const previousSession = await this.ctx.sessionRepo.getPreviousSession(
			currentSession.workout,
			currentSession.id
		);

		if (!previousSession?.coachFeedback) return;

		// Create feedback notice (insert after header section)
		const headerSection = this.containerEl.querySelector('.fit-section');
		if (!headerSection) return;

		// Create a temporary container to use Obsidian's createDiv
		const tempContainer = this.containerEl.createDiv({ cls: 'fit-feedback-notice' });
		headerSection.insertAdjacentElement('afterend', tempContainer);

		const closeBtn = tempContainer.createEl('button', {
			cls: 'fit-feedback-notice-close',
			attr: { 'aria-label': 'Dismiss feedback' }
		});
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => {
			tempContainer.remove();
		});

		tempContainer.createDiv({ cls: 'fit-feedback-notice-title', text: 'Coach Feedback' });
		tempContainer.createDiv({ cls: 'fit-feedback-notice-content', text: previousSession.coachFeedback });
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

			// Look up the exercise to get name and images - try name first, then ID (slug)
			const exerciseLower = sessionExercise.exercise.toLowerCase();
			const exerciseSlug = exerciseLower.replace(/\s+/g, '-');
			const exerciseDetails = exerciseByName.get(exerciseLower) ?? exerciseById.get(exerciseSlug);

			createExerciseCard(exerciseList, {
				exercise: sessionExercise,
				index: i,
				displayName: exerciseDetails?.name, // Use proper name from database
				image0: exerciseDetails?.image0,
				image1: exerciseDetails?.image1,
				onClick: () => this.ctx.view.navigateTo('exercise', { exerciseIndex: i }),
				draggable: true,
				onDrop: (fromIndex, toIndex) => {
					this.ctx.sessionState.reorderExercises(fromIndex, toIndex);
					this.render();
				}
			});
		}
	}

	private showExercisePicker(): void {
		// Find the exercise list container
		const exerciseList = this.containerEl.querySelector('.fit-exercise-list');
		if (!exerciseList) return;

		// Check if form already exists
		if (exerciseList.querySelector('.fit-add-exercise-form')) return;

		// Form state
		const formState = {
			exercise: '',
			targetSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 12,
			restSeconds: this.ctx.settings.defaultRestSeconds
		};

		// Create inline form card
		const formCard = exerciseList.createDiv({ cls: 'fit-add-exercise-form fit-exercise-card' });

		// Exercise name with autocomplete
		const exerciseGroup = formCard.createDiv({ cls: 'fit-form-group' });
		exerciseGroup.createEl('label', { text: 'Exercise', cls: 'fit-form-label' });
		createExerciseAutocomplete(exerciseGroup, {
			placeholder: 'Search exercises...',
			value: formState.exercise,
			getItems: () => this.ctx.exerciseRepo.list(),
			onSelect: (exercise, text) => {
				formState.exercise = text;
			},
			onChange: (text) => {
				formState.exercise = text;
			}
		});

		// Row with sets, reps, rest
		const row = formCard.createDiv({ cls: 'fit-workout-exercise-row fit-workout-exercise-row-compact' });

		// Sets input
		const setsGroup = row.createDiv({ cls: 'fit-inline-group' });
		setsGroup.createEl('label', { text: 'Sets' });
		const setsInput = setsGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '1', max: '10', value: String(formState.targetSets) }
		});
		setsInput.addEventListener('input', (e) => {
			formState.targetSets = parseInt((e.target as HTMLInputElement).value) || 3;
		});

		// Reps range inputs
		const repsGroup = row.createDiv({ cls: 'fit-inline-group' });
		repsGroup.createEl('label', { text: 'Reps' });
		const minInput = repsGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '1', max: '50', value: String(formState.targetRepsMin) }
		});
		repsGroup.createSpan({ text: '-' });
		const maxInput = repsGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '1', max: '50', value: String(formState.targetRepsMax) }
		});
		minInput.addEventListener('input', (e) => {
			formState.targetRepsMin = parseInt((e.target as HTMLInputElement).value) || 8;
		});
		maxInput.addEventListener('input', (e) => {
			formState.targetRepsMax = parseInt((e.target as HTMLInputElement).value) || 12;
		});

		// Rest input
		const restGroup = row.createDiv({ cls: 'fit-inline-group' });
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		restGroup.createEl('label', { text: 'rest' });
		const restInput = restGroup.createEl('input', {
			cls: 'fit-form-input fit-small-input',
			attr: { type: 'number', min: '0', max: '600', value: String(formState.restSeconds) }
		});
		restInput.addEventListener('input', (e) => {
			formState.restSeconds = parseInt((e.target as HTMLInputElement).value) || 120;
		});

		// Actions row
		const actions = formCard.createDiv({ cls: 'fit-add-exercise-actions' });

		const cancelBtn = actions.createEl('button', {
			cls: 'fit-button fit-button-ghost fit-button-small',
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			formCard.remove();
		});

		const addBtn = actions.createEl('button', {
			cls: 'fit-button fit-button-primary fit-button-small',
			text: 'Add'
		});
		addBtn.addEventListener('click', () => {
			if (!formState.exercise.trim()) {
				const input = exerciseGroup.querySelector('input');
				input?.focus();
				return;
			}

			this.ctx.sessionState.addExercise(formState.exercise.trim(), {
				exercise: formState.exercise.trim(),
				targetSets: formState.targetSets,
				targetRepsMin: formState.targetRepsMin,
				targetRepsMax: formState.targetRepsMax,
				restSeconds: formState.restSeconds
			});
			this.render();
		});

		// Focus the exercise input
		setTimeout(() => {
			const input = exerciseGroup.querySelector('input');
			input?.focus();
		}, 50);
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

				// Check if active program has review questions
				const reviewData = await this.getReviewQuestionsForSession();
				if (reviewData) {
					this.ctx.view.navigateTo('questionnaire', {
						sessionId: session.id,
						programId: reviewData.programId,
						questions: reviewData.questions
					});
				} else {
					this.ctx.view.navigateTo('finish', { sessionId: session.id });
				}
			} else {
				this.ctx.view.navigateTo('home');
			}
		} catch (error) {
			console.error('Failed to finish workout:', error);
			// Still navigate home on error
			this.ctx.view.navigateTo('home');
		}
	}

	private async getReviewQuestionsForSession(): Promise<{ programId: string; questions: import('../../types').Question[] } | null> {
		const settings = this.ctx.settings;
		if (!settings.activeProgram) return null;

		try {
			const program = await this.ctx.programRepo.get(settings.activeProgram);
			if (program?.questions && program.questions.length > 0) {
				return { programId: program.id, questions: program.questions };
			}
		} catch (error) {
			console.error('Failed to get review questions:', error);
		}
		return null;
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

	private subscribeToEvents(): void {
		// Unsubscribe from previous subscriptions
		this.unsubscribeFromEvents();

		const state = this.ctx.sessionState;

		// Rest timer tick - show rest countdown when active
		this.eventUnsubscribers.push(
			state.on('timer.tick', ({ remaining }) => {
				if (this.durationEl && state.isRestTimerActive()) {
					const minutes = Math.floor(remaining / 60);
					const seconds = remaining % 60;
					this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					this.durationEl.addClass('fit-timer-rest');
				}
			})
		);

		// Rest timer cancelled - switch back to session duration
		this.eventUnsubscribers.push(
			state.on('timer.cancelled', () => {
				if (this.durationEl) {
					this.durationEl.removeClass('fit-timer-rest');
				}
			})
		);

		// Duration tick - update timer display and pulse animation (only when not resting)
		this.eventUnsubscribers.push(
			state.on('duration.tick', ({ elapsed }) => {
				if (this.durationEl && !state.isRestTimerActive()) {
					const minutes = Math.floor(elapsed / 60);
					const seconds = elapsed % 60;
					this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					this.durationEl.removeClass('fit-timer-rest');
				}
				if (this.playIconEl) {
					this.playIconEl.classList.toggle('fit-pulse-tick');
				}
			})
		);
	}

	/**
	 * Finds the index of the first exercise that hasn't completed all target sets
	 * Returns -1 if all exercises are complete
	 */
	private findFirstUnfinishedExerciseIndex(session: Session): number {
		for (let i = 0; i < session.exercises.length; i++) {
			const exercise = session.exercises[i];
			if (!exercise) continue;
			const completedSets = exercise.sets.filter(s => s.completed).length;
			if (completedSets < exercise.targetSets) {
				return i;
			}
		}
		return -1;
	}

	private unsubscribeFromEvents(): void {
		for (const unsub of this.eventUnsubscribers) {
			unsub();
		}
		this.eventUnsubscribers = [];
	}

	destroy(): void {
		// Abort any in-flight async operations
		this.abortController?.abort();
		this.abortController = null;
		// Clean up file watcher
		this.unsubscribeFileWatch?.();
		this.unsubscribeFileWatch = null;
		// Clean up event subscriptions
		this.unsubscribeFromEvents();
		this.containerEl.remove();
	}
}
