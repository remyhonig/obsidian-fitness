/**
 * Set-level metrics and utilities
 * Pure functions for working with individual sets
 */

import type { LoggedSet, SessionExercise } from '../../types';

/**
 * Formats a set for display (e.g., "80kg x 10")
 */
export function formatSetDisplay(set: LoggedSet, weightUnit = 'kg'): string {
	return `${set.weight}${weightUnit} × ${set.reps}`;
}

/**
 * Gets the last completed set for an exercise
 */
export function findLastCompletedSet(exercise: SessionExercise): LoggedSet | null {
	const completed = exercise.sets.filter(s => s.completed);
	return completed[completed.length - 1] ?? null;
}
