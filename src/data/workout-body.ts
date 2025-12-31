/**
 * Workout file body parsing and creation utilities
 */

import { parseMarkdownTable, createMarkdownTable } from './table-utils';
import { toSlug } from '../domain/identifier';
import {
	isWikiLink,
	extractExerciseId,
	extractWikiLinkName
} from '../domain/reference';

// Re-export for backward compatibility
export { isWikiLink, extractExerciseId, extractWikiLinkName };

export interface WorkoutExerciseRow {
	exercise: string;
	exerciseId?: string; // Slug/ID for the exercise (used for lookups)
	sets: number;
	repsMin: number;
	repsMax: number;
	restSeconds: number;
	source?: 'database' | 'custom'; // If provided, affects formatting
}

/**
 * Parses workout exercise table from body
 * Returns exercise name and ID (for looking up exercise source)
 */
export function parseWorkoutBody(body: string): WorkoutExerciseRow[] {
	// Find the exercises table
	const tableMatch = body.match(/\|[^\n]+\|\n\|[-|\s]+\|\n((?:\|[^\n]+\|\n?)+)/);
	if (!tableMatch) return [];

	const fullTable = tableMatch[0];
	const rows = parseMarkdownTable(fullTable);

	return rows.map(row => {
		const repsStr = row['Reps'] ?? row['reps'] ?? '8-12';
		const [minStr, maxStr] = repsStr.includes('-') ? repsStr.split('-') : [repsStr, repsStr];

		// Extract exercise name and ID from wiki-link or plain text
		const rawExercise = row['Exercise'] ?? row['exercise'] ?? '';
		const exercise = extractWikiLinkName(rawExercise);
		const exerciseId = extractExerciseId(rawExercise);
		// Determine source based on format: wikilinks are custom, plain text is database
		const source: 'database' | 'custom' | undefined = isWikiLink(rawExercise) ? 'custom' : 'database';

		return {
			exercise,
			exerciseId,
			sets: parseInt(row['Sets'] ?? row['sets'] ?? '3', 10),
			repsMin: parseInt(minStr ?? '8', 10),
			repsMax: parseInt(maxStr ?? '12', 10),
			restSeconds: parseInt((row['Rest'] ?? row['rest'] ?? '120').replace('s', ''), 10),
			source
		};
	}).filter(e => e.exercise.length > 0);
}

/**
 * Creates workout body with exercise table
 * - Custom exercises: wiki-links [[filename]] for Obsidian navigation (only if file exists)
 * - Database exercises: plain text ID (no wikilink, since no file exists)
 * - Default to plain text if source is unknown
 */
export function createWorkoutBody(exercises: WorkoutExerciseRow[]): string {
	if (exercises.length === 0) return '';

	const columns = [
		{ key: 'exercise', header: 'Exercise' },
		{ key: 'sets', header: 'Sets' },
		{ key: 'reps', header: 'Reps' },
		{ key: 'rest', header: 'Rest' }
	];

	const rows = exercises.map(e => {
		const slug = e.exerciseId ?? toSlug(e.exercise);
		// Only use wikilink for explicitly custom exercises (files that exist)
		// Default to plain text for database exercises or unknown source
		const exerciseRef = e.source === 'custom' ? `[[${slug}]]` : slug;
		return {
			exercise: exerciseRef,
			sets: String(e.sets),
			reps: e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}-${e.repsMax}`,
			rest: `${e.restSeconds}s`
		};
	});

	return `\n## Exercises\n\n${createMarkdownTable(columns, rows)}\n`;
}
