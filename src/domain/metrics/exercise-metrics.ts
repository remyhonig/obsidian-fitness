/**
 * Exercise-level metrics calculations
 * Pure functions for calculating individual exercise statistics
 */

import type { Session, SessionExercise } from '../../types';

/**
 * Gets the number of completed sets for an exercise at a given index
 */
export function countCompletedSets(session: Session, index: number): number {
	return session.exercises[index]?.sets.filter(s => s.completed).length ?? 0;
}

/**
 * Checks if an exercise has reached its target sets
 */
export function isExerciseComplete(session: Session, index: number): boolean {
	const exercise = session.exercises[index];
	if (!exercise) return false;
	return countCompletedSets(session, index) >= exercise.targetSets;
}

/**
 * Gets the progress fraction for an exercise (0-1)
 */
export function calculateExerciseProgress(exercise: SessionExercise): number {
	if (exercise.targetSets === 0) return 0;
	const completed = exercise.sets.filter(s => s.completed).length;
	return Math.min(completed / exercise.targetSets, 1);
}

/**
 * Gets the total reps for an exercise (completed sets only)
 */
export function countTotalReps(exercise: SessionExercise): number {
	return exercise.sets
		.filter(s => s.completed)
		.reduce((sum, s) => sum + s.reps, 0);
}

/**
 * Gets the max weight used for an exercise (completed sets only)
 */
export function findMaxWeight(exercise: SessionExercise): number {
	const completed = exercise.sets.filter(s => s.completed);
	if (completed.length === 0) return 0;
	return Math.max(...completed.map(s => s.weight));
}

/**
 * Gets the exercise volume (weight x reps for all completed sets)
 */
export function calculateExerciseVolume(exercise: SessionExercise): number {
	return exercise.sets
		.filter(s => s.completed)
		.reduce((sum, s) => sum + s.weight * s.reps, 0);
}
