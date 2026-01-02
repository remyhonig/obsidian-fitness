import { setIcon } from 'obsidian';
import type { FitView } from '../../views/fit-view';
import type { SessionStateManager } from '../../state/session-state';
import { formatTime } from './timer';

export type HeaderLeftElement = 'back' | 'barbell' | 'none';

export interface ScreenHeaderOptions {
	/** What to show on the left: back button, barbell emoji, or nothing */
	leftElement: HeaderLeftElement;
	/** Fallback workout name if no active session (e.g., for "next workout" header) */
	fallbackWorkoutName?: string;
	/** Exercise name to display in header (overrides workout name when provided) */
	exerciseName?: string;
	/** Timer value to show inline (for exercise screen) */
	timer?: { label: string; value: string };
	/** Target reps to show inline (for exercise screen) */
	targetReps?: string;
	/** Click handler for the card */
	onCardClick?: () => void;
	/** Click handler for back button (required if leftElement is 'back') */
	onBack?: () => void;
	/** Click handler for timer (e.g., to reset set timer) */
	onTimerClick?: () => void;
	/** Show set timer instead of session duration (for exercise screen) */
	showSetTimer?: boolean;
	/** Current exercise index (for set timer) */
	exerciseIndex?: number;
	/** Reference to FitView for fullscreen toggle */
	view: FitView;
	/** Reference to session state for workout name, timer events, accent, and timer visibility */
	sessionState: SessionStateManager;
}

export interface ScreenHeaderRefs {
	/** Container element */
	container: HTMLElement;
	/** Play icon element (for pulse animation) */
	playIconEl: HTMLElement | null;
	/** Duration display element (for timer updates) */
	durationEl: HTMLElement | null;
	/** Inline timer element (for exercise screen header) */
	inlineTimerEl: HTMLElement | null;
	/** Inline target element (for exercise screen header) */
	inlineTargetEl: HTMLElement | null;
	/** Unsubscribe function for event listeners */
	destroy: () => void;
}

/**
 * Creates a reusable screen header with workout card, timer, and fullscreen toggle.
 * Handles timer events automatically when sessionState is provided.
 * Card is accented when there's an active session with at least one completed set.
 */
export function createScreenHeader(
	parent: HTMLElement,
	options: ScreenHeaderOptions
): ScreenHeaderRefs {
	const section = parent.createDiv({ cls: 'fit-section' });
	const row = section.createDiv({ cls: 'fit-resume-row' });

	// Left element
	if (options.leftElement === 'back') {
		const backBtn = row.createEl('button', {
			cls: 'fit-back-button',
			attr: { 'aria-label': 'Back' }
		});
		setIcon(backBtn, 'arrow-left');
		if (options.onBack) {
			backBtn.addEventListener('click', options.onBack);
		}
	} else if (options.leftElement === 'barbell') {
		row.createDiv({ cls: 'fit-home-icon', text: '🏋️' });
	}

	// Determine state: accented and timer shown if there's an active session with completed sets
	const session = options.sessionState.getSession();
	const isWorkoutInProgress = options.sessionState.isInProgress();

	// Get workout name from session state, or use fallback
	const workoutName = session?.workout ?? options.fallbackWorkoutName ?? 'Workout';

	// Use exercise name if provided, otherwise workout name
	const displayName = options.exerciseName ?? workoutName;

	// Only use exercise header card layout if inline timer/target are provided
	const useExerciseHeaderLayout = !!options.exerciseName && (!!options.timer || !!options.targetReps);

	// Center card
	const card = row.createDiv({
		cls: `fit-program-workout-card ${isWorkoutInProgress ? 'fit-program-workout-current' : ''} ${useExerciseHeaderLayout ? 'fit-exercise-header-card' : ''}`
	});

	// Play icon (shown in standard layout)
	let playIconEl: HTMLElement | null = null;
	if (!useExerciseHeaderLayout) {
		playIconEl = card.createDiv({ cls: 'fit-program-workout-play' });
		setIcon(playIconEl, 'play');
	}

	// Exercise/Workout name
	card.createDiv({
		cls: useExerciseHeaderLayout ? 'fit-exercise-header-name' : 'fit-program-workout-name',
		text: displayName
	});

	// Inline timer and target (for exercise header layout only)
	let inlineTimerEl: HTMLElement | null = null;
	let inlineTargetEl: HTMLElement | null = null;

	if (useExerciseHeaderLayout) {
		const infoRow = card.createDiv({ cls: 'fit-exercise-header-info' });

		if (options.timer) {
			const timerWrapper = infoRow.createDiv({ cls: 'fit-exercise-header-timer' });
			if (options.onTimerClick) {
				timerWrapper.addClass('fit-exercise-header-timer-clickable');
				timerWrapper.addEventListener('click', (e) => {
					e.stopPropagation();
					options.onTimerClick?.();
				});
			}
			inlineTimerEl = timerWrapper.createSpan({ cls: 'fit-exercise-header-timer-value', text: options.timer.value });
		}

		if (options.targetReps) {
			const targetWrapper = infoRow.createDiv({ cls: 'fit-exercise-header-target' });
			targetWrapper.createSpan({ cls: 'fit-exercise-header-target-label', text: 'Target: ' });
			inlineTargetEl = targetWrapper.createSpan({ cls: 'fit-exercise-header-target-value', text: options.targetReps });
		}
	}

	// Timer - only shown when workout is in progress
	let durationEl: HTMLElement | null = null;
	let addTimeBtn: HTMLElement | null = null;
	if (isWorkoutInProgress) {
		// Wrap time and +15s button in a container for closer spacing
		const timerWrapper = card.createDiv({ cls: 'fit-timer-wrapper' });
		durationEl = timerWrapper.createDiv({ cls: 'fit-program-workout-time' });

		// Create separate "+15s" button if clickable during rest
		if (options.onTimerClick) {
			addTimeBtn = timerWrapper.createDiv({ cls: 'fit-add-time-btn' });
			addTimeBtn.textContent = '+15s';
			addTimeBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				options.onTimerClick?.();
			});
		}

		// Set initial display
		const state = options.sessionState;
		if (state.isRestTimerActive()) {
			const remaining = state.getRestTimeRemaining();
			durationEl.textContent = formatTime(remaining);
			durationEl.addClass('fit-timer-rest');
			if (addTimeBtn) addTimeBtn.style.display = 'block';
		} else if (options.showSetTimer && state.isSetTimerActive()) {
			// Show set timer when in set timer mode
			const setStartTime = state.getSetStartTime();
			const elapsed = setStartTime ? Math.floor((Date.now() - setStartTime) / 1000) : 0;
			durationEl.textContent = formatTime(elapsed);
			durationEl.addClass('fit-set-timer');
			if (addTimeBtn) addTimeBtn.style.display = 'none';
		} else {
			const elapsed = state.getElapsedDuration();
			durationEl.textContent = formatTime(elapsed);
			if (addTimeBtn) addTimeBtn.style.display = 'none';
		}
	}

	// Card click handler
	if (options.onCardClick) {
		card.addEventListener('click', options.onCardClick);
	}

	// Fullscreen toggle button
	if (options.view.isInFullscreen()) {
		const exitBtn = row.createEl('button', {
			cls: 'fit-fullscreen-exit',
			attr: { 'aria-label': 'Exit fullscreen' }
		});
		setIcon(exitBtn, 'minimize');
		exitBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			options.view.exitFullscreen();
		});
	} else {
		const enterBtn = row.createEl('button', {
			cls: 'fit-fullscreen-enter',
			attr: { 'aria-label': 'Enter fullscreen' }
		});
		setIcon(enterBtn, 'maximize');
		enterBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			options.view.enterFullscreen();
		});
	}

	// Subscribe to timer events if workout is in progress
	const eventUnsubscribers: (() => void)[] = [];

	if (isWorkoutInProgress && durationEl) {
		const state = options.sessionState;
		const timerEl = durationEl;
		const iconEl = playIconEl;
		const addTimeBtnEl = addTimeBtn;

		// Rest timer tick - show rest countdown
		eventUnsubscribers.push(
			state.on('timer.tick', ({ remaining }) => {
				if (state.isRestTimerActive()) {
					timerEl.textContent = formatTime(remaining);
					timerEl.addClass('fit-timer-rest');
					if (addTimeBtnEl) addTimeBtnEl.style.display = 'block';
				}
			})
		);

		// Rest timer cancelled - switch back to session duration styling
		eventUnsubscribers.push(
			state.on('timer.cancelled', () => {
				timerEl.removeClass('fit-timer-rest');
				if (addTimeBtnEl) addTimeBtnEl.style.display = 'none';
			})
		);

		// Duration tick - update timer display and pulse animation (only when not resting)
		eventUnsubscribers.push(
			state.on('duration.tick', ({ elapsed }) => {
				if (!state.isRestTimerActive()) {
					if (options.showSetTimer && state.isSetTimerActive()) {
						// Show set timer duration
						const setStartTime = state.getSetStartTime();
						const setElapsed = setStartTime ? Math.floor((Date.now() - setStartTime) / 1000) : 0;
						timerEl.textContent = formatTime(setElapsed);
						timerEl.addClass('fit-set-timer');
					} else {
						// Show session duration
						timerEl.textContent = formatTime(elapsed);
						timerEl.removeClass('fit-set-timer');
					}
					timerEl.removeClass('fit-timer-rest');
					if (addTimeBtnEl) addTimeBtnEl.style.display = 'none';
				}
				if (iconEl) {
					iconEl.classList.toggle('fit-pulse-tick');
				}
			})
		);

		// Set started event - update to show set timer (for showSetTimer mode)
		if (options.showSetTimer) {
			eventUnsubscribers.push(
				state.on('set.started', () => {
					timerEl.textContent = '0:00';
					timerEl.addClass('fit-set-timer');
					timerEl.removeClass('fit-timer-rest');
					if (addTimeBtnEl) addTimeBtnEl.style.display = 'none';
				})
			);
		}
	}

	// Destroy function to clean up event subscriptions
	const destroy = () => {
		for (const unsub of eventUnsubscribers) {
			unsub();
		}
	};

	return {
		container: section,
		playIconEl,
		durationEl,
		inlineTimerEl,
		inlineTargetEl,
		destroy
	};
}
