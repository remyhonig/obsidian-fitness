/**
 * Session and exercise completion utilities
 * Pure functions for determining completion status
 */

import type { Session } from '../../types';

/**
 * Finds the index of the first exercise that hasn't completed all target sets.
 * Returns -1 if all exercises are complete.
 */
export function findFirstUnfinishedExerciseIndex(session: Session): number {
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

/**
 * Checks if all exercises in a session have completed their target sets.
 */
export function isSessionFullyComplete(session: Session): boolean {
	return findFirstUnfinishedExerciseIndex(session) === -1 && session.exercises.length > 0;
}
