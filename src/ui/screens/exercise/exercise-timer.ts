/**
 * Timer display logic for exercise screen
 */

import type { SessionStateManager } from '../../../state/session-state';
import { formatTime } from '../../components/timer';

export interface TimerDisplayRefs {
	labelEl: HTMLElement;
	valueEl: HTMLElement;
}

/**
 * Updates the timer display based on current state
 */
export function updateTimerDisplay(
	refs: TimerDisplayRefs | null,
	sessionState: SessionStateManager
): void {
	if (!refs?.valueEl) return;

	if (sessionState.isRestTimerActive()) {
		const remaining = sessionState.getRestTimeRemaining();
		updateRestTimerDisplay(refs, remaining);
	} else if (sessionState.isSetTimerActive()) {
		updateSetDurationDisplay(refs, sessionState);
	} else {
		const elapsed = sessionState.getElapsedDuration();
		updateSessionDurationDisplay(refs, elapsed);
	}
}

/**
 * Updates display for rest timer countdown
 */
export function updateRestTimerDisplay(
	refs: TimerDisplayRefs | null,
	remaining: number
): void {
	if (!refs?.valueEl) return;

	if (refs.labelEl) {
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		refs.labelEl.textContent = 'rest';
	}

	refs.valueEl.textContent = formatTime(remaining);
	refs.valueEl.addClass('fit-timer-active');
	refs.valueEl.removeClass('fit-set-timer');
}

/**
 * Updates display for set duration (time since mark start)
 */
export function updateSetDurationDisplay(
	refs: TimerDisplayRefs | null,
	sessionState: SessionStateManager
): void {
	if (!refs?.valueEl) return;

	if (refs.labelEl) {
		refs.labelEl.textContent = 'Set';
	}

	const startTime = sessionState.getSetStartTime();
	const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

	refs.valueEl.textContent = formatTime(elapsed);
	refs.valueEl.removeClass('fit-timer-active');
	refs.valueEl.addClass('fit-set-timer');
}

/**
 * Updates display for session duration
 */
export function updateSessionDurationDisplay(
	refs: TimerDisplayRefs | null,
	elapsed: number
): void {
	if (!refs?.valueEl) return;

	if (refs.labelEl) {
		refs.labelEl.textContent = 'Session';
	}

	refs.valueEl.removeClass('fit-timer-active');
	refs.valueEl.removeClass('fit-set-timer');

	const minutes = Math.floor(elapsed / 60);
	const seconds = elapsed % 60;

	// Render with styled units (m and s smaller and grayer)
	refs.valueEl.empty();
	refs.valueEl.createSpan({ text: String(minutes) });
	refs.valueEl.createSpan({ cls: 'fit-duration-unit', text: 'm' });
	refs.valueEl.createSpan({ text: seconds.toString().padStart(2, '0') });
	refs.valueEl.createSpan({ cls: 'fit-duration-unit', text: 's' });
}
