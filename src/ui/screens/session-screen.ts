import { setIcon } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import { BaseScreen } from './base-screen';
import type { Session, Exercise, SessionExercise } from '../../types';
import { createButton, createPrimaryAction } from '../components/button';
import { createExerciseCard } from '../components/card';
import { createExerciseAutocomplete } from '../components/autocomplete';
import { createScreenHeader } from '../components/screen-header';
import { toSlug } from '../../domain/identifier';
import { parseCoachFeedbackYaml } from '../../data/coach-feedback-parser';
import type { StructuredCoachFeedback, ExerciseFeedback } from '../../data/coach-feedback-types';
import { normalizeExerciseName } from '../../domain/feedback/normalize';
// Note: toSlug is still needed for syncSessionWithWorkout; program advancement is now in ViewModel

/**
 * Session screen - shows the active workout overview
 */
export class SessionScreen extends BaseScreen {
	private unsubscribeFileWatch: (() => void) | null = null;

	constructor(parentEl: HTMLElement, ctx: ScreenContext) {
		super(parentEl, ctx, 'fit-session-screen');

		// Subscribe to workout file changes if there's an active session
		const session = ctx.sessionState.getSession();
		if (session?.workout) {
			const workoutId = toSlug(session.workout);
			const workoutPath = `${ctx.settings.basePath}/Workouts/${workoutId}.md`;

			// Sync immediately on construction (in case workout was edited while away)
			// Only sync if session is not in progress (no completed sets)
			if (!ctx.sessionState.isInProgress()) {
				const signal = this.resetAbortController();
				void this.syncSessionWithWorkout(workoutId, signal);
			}

			// Also watch for future changes
			this.unsubscribeFileWatch = ctx.watchFile(workoutPath, () => {
				// Abort previous sync, start new one
				const signal = this.resetAbortController();
				void this.syncSessionWithWorkout(workoutId, signal);
			});
		}
	}

	/**
	 * Syncs session exercises with the workout definition
	 * Preserves logged sets while updating exercise definitions
	 */
	private syncSessionWithWorkout(workoutId: string, signal: AbortSignal): void {
		// Get inline workout from active program
		const activeProgram = this.ctx.settings.activeProgram;
		const workout = activeProgram
			? this.ctx.programRepo.getInlineWorkout(activeProgram, workoutId)
			: null;

		if (signal.aborted || !workout) return;

		const session = this.ctx.sessionState.getSession();
		if (signal.aborted || !session) return;

		// Build a map of existing exercises by their ID for preserving logged sets
		const existingSets = new Map<string, typeof session.exercises[0]['sets']>();
		for (const ex of session.exercises) {
			const exId = toSlug(ex.exercise);
			existingSets.set(exId, ex.sets);
		}

		// Update session exercises from workout, preserving logged sets where possible
		const updatedExercises = workout.exercises.map(we => {
			const exerciseId = we.exerciseId ?? toSlug(we.exercise);
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
		this.prepareRender();

		const session = this.ctx.sessionState.getSession();
		if (!session) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'No active workout'
			});
			return;
		}

		// Header with resume-style card - show set timer when a set is in progress
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			showSetTimer: this.ctx.sessionState.isSetTimerActive(),
			onBack: () => this.confirmExit(),
			onCardClick: () => {
				const firstUnfinishedIndex = this.findFirstUnfinishedExerciseIndex(session);
				if (firstUnfinishedIndex >= 0) {
					this.ctx.view.navigateTo('exercise', { exerciseIndex: firstUnfinishedIndex });
				}
			}
		});

		// Scrollable content area (header stays fixed, content scrolls)
		const scrollContent = this.containerEl.createDiv({ cls: 'fit-session-scroll-content' });

		// Exercise list container
		const exerciseList = scrollContent.createDiv({ cls: 'fit-exercise-list' });

		if (session.exercises.length === 0) {
			exerciseList.createDiv({
				cls: 'fit-empty-state',
				text: 'No exercises yet. Add your first exercise!'
			});
		} else {
			// Render general coaching tips and exercise cards with data from previous session
			void this.renderExerciseListWithCoachingData(session, exerciseList);
		}

		// Bottom actions
		const actions = scrollContent.createDiv({ cls: 'fit-bottom-actions' });

		createButton(actions, {
			text: 'Add exercise this session',
			variant: 'secondary',
			onClick: () => { this.showExercisePicker(); }
		});

		// Edit workout button
		// - When not in progress: edit the workout template (changes sync to session)
		// - When in progress: edit session exercises only (doesn't modify template)
		if (session.workout) {
			const isInProgress = this.ctx.sessionState.isInProgress();
			createButton(actions, {
				text: isInProgress ? 'Edit exercises' : 'Edit workout',
				variant: 'ghost',
				onClick: () => {
					this.ctx.view.navigateTo('workout-editor', {
						workoutId: session.workout,
						isNew: false,
						editSession: isInProgress
					});
				}
			});
		}

		// Show Finish workout button only when session is in progress (at least one set completed)
		// No cancel button needed when session hasn't started - user can just navigate away
		if (this.ctx.sessionState.isInProgress()) {
			createPrimaryAction(actions, 'Finish workout', () => {
				void this.finishWorkout();
			});
		}

	}

	/**
	 * Renders the exercise list with coaching data from previous session
	 */
	private async renderExerciseListWithCoachingData(session: Session, exerciseList: HTMLElement): Promise<void> {
		// Get previous session data and coach feedback
		let previousSession: Session | null = null;
		let coachFeedback: StructuredCoachFeedback | null = null;

		if (session.workout) {
			previousSession = await this.ctx.sessionRepo.getPreviousSession(session.workout, session.id);
			if (previousSession?.coachFeedback) {
				coachFeedback = parseCoachFeedbackYaml(previousSession.coachFeedback);
			}
		}

		// Render general coaching tips at the top (if any)
		if (coachFeedback?.gymfloor_acties && coachFeedback.gymfloor_acties.length > 0) {
			this.renderGeneralCoachingTips(exerciseList, coachFeedback.gymfloor_acties);
		}

		// Build maps for previous exercise data and feedback by normalized name
		const previousExerciseMap = new Map<string, SessionExercise>();
		const feedbackMap = new Map<string, ExerciseFeedback>();

		if (previousSession) {
			for (const ex of previousSession.exercises) {
				previousExerciseMap.set(normalizeExerciseName(ex.exercise), ex);
			}
		}

		if (coachFeedback?.analyse_en_context) {
			for (const feedback of coachFeedback.analyse_en_context) {
				feedbackMap.set(normalizeExerciseName(feedback.oefening), feedback);
			}
		}

		// Render exercise cards
		await this.renderExerciseCards(session, exerciseList, previousExerciseMap, feedbackMap);
	}

	/**
	 * Renders general coaching tips section at the top of the exercise list
	 */
	private renderGeneralCoachingTips(parent: HTMLElement, tips: { actie: string }[]): void {
		const container = parent.createDiv({ cls: 'fit-general-coaching-tips' });

		const header = container.createDiv({ cls: 'fit-general-coaching-tips-header' });
		const iconEl = header.createDiv({ cls: 'fit-general-coaching-tips-icon' });
		setIcon(iconEl, 'lightbulb');
		header.createDiv({ cls: 'fit-general-coaching-tips-title', text: 'Training tips' });

		const content = container.createDiv({ cls: 'fit-general-coaching-tips-content' });
		for (const tip of tips) {
			content.createDiv({ cls: 'fit-general-coaching-tips-item', text: tip.actie });
		}
	}

	private async renderExerciseCards(
		session: Session,
		exerciseList: HTMLElement,
		previousExerciseMap: Map<string, SessionExercise>,
		feedbackMap: Map<string, ExerciseFeedback>
	): Promise<void> {
		// Build maps for exercise lookup by both name and ID (slug)
		const exerciseByName = new Map<string, Exercise>();
		const exerciseById = new Map<string, Exercise>();
		const exercises = await this.ctx.exerciseRepo.list();
		for (const ex of exercises) {
			exerciseByName.set(ex.name.toLowerCase(), ex);
			exerciseById.set(ex.id.toLowerCase(), ex);
		}

		// Separate exercises into pending and completed, preserving original indices
		const pending: { sessionExercise: typeof session.exercises[0]; originalIndex: number }[] = [];
		const completed: { sessionExercise: typeof session.exercises[0]; originalIndex: number }[] = [];

		for (let i = 0; i < session.exercises.length; i++) {
			const sessionExercise = session.exercises[i];
			if (!sessionExercise) continue;

			const completedSets = sessionExercise.sets.filter(s => s.completed).length;
			const isComplete = completedSets >= sessionExercise.targetSets;

			if (isComplete) {
				completed.push({ sessionExercise, originalIndex: i });
			} else {
				pending.push({ sessionExercise, originalIndex: i });
			}
		}

		// Render pending exercises first, then completed ones at the bottom
		const sortedExercises = [...pending, ...completed];
		const weightUnit = this.ctx.settings.weightUnit;

		// Track if we've found the first incomplete exercise (for auto-expand)
		let isFirstIncomplete = true;

		for (const { sessionExercise, originalIndex } of sortedExercises) {
			// Look up the exercise to get name and images - try name first, then ID (slug)
			const exerciseLower = sessionExercise.exercise.toLowerCase();
			const exerciseSlug = exerciseLower.replace(/\s+/g, '-');
			const exerciseDetails = exerciseByName.get(exerciseLower) ?? exerciseById.get(exerciseSlug);

			// Get previous session data and feedback for this exercise
			const normalizedName = normalizeExerciseName(sessionExercise.exercise);
			const previousExercise = previousExerciseMap.get(normalizedName);
			const feedback = feedbackMap.get(normalizedName);

			// Check if this is an incomplete exercise
			const completedSetsCount = sessionExercise.sets.filter(s => s.completed).length;
			const isIncomplete = completedSetsCount < sessionExercise.targetSets;

			// Auto-expand the first incomplete exercise
			const autoExpand = isIncomplete && isFirstIncomplete;
			if (autoExpand) {
				isFirstIncomplete = false;
			}

			createExerciseCard(exerciseList, {
				exercise: sessionExercise,
				index: originalIndex,
				displayName: exerciseDetails?.name, // Use proper name from database
				image0: exerciseDetails?.image0,
				image1: exerciseDetails?.image1,
				onClick: () => this.ctx.view.navigateTo('exercise', { exerciseIndex: originalIndex }),
				draggable: true,
				onDrop: (fromIndex, toIndex) => {
					this.ctx.viewModel.reorderExercises(fromIndex, toIndex);
					this.render();
				},
				previousExercise,
				feedback,
				weightUnit,
				autoExpand
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

			this.ctx.viewModel.addExercise(formState.exercise.trim(), {
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
		await this.ctx.viewModel.discardWorkout();
		this.ctx.view.navigateTo('home');
	}

	private async finishWorkout(): Promise<void> {
		try {
			// ViewModel handles finishing session and advancing program
			const session = await this.ctx.viewModel.finishWorkout();
			if (session) {
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

	destroy(): void {
		// Clean up file watcher
		this.unsubscribeFileWatch?.();
		this.unsubscribeFileWatch = null;
		super.destroy();
	}
}
