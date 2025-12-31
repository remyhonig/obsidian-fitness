/**
 * Exercise source determination utilities
 * Pure functions for determining exercise origin and reference format
 */

import type { ExerciseSource } from '../../types';

/**
 * Determines the exercise source based on whether it exists in the database.
 * Database exercises are read-only, custom exercises are editable.
 */
export function determineExerciseSource(existsInDatabase: boolean): ExerciseSource {
	return existsInDatabase ? 'database' : 'custom';
}

/**
 * Determines if an exercise reference should use a wiki-link format.
 * Custom exercises use wiki-links (they have corresponding files),
 * Database exercises use plain text IDs (no file exists).
 */
export function shouldUseWikiLink(source: ExerciseSource): boolean {
	return source === 'custom';
}
