/**
 * Exercise name normalization utilities
 * Pure functions for comparing exercise names across different formats
 */

/**
 * Normalizes an exercise name for comparison.
 * Strips all non-alphanumeric characters (spaces, dashes, symbols) and lowercases.
 * This allows "Easy Bar Curl", "easy-bar-curl", "EASY BAR CURL" to all match.
 */
export function normalizeExerciseName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Compares two exercise names for equality (case-insensitive, ignoring punctuation)
 */
export function exerciseNamesMatch(name1: string, name2: string): boolean {
	return normalizeExerciseName(name1) === normalizeExerciseName(name2);
}

/**
 * Finds the first matching name in a list of candidates
 */
export function findMatchingName(
	targetName: string,
	candidates: string[]
): string | undefined {
	const normalizedTarget = normalizeExerciseName(targetName);
	return candidates.find(
		candidate => normalizeExerciseName(candidate) === normalizedTarget
	);
}
