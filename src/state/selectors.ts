import type { Session, SessionExercise, LoggedSet } from '../types';

/**
 * Pure selector functions for deriving state from sessions.
 * These help avoid repetitive calculations across screens.
 */

// ========== Exercise Selectors ==========

/**
 * Gets the number of completed sets for an exercise
 */
export function selectCompletedSets(session: Session, index: number): number {
	return session.exercises[index]?.sets.filter(s => s.completed).length ?? 0;
}

/**
 * Checks if an exercise has reached its target sets
 */
export function selectIsExerciseComplete(session: Session, index: number): boolean {
	const exercise = session.exercises[index];
	if (!exercise) return false;
	return selectCompletedSets(session, index) >= exercise.targetSets;
}

/**
 * Gets the last completed set for an exercise
 */
export function selectLastSet(exercise: SessionExercise): LoggedSet | null {
	const completed = exercise.sets.filter(s => s.completed);
	return completed[completed.length - 1] ?? null;
}

/**
 * Gets the progress fraction for an exercise (0-1)
 */
export function selectExerciseProgress(exercise: SessionExercise): number {
	if (exercise.targetSets === 0) return 0;
	const completed = exercise.sets.filter(s => s.completed).length;
	return Math.min(completed / exercise.targetSets, 1);
}

// ========== Session Selectors ==========

/**
 * Gets total volume (weight × reps) across all exercises
 */
export function selectTotalVolume(session: Session): number {
	return session.exercises
		.flatMap(e => e.sets)
		.filter(s => s.completed)
		.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * Gets total number of completed sets in session
 */
export function selectTotalCompletedSets(session: Session): number {
	return session.exercises
		.flatMap(e => e.sets)
		.filter(s => s.completed)
		.length;
}

/**
 * Gets total number of target sets in session
 */
export function selectTotalTargetSets(session: Session): number {
	return session.exercises.reduce((sum, e) => sum + e.targetSets, 0);
}

/**
 * Gets session progress as fraction (0-1)
 */
export function selectSessionProgress(session: Session): number {
	const target = selectTotalTargetSets(session);
	if (target === 0) return 0;
	return Math.min(selectTotalCompletedSets(session) / target, 1);
}

/**
 * Checks if session has any completed work
 */
export function selectHasCompletedWork(session: Session): boolean {
	return session.exercises.some(e => e.sets.some(s => s.completed));
}

/**
 * Gets the number of completed exercises (all target sets done)
 */
export function selectCompletedExerciseCount(session: Session): number {
	return session.exercises.filter((e, i) => selectIsExerciseComplete(session, i)).length;
}

// ========== Set Selectors ==========

/**
 * Formats a set for display (e.g., "80kg × 10")
 */
export function formatSetDisplay(set: LoggedSet, weightUnit = 'kg'): string {
	return `${set.weight}${weightUnit} × ${set.reps}`;
}

/**
 * Gets the total reps for an exercise
 */
export function selectTotalReps(exercise: SessionExercise): number {
	return exercise.sets
		.filter(s => s.completed)
		.reduce((sum, s) => sum + s.reps, 0);
}

/**
 * Gets the max weight used for an exercise
 */
export function selectMaxWeight(exercise: SessionExercise): number {
	const completed = exercise.sets.filter(s => s.completed);
	if (completed.length === 0) return 0;
	return Math.max(...completed.map(s => s.weight));
}

/**
 * Gets the exercise volume (weight × reps for all sets)
 */
export function selectExerciseVolume(exercise: SessionExercise): number {
	return exercise.sets
		.filter(s => s.completed)
		.reduce((sum, s) => sum + s.weight * s.reps, 0);
}
