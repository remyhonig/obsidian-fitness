/**
 * Feedback validation utilities
 * Pure functions for validating exercise feedback against session data
 */

import { normalizeExerciseName } from './normalize';

/**
 * Result of validating a single exercise name in feedback
 */
export interface ExerciseValidationResult {
	exerciseName: string;
	matched: boolean;
	sessionExerciseName?: string;
}

/**
 * Overall feedback validation status
 */
export interface FeedbackValidationStatus {
	isValid: boolean;
	hasGymfloorActies: boolean;
	gymfloorActiesCount: number;
	hasExerciseFeedback: boolean;
	exerciseValidations: ExerciseValidationResult[];
	hasMotivation: boolean;
	parseError?: string;
}

/**
 * Validates feedback exercise names against session exercise names.
 * Returns detailed validation results for each exercise.
 */
export function validateExerciseNames(
	feedbackExerciseNames: string[],
	sessionExerciseNames: string[]
): ExerciseValidationResult[] {
	const normalizedSessionNames = sessionExerciseNames.map(normalizeExerciseName);

	return feedbackExerciseNames.map(feedbackName => {
		const normalizedFeedbackName = normalizeExerciseName(feedbackName);
		const matchIndex = normalizedSessionNames.findIndex(
			sessionName => sessionName === normalizedFeedbackName
		);

		return {
			exerciseName: feedbackName,
			matched: matchIndex !== -1,
			sessionExerciseName: matchIndex !== -1 ? sessionExerciseNames[matchIndex] : undefined,
		};
	});
}

/**
 * Checks if all exercise validations matched
 */
export function allExercisesMatched(validations: ExerciseValidationResult[]): boolean {
	return validations.every(v => v.matched);
}
