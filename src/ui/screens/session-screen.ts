import { setIcon, type EventRef } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { Session, Exercise } from '../../types';
import { createBackButton, createButton, createPrimaryAction } from '../components/button';
import { createExerciseCard } from '../components/card';
import { createExerciseAutocomplete } from '../components/autocomplete';
import { toFilename } from '../../data/file-utils';

/**
 * Session screen - shows the active workout overview
 */
export class SessionScreen implements Screen {
	private containerEl: HTMLElement;
	private fileChangeRef: EventRef | null = null;
	private initialSyncDone = false;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-session-screen' });
		this.registerFileChangeListener();
	}

	/**
	 * Registers a listener for workout file modifications
	 */
	private registerFileChangeListener(): void {
		this.fileChangeRef = this.ctx.plugin.app.vault.on('modify', (file) => {
			const session = this.ctx.sessionState.getSession();
			if (!session?.workout) return;

			// Check if the modified file is our workout file
			const workoutId = toFilename(session.workout);
			const expectedPath = `${this.ctx.plugin.settings.basePath}/Workouts/${workoutId}.md`;
			if (file.path === expectedPath) {
				// Reload workout and sync session exercises
				void this.syncSessionWithWorkout(workoutId);
			}
		});
	}

	/**
	 * Syncs session exercises with the workout file
	 * Preserves logged sets while updating exercise definitions
	 * @param skipRender - If true, don't call render() after syncing (used when called from render)
	 */
	private async syncSessionWithWorkout(workoutId: string, skipRender = false): Promise<void> {
		const workout = await this.ctx.workoutRepo.get(workoutId);
		if (!workout) return;

		const session = this.ctx.sessionState.getSession();
		if (!session) return;

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

		// Update session state
		this.ctx.sessionState.updateExercises(updatedExercises);
		if (!skipRender) {
			this.render();
		}
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

		// Sync with workout file on initial render to pick up any changes
		// made while the session screen was not active (e.g., from workout editor)
		if (!this.initialSyncDone && session.workout) {
			this.initialSyncDone = true;
			const workoutId = toFilename(session.workout);
			// Pass skipRender=true since we're already rendering, then re-render after sync
			void this.syncSessionWithWorkout(workoutId, true).then(() => this.render());
			return; // Wait for sync to complete before rendering
		}

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.confirmExit());

		const titleContainer = header.createDiv({ cls: 'fit-header-title' });
		titleContainer.createEl('h1', {
			text: session.workout ?? 'Workout',
			cls: 'fit-title'
		});

		// Edit workout button (if workout has a name/ID)
		if (session.workout) {
			const editBtn = header.createEl('button', {
				cls: 'fit-button fit-button-ghost fit-button-icon-only',
				attr: { 'aria-label': 'Edit workout' }
			});
			setIcon(editBtn, 'pencil');
			editBtn.addEventListener('click', () => {
				// Pass workout name - editor will look it up
				this.ctx.view.navigateTo('workout-editor', { workoutId: session.workout, isNew: false });
			});
		}

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

		// Create feedback notice (insert after header)
		const header = this.containerEl.querySelector('.fit-header');
		if (!header) return;

		// Create a temporary container to use Obsidian's createDiv
		const tempContainer = this.containerEl.createDiv({ cls: 'fit-feedback-notice' });
		header.insertAdjacentElement('afterend', tempContainer);

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
			restSeconds: this.ctx.plugin.settings.defaultRestSeconds
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
		const row = formCard.createDiv({ cls: 'fit-workout-exercise-row' });
		row.style.padding = '0';
		row.style.background = 'none';

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
		restGroup.createEl('label', { text: 'Rest' });
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
		const settings = this.ctx.plugin.settings;
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
		// Clean up file change listener
		if (this.fileChangeRef) {
			this.ctx.plugin.app.vault.offref(this.fileChangeRef);
			this.fileChangeRef = null;
		}
		this.containerEl.remove();
	}
}
