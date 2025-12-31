/**
 * Session lifecycle rules
 * Pure functions for session state transitions and business rules
 */

import type { SessionStatus } from '../../types';

/**
 * Valid session status transitions
 */
const VALID_TRANSITIONS: ReadonlyArray<{ from: SessionStatus; to: SessionStatus }> = [
	{ from: 'active', to: 'paused' },
	{ from: 'active', to: 'completed' },
	{ from: 'active', to: 'discarded' },
	{ from: 'paused', to: 'active' },
	{ from: 'paused', to: 'completed' },
	{ from: 'paused', to: 'discarded' }
];

/**
 * Checks if a session status transition is valid
 */
export function isValidTransition(from: SessionStatus, to: SessionStatus): boolean {
	return VALID_TRANSITIONS.some(t => t.from === from && t.to === to);
}

/**
 * Determines if a session can be finished.
 * A session requires at least one completed set to be finished.
 */
export function canFinishSession(hasCompletedWork: boolean): boolean {
	return hasCompletedWork;
}

/**
 * Determines if a session can be discarded.
 * Only active or paused sessions can be discarded.
 */
export function canDiscardSession(status: SessionStatus): boolean {
	return status === 'active' || status === 'paused';
}

/**
 * Determines if rest timer should auto-start after completing a set.
 * Timer starts only if:
 * - Auto-start is enabled in settings
 * - The exercise is not yet complete (more sets to do)
 */
export function shouldAutoStartRestTimer(
	autoStartEnabled: boolean,
	completedSets: number,
	targetSets: number
): boolean {
	const isExerciseComplete = completedSets >= targetSets;
	return autoStartEnabled && !isExerciseComplete;
}
