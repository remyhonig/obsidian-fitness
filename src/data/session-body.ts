/**
 * Session file body parsing and creation utilities
 */

import { parseMarkdownTable, createMarkdownTable } from './table-utils';
import { extractWikiLinkName } from './workout-body';

export interface SessionSetRow {
	setNumber: number;
	weight: number;
	reps: number;
	rpe?: number;
	timestamp: string;
	completed: boolean;
	actualRestSeconds?: number;
	extraRestSeconds?: number;
	avgRepDuration?: number;
}

export interface SessionExerciseBlock {
	exercise: string;
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	restSeconds: number;
	sets: SessionSetRow[];
	muscleEngagement?: string; // 'yes-clearly' | 'moderately' | 'not-really'
}

/**
 * Parses session body into exercise blocks with sets
 */
export function parseSessionBody(body: string): SessionExerciseBlock[] {
	const exercises: SessionExerciseBlock[] = [];

	// Extract only the Exercises section (stop at any other H1 section)
	let exercisesSection = body;
	const exercisesMatch = body.match(/# Exercises\s*([\s\S]*?)(?=# Previous|# Review|# Coach Feedback|$)/i);
	if (exercisesMatch) {
		exercisesSection = exercisesMatch[1] ?? '';
	}

	// Split by exercise headers (## Exercise Name)
	const exerciseBlocks = exercisesSection.split(/(?=^## )/m).filter(block => block.trim());

	for (const block of exerciseBlocks) {
		// Parse exercise header (may be wikilink like ## [[exercise-slug]])
		const headerMatch = block.match(/^## (.+)$/m);
		if (!headerMatch) continue;

		const rawExerciseName = headerMatch[1]?.trim() ?? '';
		if (!rawExerciseName) continue;

		// Extract exercise name from wikilink if present
		const exerciseName = extractWikiLinkName(rawExerciseName);

		// Parse target line: "Target: 4 × 6-8 | Rest: 180s"
		const targetMatch = block.match(/Target:\s*(\d+)\s*[×x]\s*(\d+)(?:-(\d+))?\s*\|\s*Rest:\s*(\d+)s?/i);
		const targetSets = parseInt(targetMatch?.[1] ?? '3', 10);
		const targetRepsMin = parseInt(targetMatch?.[2] ?? '8', 10);
		const targetRepsMax = parseInt(targetMatch?.[3] ?? targetMatch?.[2] ?? '12', 10);
		const restSeconds = parseInt(targetMatch?.[4] ?? '120', 10);

		// Parse sets table
		const tableMatch = block.match(/\|[^\n]+\|\n\|[-|\s]+\|\n((?:\|[^\n]+\|\n?)*)/);
		const sets: SessionSetRow[] = [];

		if (tableMatch) {
			const tableRows = parseMarkdownTable(tableMatch[0]);
			for (const row of tableRows) {
				const setNum = parseInt(row['#'] ?? row['Set'] ?? '0', 10);
				if (setNum === 0) continue;

				// Parse weight: "body weight", empty, "-", or "0" all mean body weight (0)
				const rawWeight = (row['kg'] ?? row['weight'] ?? '').trim().toLowerCase();
				const weight = (rawWeight === 'body weight' || rawWeight === '' || rawWeight === '-' || rawWeight === '0')
					? 0
					: parseFloat(rawWeight);

				sets.push({
					setNumber: setNum,
					weight: isNaN(weight) ? 0 : weight,
					reps: parseInt(row['reps'] ?? '0', 10),
					rpe: row['rpe'] && row['rpe'] !== '-' ? parseInt(row['rpe'], 10) : undefined,
					timestamp: row['time'] ?? '',
					completed: true, // If it's in the table, it's completed
					actualRestSeconds: parseSeconds(row['rest']),
					extraRestSeconds: parseSeconds(row['+rest']),
					avgRepDuration: parseSeconds(row['s/rep'])
				});
			}
		}

		// Parse muscle engagement question/answer after table
		const muscleEngagementMatch = block.match(/\*\*Did you feel the correct muscle working\?\*\*\s*(.*)/i);
		const rawMuscleEngagement = muscleEngagementMatch?.[1]?.trim();
		// Convert human-readable label back to enum value
		const muscleEngagementMap: Record<string, string> = {
			'Yes, clearly': 'yes-clearly',
			'Moderately': 'moderately',
			'Not really': 'not-really'
		};
		const muscleEngagement = rawMuscleEngagement
			? (muscleEngagementMap[rawMuscleEngagement] ?? rawMuscleEngagement)
			: undefined;

		exercises.push({
			exercise: exerciseName,
			targetSets,
			targetRepsMin,
			targetRepsMax,
			restSeconds,
			sets,
			muscleEngagement
		});
	}

	return exercises;
}

/**
 * Creates session body with exercise blocks and set tables under # Exercises heading
 */
export function createSessionBody(exercises: SessionExerciseBlock[]): string {
	const lines: string[] = ['# Exercises', ''];

	if (exercises.length === 0) {
		return lines.join('\n') + '\n';
	}

	const blocks: string[] = [];

	for (const exercise of exercises) {
		const exerciseLines: string[] = [];

		// Exercise header with human-readable name (no wikilink)
		exerciseLines.push(`## ${exercise.exercise}`);

		// Target line
		const repsDisplay = exercise.targetRepsMin === exercise.targetRepsMax
			? String(exercise.targetRepsMin)
			: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
		exerciseLines.push(`Target: ${exercise.targetSets} × ${repsDisplay} | Rest: ${exercise.restSeconds}s`);
		exerciseLines.push('');

		// Sets table
		const columns = [
			{ key: 'num', header: '#' },
			{ key: 'kg', header: 'kg' },
			{ key: 'reps', header: 'reps' },
			{ key: 'rpe', header: 'rpe' },
			{ key: 'time', header: 'time' },
			{ key: 'rest', header: 'rest' },
			{ key: 'extraRest', header: '+rest' },
			{ key: 'avgRep', header: 's/rep' }
		];

		const setRows = exercise.sets.map((set, idx) => ({
			num: String(set.setNumber || idx + 1),
			kg: set.weight === 0 ? 'body weight' : String(set.weight),
			reps: String(set.reps),
			rpe: set.rpe !== undefined ? String(set.rpe) : '-',
			time: formatTimeFromISO(set.timestamp),
			rest: set.actualRestSeconds !== undefined ? `${set.actualRestSeconds}s` : '-',
			extraRest: set.extraRestSeconds !== undefined ? `+${set.extraRestSeconds}s` : '-',
			avgRep: set.avgRepDuration !== undefined ? `${set.avgRepDuration}s` : '-'
		}));

		if (setRows.length > 0) {
			exerciseLines.push(createMarkdownTable(columns, setRows));
		} else {
			// Empty table for exercises with no sets yet
			exerciseLines.push(createMarkdownTable(columns, []));
		}

		// Add muscle engagement question/answer if present
		if (exercise.muscleEngagement) {
			const labelMap: Record<string, string> = {
				'yes-clearly': 'Yes, clearly',
				'moderately': 'Moderately',
				'not-really': 'Not really'
			};
			const label = labelMap[exercise.muscleEngagement] ?? exercise.muscleEngagement;
			exerciseLines.push('');
			exerciseLines.push(`**Did you feel the correct muscle working?** ${label}`);
		}

		blocks.push(exerciseLines.join('\n'));
	}

	return lines.join('\n') + blocks.join('\n\n') + '\n';
}

/**
 * Parses a seconds value from table column (e.g., "90s", "+30s", "2.5s")
 */
function parseSeconds(value: string | undefined): number | undefined {
	if (!value || value === '-') return undefined;
	const num = parseFloat(value.replace(/^\+/, '').replace(/s$/, ''));
	return isNaN(num) ? undefined : num;
}

/**
 * Formats an ISO timestamp to HH:MM:SS for display in tables
 * Also handles already-formatted HH:MM:SS strings (pass-through)
 */
function formatTimeFromISO(isoString: string): string {
	if (!isoString) return '-';

	// If already in HH:MM:SS format, return as-is
	if (/^\d{2}:\d{2}:\d{2}$/.test(isoString)) {
		return isoString;
	}

	try {
		const date = new Date(isoString);
		// Check for invalid date
		if (isNaN(date.getTime())) return '-';
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	} catch {
		return '-';
	}
}

/**
 * Creates previous exercises body under # Previous heading
 * Shows exercises from the previous session of the same workout for AI comparison
 */
export function createPreviousExercisesBody(
	exercises: SessionExerciseBlock[],
	sessionDate: string
): string {
	const lines: string[] = ['# Previous', ''];
	lines.push(`Date: ${sessionDate}`);
	lines.push('');

	if (exercises.length === 0) {
		return lines.join('\n');
	}

	const blocks: string[] = [];

	for (const exercise of exercises) {
		const exerciseLines: string[] = [];

		// Exercise header with human-readable name (no wikilink)
		exerciseLines.push(`## ${exercise.exercise}`);

		// Target line
		const repsDisplay = exercise.targetRepsMin === exercise.targetRepsMax
			? String(exercise.targetRepsMin)
			: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
		exerciseLines.push(`Target: ${exercise.targetSets} × ${repsDisplay} | Rest: ${exercise.restSeconds}s`);
		exerciseLines.push('');

		// Sets table
		const columns = [
			{ key: 'num', header: '#' },
			{ key: 'kg', header: 'kg' },
			{ key: 'reps', header: 'reps' },
			{ key: 'rpe', header: 'rpe' },
			{ key: 'time', header: 'time' },
			{ key: 'rest', header: 'rest' },
			{ key: 'extraRest', header: '+rest' },
			{ key: 'avgRep', header: 's/rep' }
		];

		const completedSets = exercise.sets.filter(s => s.completed);
		const setRows = completedSets.map((set, idx) => ({
			num: String(set.setNumber || idx + 1),
			kg: set.weight === 0 ? 'body weight' : String(set.weight),
			reps: String(set.reps),
			rpe: set.rpe !== undefined ? String(set.rpe) : '-',
			time: formatTimeFromISO(set.timestamp),
			rest: set.actualRestSeconds !== undefined ? `${set.actualRestSeconds}s` : '-',
			extraRest: set.extraRestSeconds !== undefined ? `+${set.extraRestSeconds}s` : '-',
			avgRep: set.avgRepDuration !== undefined ? `${set.avgRepDuration}s` : '-'
		}));

		if (setRows.length > 0) {
			exerciseLines.push(createMarkdownTable(columns, setRows));
		}

		blocks.push(exerciseLines.join('\n'));
	}

	return lines.join('\n') + blocks.join('\n\n') + '\n';
}
