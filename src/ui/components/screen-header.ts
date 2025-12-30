import { setIcon } from 'obsidian';
import type { FitView } from '../../views/fit-view';
import type { SessionStateManager } from '../../state/session-state';

export type HeaderLeftElement = 'back' | 'barbell' | 'none';

export interface ScreenHeaderOptions {
	/** What to show on the left: back button, barbell emoji, or nothing */
	leftElement: HeaderLeftElement;
	/** Fallback workout name if no active session (e.g., for "next workout" header) */
	fallbackWorkoutName?: string;
	/** Click handler for the card */
	onCardClick?: () => void;
	/** Click handler for back button (required if leftElement is 'back') */
	onBack?: () => void;
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

	// Center card
	const card = row.createDiv({
		cls: `fit-program-workout-card ${isWorkoutInProgress ? 'fit-program-workout-current' : ''}`
	});

	// Play icon
	const playIconEl = card.createDiv({ cls: 'fit-program-workout-play' });
	setIcon(playIconEl, 'play');

	// Workout name
	card.createDiv({
		cls: 'fit-program-workout-name',
		text: workoutName
	});

	// Timer - only shown when workout is in progress
	let durationEl: HTMLElement | null = null;
	if (isWorkoutInProgress) {
		durationEl = card.createDiv({ cls: 'fit-program-workout-time' });

		// Set initial display
		const state = options.sessionState;
		if (state.isRestTimerActive()) {
			const remaining = state.getRestTimeRemaining();
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
			durationEl.addClass('fit-timer-rest');
		} else {
			const elapsed = state.getElapsedDuration();
			const minutes = Math.floor(elapsed / 60);
			const seconds = elapsed % 60;
			durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

		// Rest timer tick - show rest countdown
		eventUnsubscribers.push(
			state.on('timer.tick', ({ remaining }) => {
				if (state.isRestTimerActive()) {
					const minutes = Math.floor(remaining / 60);
					const seconds = remaining % 60;
					timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					timerEl.addClass('fit-timer-rest');
				}
			})
		);

		// Rest timer cancelled - switch back to session duration styling
		eventUnsubscribers.push(
			state.on('timer.cancelled', () => {
				timerEl.removeClass('fit-timer-rest');
			})
		);

		// Duration tick - update timer display and pulse animation (only when not resting)
		eventUnsubscribers.push(
			state.on('duration.tick', ({ elapsed }) => {
				if (!state.isRestTimerActive()) {
					const minutes = Math.floor(elapsed / 60);
					const seconds = elapsed % 60;
					timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					timerEl.removeClass('fit-timer-rest');
				}
				iconEl.classList.toggle('fit-pulse-tick');
			})
		);
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
		destroy
	};
}
