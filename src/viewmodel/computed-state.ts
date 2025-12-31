import type { Session, SessionExercise } from '../types';
import type { ExerciseCompletionStatus, FitViewState } from './fit-viewmodel.types';
import {
	calculateSessionProgress,
	countTotalCompletedSets,
	countTotalTargetSets,
	calculateTotalVolume,
	hasCompletedWork
} from '../domain/metrics';
import { countCompletedSets, isExerciseComplete } from '../domain/metrics';

/**
 * Compute exercise completion status from session and exercise index
 */
export function computeExerciseCompletion(
	session: Session | null,
	exerciseIndex: number
): ExerciseCompletionStatus {
	if (!session || exerciseIndex < 0 || exerciseIndex >= session.exercises.length) {
		return {
			completedSets: 0,
			targetSets: 0,
			isComplete: false,
			allExercisesComplete: false
		};
	}

	const exercise = session.exercises[exerciseIndex];
	if (!exercise) {
		return {
			completedSets: 0,
			targetSets: 0,
			isComplete: false,
			allExercisesComplete: false
		};
	}

	const completedSets = countCompletedSets(session, exerciseIndex);
	const isComplete = isExerciseComplete(session, exerciseIndex);
	const allExercisesComplete = session.exercises.every((_, i) => isExerciseComplete(session, i));

	return {
		completedSets,
		targetSets: exercise.targetSets,
		isComplete,
		allExercisesComplete
	};
}

/**
 * Get current exercise from session by index
 */
export function getCurrentExercise(
	session: Session | null,
	exerciseIndex: number
): SessionExercise | null {
	if (!session || exerciseIndex < 0 || exerciseIndex >= session.exercises.length) {
		return null;
	}
	return session.exercises[exerciseIndex] ?? null;
}

/**
 * Compute full view state from raw state values
 */
export function computeViewState(params: {
	session: Session | null;
	hasActiveSession: boolean;
	currentExerciseIndex: number;
	restTimer: { remaining: number; duration: number; exerciseIndex: number } | null;
	setTimerActive: boolean;
	elapsedDuration: number;
	weight: number;
	reps: number;
}): FitViewState {
	const {
		session,
		hasActiveSession,
		currentExerciseIndex,
		restTimer,
		setTimerActive,
		elapsedDuration,
		weight,
		reps
	} = params;

	const currentExercise = getCurrentExercise(session, currentExerciseIndex);
	const exerciseCompletion = computeExerciseCompletion(session, currentExerciseIndex);

	return {
		// Session state
		hasActiveSession,
		isInProgress: session ? hasCompletedWork(session) : false,
		session,

		// Current exercise context
		currentExerciseIndex,
		currentExercise,
		exerciseCompletion,

		// Timer state
		restTimer,
		setTimerActive,
		elapsedDuration,

		// Session metrics
		sessionProgress: session ? calculateSessionProgress(session) : 0,
		totalCompletedSets: session ? countTotalCompletedSets(session) : 0,
		totalTargetSets: session ? countTotalTargetSets(session) : 0,
		totalVolume: session ? calculateTotalVolume(session) : 0,

		// Form state
		weight,
		reps
	};
}

/**
 * Get default weight for an exercise from last set or exercise defaults
 */
export function getDefaultWeight(exercise: SessionExercise | null): number {
	if (!exercise) return 0;

	// Check last completed set
	const completedSets = exercise.sets.filter(s => s.completed);
	if (completedSets.length > 0) {
		const lastSet = completedSets[completedSets.length - 1];
		return lastSet?.weight ?? 0;
	}

	return 0;
}

/**
 * Get default reps for an exercise from last set or target
 */
export function getDefaultReps(exercise: SessionExercise | null): number {
	if (!exercise) return 8;

	// Check last completed set
	const completedSets = exercise.sets.filter(s => s.completed);
	if (completedSets.length > 0) {
		const lastSet = completedSets[completedSets.length - 1];
		return lastSet?.reps ?? exercise.targetRepsMin;
	}

	// Default to target min
	return exercise.targetRepsMin;
}
