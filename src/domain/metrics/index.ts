/**
 * Metrics domain module
 * Re-exports all metrics functions for convenient imports
 */

export {
	calculateTotalVolume,
	countTotalCompletedSets,
	countTotalTargetSets,
	calculateSessionProgress,
	hasCompletedWork,
	countCompletedExercises
} from './session-metrics';

export {
	countCompletedSets,
	isExerciseComplete,
	calculateExerciseProgress,
	countTotalReps,
	findMaxWeight,
	calculateExerciseVolume
} from './exercise-metrics';

export {
	formatSetDisplay,
	findLastCompletedSet
} from './set-metrics';
