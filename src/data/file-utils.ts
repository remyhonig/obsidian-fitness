import { App, TFile, TFolder } from 'obsidian';
import type { SessionReview, QuestionAnswer } from '../types';

/**
 * Ensures a folder exists, creating it and any parent folders if necessary
 */
export async function ensureFolder(app: App, path: string): Promise<TFolder> {
	const existing = app.vault.getFolderByPath(path);
	if (existing) {
		return existing;
	}

	// Create parent folders first if needed
	const parts = path.split('/');
	let currentPath = '';

	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}/${part}` : part;
		const folder = app.vault.getFolderByPath(currentPath);
		if (!folder) {
			try {
				await app.vault.createFolder(currentPath);
			} catch (e) {
				// Folder might already exist due to race condition
				if (!app.vault.getFolderByPath(currentPath)) {
					throw e;
				}
			}
		}
	}

	const folder = app.vault.getFolderByPath(path);
	if (!folder) {
		throw new Error(`Failed to create folder: ${path}`);
	}
	return folder;
}

/**
 * Gets all markdown files in a folder
 */
export function getFilesInFolder(app: App, folderPath: string): TFile[] {
	const folder = app.vault.getFolderByPath(folderPath);
	if (!folder) {
		return [];
	}

	const files: TFile[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === 'md') {
			files.push(child);
		}
	}
	return files;
}

/**
 * Generates a safe filename from a string
 */
export function toFilename(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Extracts ID from a file path (filename without extension)
 */
export function getIdFromPath(path: string): string {
	const parts = path.split('/');
	const filename = parts[parts.length - 1] ?? '';
	return filename.replace(/\.md$/, '');
}

/**
 * Parses YAML frontmatter from file content
 */
export function parseFrontmatter<T>(content: string): { frontmatter: T | null; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) {
		return { frontmatter: null, body: content };
	}

	try {
		// Simple YAML parser for our use case
		const yamlContent = match[1] ?? '';
		const body = match[2] ?? '';
		const frontmatter = parseSimpleYaml(yamlContent) as T;
		return { frontmatter, body };
	} catch {
		return { frontmatter: null, body: content };
	}
}

/**
 * Simple YAML parser that handles our data structures including nested arrays
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = yaml.split('\n');

	// Stack to track nested structures: each entry has { obj, array, key, indent }
	interface StackEntry {
		obj: Record<string, unknown>;
		array: unknown[] | null;
		key: string;
		indent: number;
	}

	const stack: StackEntry[] = [{ obj: result, array: null, key: '', indent: -2 }];

	const getIndent = (line: string): number => {
		const match = line.match(/^( *)/);
		return match?.[1]?.length ?? 0;
	};

	for (const line of lines) {
		// Skip empty lines
		if (!line.trim()) continue;

		const indent = getIndent(line);
		const trimmed = line.trim();

		// Pop stack until we're at the right level
		while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
			stack.pop();
		}

		const current = stack[stack.length - 1]!;

		// Check for inline array at any level
		const inlineArrayMatch = trimmed.match(/^(\w+): \[(.+)\]$/);
		if (inlineArrayMatch && inlineArrayMatch[1] && inlineArrayMatch[2]) {
			const key = inlineArrayMatch[1];
			const values = inlineArrayMatch[2].split(',').map(v => parseValue(v.trim()));
			current.obj[key] = values;
			continue;
		}

		// Check for array item (starts with -)
		if (trimmed.startsWith('- ')) {
			const content = trimmed.slice(2);

			// Array item with key:value (object in array)
			const objMatch = content.match(/^(\w+): (.+)$/);
			if (objMatch && objMatch[1] && objMatch[2]) {
				const newObj: Record<string, unknown> = { [objMatch[1]]: parseValue(objMatch[2]) };
				if (current.array) {
					current.array.push(newObj);
				}
				// Push this object onto stack for potential nested properties
				stack.push({ obj: newObj, array: null, key: '', indent: indent });
				continue;
			}

			// Simple array item (primitive value)
			if (current.array) {
				current.array.push(parseValue(content));
			}
			continue;
		}

		// Check for array start (key followed by colon only)
		const arrayStartMatch = trimmed.match(/^(\w+):$/);
		if (arrayStartMatch && arrayStartMatch[1]) {
			const key = arrayStartMatch[1];
			const newArray: unknown[] = [];
			current.obj[key] = newArray;
			stack.push({ obj: current.obj, array: newArray, key: key, indent: indent });
			continue;
		}

		// Check for key-value pair
		const kvMatch = trimmed.match(/^(\w+): (.+)$/);
		if (kvMatch && kvMatch[1] && kvMatch[2]) {
			current.obj[kvMatch[1]] = parseValue(kvMatch[2]);
			continue;
		}
	}

	return result;
}

/**
 * Parses a YAML value into the appropriate JS type
 */
function parseValue(value: string): unknown {
	// Remove quotes if present
	if ((value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1);
	}

	// Boolean
	if (value === 'true') return true;
	if (value === 'false') return false;

	// Number
	const num = parseFloat(value);
	if (!isNaN(num) && value === String(num)) {
		return num;
	}

	// String
	return value;
}

/**
 * Converts an object to YAML frontmatter string
 */
export function toFrontmatter(data: Record<string, unknown>): string {
	const lines: string[] = ['---'];
	serializeObject(data, lines, 0);
	lines.push('---');
	return lines.join('\n');
}

/**
 * Recursively serializes an object to YAML lines
 */
function serializeObject(obj: Record<string, unknown>, lines: string[], indent: number): void {
	const prefix = '  '.repeat(indent);

	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) continue;

			// Check if it's an array of objects or primitives
			if (typeof value[0] === 'object' && value[0] !== null) {
				// Array of objects
				lines.push(`${prefix}${key}:`);
				for (const item of value) {
					serializeArrayItem(item as Record<string, unknown>, lines, indent + 1);
				}
			} else {
				// Array of primitives - use inline format
				const formatted = value.map(v => formatValue(v)).join(', ');
				lines.push(`${prefix}${key}: [${formatted}]`);
			}
		} else {
			lines.push(`${prefix}${key}: ${formatValue(value)}`);
		}
	}
}

/**
 * Serializes an array item (object in an array) to YAML lines
 */
function serializeArrayItem(item: Record<string, unknown>, lines: string[], indent: number): void {
	const prefix = '  '.repeat(indent);
	const entries = Object.entries(item);

	if (entries.length === 0) return;

	let isFirst = true;
	for (const [key, value] of entries) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) continue;

			// Nested array
			if (typeof value[0] === 'object' && value[0] !== null) {
				// Array of objects
				if (isFirst) {
					lines.push(`${prefix}- ${key}:`);
					isFirst = false;
				} else {
					lines.push(`${prefix}  ${key}:`);
				}
				for (const subItem of value) {
					serializeArrayItem(subItem as Record<string, unknown>, lines, indent + 2);
				}
			} else {
				// Array of primitives
				const formatted = value.map(v => formatValue(v)).join(', ');
				if (isFirst) {
					lines.push(`${prefix}- ${key}: [${formatted}]`);
					isFirst = false;
				} else {
					lines.push(`${prefix}  ${key}: [${formatted}]`);
				}
			}
		} else {
			if (isFirst) {
				lines.push(`${prefix}- ${key}: ${formatValue(value)}`);
				isFirst = false;
			} else {
				lines.push(`${prefix}  ${key}: ${formatValue(value)}`);
			}
		}
	}
}

/**
 * Formats a value for YAML output
 */
function formatValue(value: unknown): string {
	if (typeof value === 'string') {
		// Quote wikilinks - YAML interprets [[]] as nested arrays without quotes
		// Obsidian still recognizes quoted wikilinks as links in frontmatter
		if (value.startsWith('[[') && value.endsWith(']]')) {
			return `"${value}"`;
		}
		// Quote strings that might be ambiguous in YAML
		if (value.includes(':') || value.includes('#') || value.includes('\n')) {
			return `"${value.replace(/"/g, '\\"')}"`;
		}
		return value;
	}
	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}
	if (typeof value === 'number') {
		return String(value);
	}
	return String(value);
}

/**
 * Creates file content with frontmatter and body
 */
export function createFileContent(frontmatter: Record<string, unknown>, body = ''): string {
	const fm = toFrontmatter(frontmatter);
	return body ? `${fm}\n${body}` : fm;
}

// ========== Markdown Table Utilities ==========

/**
 * Parses a markdown table into an array of row objects
 */
export function parseMarkdownTable(tableContent: string): Record<string, string>[] {
	const lines = tableContent.trim().split('\n').filter(line => line.trim());
	if (lines.length < 2) return [];

	// Parse header row
	const headerLine = lines[0];
	if (!headerLine) return [];
	const headers = headerLine
		.split('|')
		.map(h => h.trim())
		.filter(h => h.length > 0);

	// Skip separator row (index 1)
	const rows: Record<string, string>[] = [];

	for (let i = 2; i < lines.length; i++) {
		const line = lines[i];
		if (!line) continue;

		const cells = line
			.split('|')
			.map(c => c.trim())
			.filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || arr.length === headers.length);

		// Handle edge case where split creates empty first/last elements
		const values = line.startsWith('|')
			? line.split('|').slice(1, -1).map(c => c.trim())
			: line.split('|').map(c => c.trim());

		const row: Record<string, string> = {};
		headers.forEach((header, idx) => {
			row[header] = values[idx] ?? '';
		});
		rows.push(row);
	}

	return rows;
}

/**
 * Creates a markdown table from column definitions and rows
 */
export function createMarkdownTable(
	columns: { key: string; header: string }[],
	rows: Record<string, string | number | undefined>[]
): string {
	if (columns.length === 0) return '';

	const lines: string[] = [];

	// Header row
	const headerCells = columns.map(c => c.header);
	lines.push(`| ${headerCells.join(' | ')} |`);

	// Separator row
	const separators = columns.map(() => '---');
	lines.push(`|${separators.join('|')}|`);

	// Data rows
	for (const row of rows) {
		const cells = columns.map(c => {
			const val = row[c.key];
			return val !== undefined ? String(val) : '-';
		});
		lines.push(`| ${cells.join(' | ')} |`);
	}

	return lines.join('\n');
}

// ========== Workout Body Utilities ==========

export interface WorkoutExerciseRow {
	exercise: string;
	sets: number;
	repsMin: number;
	repsMax: number;
	restSeconds: number;
}

/**
 * Converts a slug to title case
 * dumbbell-shoulder-press -> Dumbbell Shoulder Press
 */
function slugToTitleCase(slug: string): string {
	return slug
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Extracts exercise name from a wiki-link or plain text
 * [[slug]] -> Slug To Title Case
 * [[slug|Display Name]] -> Display Name
 * [[Display Name]] -> Display Name
 * Display Name -> Display Name
 */
export function extractWikiLinkName(value: string): string {
	// Match wiki-link: [[target]] or [[target|display]]
	const wikiMatch = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
	if (wikiMatch) {
		let target = wikiMatch[1]?.trim() ?? '';
		const display = wikiMatch[2]?.trim();

		// If there's a display name (alias), use that
		if (display) {
			return display;
		}

		// Strip any folder path prefix (e.g., "Workouts/deadlift-day" -> "deadlift-day")
		if (target.includes('/')) {
			target = target.split('/').pop() ?? target;
		}

		// If target looks like a slug (lowercase with hyphens), convert to title case
		if (target.includes('-') && target === target.toLowerCase()) {
			return slugToTitleCase(target);
		}

		// Otherwise return the target as-is
		return target;
	}
	return value.trim();
}

/**
 * Parses workout exercise table from body
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

		// Extract exercise name from wiki-link if present
		const rawExercise = row['Exercise'] ?? row['exercise'] ?? '';
		const exercise = extractWikiLinkName(rawExercise);

		return {
			exercise,
			sets: parseInt(row['Sets'] ?? row['sets'] ?? '3', 10),
			repsMin: parseInt(minStr ?? '8', 10),
			repsMax: parseInt(maxStr ?? '12', 10),
			restSeconds: parseInt((row['Rest'] ?? row['rest'] ?? '120').replace('s', ''), 10)
		};
	}).filter(e => e.exercise.length > 0);
}

/**
 * Creates workout body with exercise table
 * Exercise names are wrapped in wiki-links for Obsidian navigation
 * Format: [[filename]] - Obsidian displays the frontmatter 'name' property
 * Note: We avoid using [[file|alias]] format because the pipe conflicts with table syntax
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
		const slug = toFilename(e.exercise);
		return {
			exercise: `[[${slug}]]`,  // Wiki-link without alias (Obsidian uses frontmatter 'name')
			sets: String(e.sets),
			reps: e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}-${e.repsMax}`,
			rest: `${e.restSeconds}s`
		};
	});

	return `\n## Exercises\n\n${createMarkdownTable(columns, rows)}\n`;
}

// ========== Session Body Utilities ==========

export interface SessionSetRow {
	setNumber: number;
	weight: number;
	reps: number;
	rpe?: number;
	timestamp: string;
	completed: boolean;
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

				sets.push({
					setNumber: setNum,
					weight: parseFloat(row['kg'] ?? row['weight'] ?? '0'),
					reps: parseInt(row['reps'] ?? '0', 10),
					rpe: row['rpe'] && row['rpe'] !== '-' ? parseInt(row['rpe'], 10) : undefined,
					timestamp: row['time'] ?? '',
					completed: true // If it's in the table, it's completed
				});
			}
		}

		// Parse muscle engagement question/answer after table
		const muscleEngagementMatch = block.match(/\*\*Did you feel the correct muscle working\?\*\*\s*(.*)/i);
		const muscleEngagement = muscleEngagementMatch?.[1]?.trim();

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

		// Exercise header with wikilink
		const exerciseSlug = toFilename(exercise.exercise);
		exerciseLines.push(`## [[${exerciseSlug}]]`);

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
			{ key: 'time', header: 'time' }
		];

		const setRows = exercise.sets.map((set, idx) => ({
			num: String(set.setNumber || idx + 1),
			kg: String(set.weight),
			reps: String(set.reps),
			rpe: set.rpe !== undefined ? String(set.rpe) : '-',
			time: formatTimeFromISO(set.timestamp)
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

// ========== Previous Session Body Utilities ==========

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

		// Exercise header with wikilink
		const exerciseSlug = toFilename(exercise.exercise);
		exerciseLines.push(`## [[${exerciseSlug}]]`);

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
			{ key: 'time', header: 'time' }
		];

		const completedSets = exercise.sets.filter(s => s.completed);
		const setRows = completedSets.map((set, idx) => ({
			num: String(set.setNumber || idx + 1),
			kg: String(set.weight),
			reps: String(set.reps),
			rpe: set.rpe !== undefined ? String(set.rpe) : '-',
			time: formatTimeFromISO(set.timestamp)
		}));

		if (setRows.length > 0) {
			exerciseLines.push(createMarkdownTable(columns, setRows));
		}

		blocks.push(exerciseLines.join('\n'));
	}

	return lines.join('\n') + blocks.join('\n\n') + '\n';
}

// ========== Session Review Body Utilities ==========

/**
 * Creates session review body under # Review heading
 * Format: **Question?** Answer (optional comment)
 */
export function createSessionReviewBody(review: SessionReview): string {
	const lines: string[] = ['# Review', ''];

	lines.push(`Program: [[Programs/${review.programId}]]`);
	lines.push(`Completed: ${review.completedAt}`);
	lines.push(`Skipped: ${review.skipped ? 'yes' : 'no'}`);

	if (review.answers.length > 0) {
		lines.push('');
		for (const answer of review.answers) {
			let line = `**${answer.questionText}** ${answer.selectedOptionLabel}`;
			if (answer.freeText) {
				line += ` (${answer.freeText})`;
			}
			lines.push(line);
		}
	}

	return lines.join('\n');
}

/**
 * Parses session review from body
 * Format: **Question?** Answer (optional comment)
 */
export function parseSessionReviewBody(body: string): SessionReview | undefined {
	// Find the Review section
	const reviewMatch = body.match(/# Review\s*([\s\S]*)$/i);
	if (!reviewMatch) return undefined;

	const reviewContent = reviewMatch[1] ?? '';

	// Parse program ID from wikilink
	const programMatch = reviewContent.match(/Program:\s*\[\[(?:Programs\/)?([^\]]+)\]\]/i);
	const programId = programMatch?.[1] ?? '';
	if (!programId) return undefined;

	// Parse completed timestamp
	const completedMatch = reviewContent.match(/Completed:\s*(.+)/i);
	const completedAt = completedMatch?.[1]?.trim() ?? '';

	// Parse skipped flag
	const skippedMatch = reviewContent.match(/Skipped:\s*(yes|no)/i);
	const skipped = skippedMatch?.[1]?.toLowerCase() === 'yes';

	// Parse answers: **Question?** Answer (optional comment)
	const answers: QuestionAnswer[] = [];
	const answerRegex = /\*\*(.+?)\*\*\s+(.+)/g;
	let match;

	while ((match = answerRegex.exec(reviewContent)) !== null) {
		const questionText = match[1]?.trim() ?? '';
		let answerPart = match[2]?.trim() ?? '';

		// Extract optional comment in parentheses at end
		let freeText: string | undefined;
		const commentMatch = answerPart.match(/^(.+?)\s+\((.+)\)$/);
		if (commentMatch) {
			answerPart = commentMatch[1]?.trim() ?? '';
			freeText = commentMatch[2]?.trim();
		}

		if (questionText && answerPart) {
			answers.push({
				questionId: questionText, // Use question text as ID
				questionText,
				selectedOptionId: answerPart,
				selectedOptionLabel: answerPart,
				freeText
			});
		}
	}

	return {
		programId,
		completedAt,
		answers,
		skipped
	};
}

// ========== Program Body Utilities ==========

/**
 * Parses the ## Description section from program body
 * Returns the content between ## Description and the next ## heading (or end of section)
 */
export function parseDescriptionSection(body: string): string | undefined {
	// Match ## Description section, stopping at the next ## heading or ## Review
	const descMatch = body.match(/## Description\s*([\s\S]*?)(?=## |$)/i);
	if (!descMatch) return undefined;

	const content = descMatch[1]?.trim();
	return content || undefined;
}

/**
 * Parses program body to extract ordered list of workout IDs
 * Expects format:
 * ## Workouts
 * - [[push-day]]
 * - [[pull-day]]
 * - [[leg-day]]
 */
export function parseProgramBody(body: string): string[] {
	const workouts: string[] = [];

	// Match list items with wikilinks: - [[workout-id]] or - [[folder/workout-id]]
	const listItemRegex = /^-\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/gm;
	let match;

	while ((match = listItemRegex.exec(body)) !== null) {
		let target = match[1]?.trim() ?? '';
		// Strip folder path if present (e.g., "Workouts/push-day" -> "push-day")
		if (target.includes('/')) {
			target = target.split('/').pop() ?? target;
		}
		if (target) {
			workouts.push(target);
		}
	}

	return workouts;
}

/**
 * Creates program body with ordered list of workout wikilinks
 */
export function createProgramBody(workoutIds: string[]): string {
	if (workoutIds.length === 0) return '';

	const lines: string[] = ['', '## Workouts', ''];
	for (const id of workoutIds) {
		lines.push(`- [[${id}]]`);
	}
	lines.push('');

	return lines.join('\n');
}

/**
 * Creates coach feedback section body
 */
export function createCoachFeedbackBody(feedback: string): string {
	if (!feedback) return '';
	return `# Coach Feedback\n\n${feedback}\n`;
}

/**
 * Parses coach feedback from body (the current session's feedback, not previous)
 */
export function parseCoachFeedbackBody(body: string): string | undefined {
	// Match "# Coach Feedback" but not "# Previous Coach Feedback"
	const feedbackMatch = body.match(/(?<!Previous )# Coach Feedback\s*([\s\S]*?)(?=# Previous|# Review|$)/i);
	if (!feedbackMatch) return undefined;

	const feedback = feedbackMatch[1]?.trim();
	return feedback || undefined;
}
