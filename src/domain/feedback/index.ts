/**
 * Feedback domain module
 * Re-exports all feedback functions for convenient imports
 */

export {
	normalizeExerciseName,
	exerciseNamesMatch,
	findMatchingName
} from './normalize';

export {
	type ExerciseValidationResult,
	type FeedbackValidationStatus,
	validateExerciseNames,
	allExercisesMatched
} from './validation';
