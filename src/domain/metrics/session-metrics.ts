/**
 * Session-level metrics calculations
 * Pure functions for calculating aggregate session statistics
 */

import type { Session } from '../../types';

/**
 * Gets total volume (weight x reps) across all completed sets in a session
 */
export function calculateTotalVolume(session: Session): number {
	return session.exercises
		.flatMap(e => e.sets)
		.filter(s => s.completed)
		.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * Gets total number of completed sets in a session
 */
export function countTotalCompletedSets(session: Session): number {
	return session.exercises
		.flatMap(e => e.sets)
		.filter(s => s.completed)
		.length;
}

/**
 * Gets total number of target sets in a session
 */
export function countTotalTargetSets(session: Session): number {
	return session.exercises.reduce((sum, e) => sum + e.targetSets, 0);
}

/**
 * Gets session progress as a fraction (0-1)
 */
export function calculateSessionProgress(session: Session): number {
	const target = countTotalTargetSets(session);
	if (target === 0) return 0;
	return Math.min(countTotalCompletedSets(session) / target, 1);
}

/**
 * Checks if session has any completed work (at least one completed set)
 */
export function hasCompletedWork(session: Session): boolean {
	return session.exercises.some(e => e.sets.some(s => s.completed));
}

/**
 * Gets the number of fully completed exercises (all target sets done)
 */
export function countCompletedExercises(session: Session): number {
	return session.exercises.filter((e, i) => {
		const completed = session.exercises[i]?.sets.filter(s => s.completed).length ?? 0;
		return completed >= e.targetSets;
	}).length;
}
