/**
 * Program file body parsing and creation utilities
 */

import { parseSimpleYaml } from './yaml-utils';
import { parseWorkoutBody, type WorkoutExerciseRow } from './workout-body';
import { toSlug } from '../domain/identifier';

/**
 * Inline workout parsed from a program file
 */
export interface InlineWorkout {
	id: string;
	name: string;
	exercises: WorkoutExerciseRow[];
}

/**
 * Parses the ## Description section from program body
 * Returns the content between ## Description and the next ## heading outside code blocks
 */
export function parseDescriptionSection(body: string): string | undefined {
	// Find where ## Description starts
	const descMatch = body.match(/## Description\s*/i);
	if (!descMatch || descMatch.index === undefined) return undefined;

	const contentStart = descMatch.index + descMatch[0].length;
	const content = body.slice(contentStart);

	// Find the next ## heading that's outside a code block
	const endIndex = findNextH2OutsideCodeBlock(content);
	const description = endIndex === -1 ? content : content.slice(0, endIndex);

	return description.trim() || undefined;
}

/**
 * Finds the index of the next ## heading that's outside a code block
 * Returns -1 if no such heading is found
 */
function findNextH2OutsideCodeBlock(text: string): number {
	const lines = text.split('\n');
	let inCodeBlock = false;
	let currentIndex = 0;

	for (const line of lines) {
		// Check for code fence (``` or ~~~)
		if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
			inCodeBlock = !inCodeBlock;
		}
		// Check for ## heading outside code block
		else if (!inCodeBlock && line.startsWith('## ')) {
			return currentIndex;
		}

		currentIndex += line.length + 1; // +1 for the newline
	}

	return -1;
}


/**
 * Parses inline workouts from H3 sections that contain exercise tables
 * Returns workouts in document order
 */
export function parseInlineWorkouts(body: string): InlineWorkout[] {
	const workouts: InlineWorkout[] = [];

	// Split body into H3 sections
	const sections = body.split(/(?=^### )/m);

	for (const section of sections) {
		// Must start with ### to be a workout header
		if (!section.startsWith('### ')) continue;

		// Extract section name (first line after ###)
		const headerMatch = section.match(/^### (.+)$/m);
		if (!headerMatch) continue;

		const sectionName = headerMatch[1]?.trim() ?? '';
		if (!sectionName) continue;

		// Check if this section contains an exercise table
		const exercises = parseWorkoutBody(section);
		if (exercises.length === 0) continue;

		// This is an inline workout
		workouts.push({
			id: toSlug(sectionName),
			name: sectionName,
			exercises
		});
	}

	return workouts;
}


/**
 * Checks if a string is valid YAML by attempting to parse it
 */
function isValidYaml(content: string): boolean {
	if (!content.trim()) return false;
	try {
		const parsed = parseSimpleYaml(content);
		// Must have at least one key to be considered valid YAML
		return Object.keys(parsed).length > 0;
	} catch {
		return false;
	}
}

/**
 * Creates coach feedback section body
 * If the feedback is valid YAML, wraps it in a ```yaml code block
 */
export function createCoachFeedbackBody(feedback: string): string {
	if (!feedback) return '';

	// Check if feedback is valid YAML
	if (isValidYaml(feedback)) {
		return `# Coach Feedback\n\n\`\`\`yaml\n${feedback}\n\`\`\`\n`;
	}

	return `# Coach Feedback\n\n${feedback}\n`;
}

/**
 * Parses coach feedback from body (the current session's feedback, not previous)
 * Extracts content from ```yaml code blocks if present
 */
export function parseCoachFeedbackBody(body: string): string | undefined {
	// Match "# Coach Feedback" but not "# Previous Coach Feedback"
	const feedbackMatch = body.match(/(?<!Previous )# Coach Feedback\s*([\s\S]*?)(?=# Previous|# Review|$)/i);
	if (!feedbackMatch) return undefined;

	let feedback = feedbackMatch[1]?.trim();
	if (!feedback) return undefined;

	// Check if feedback is wrapped in a yaml code block
	const codeBlockMatch = feedback.match(/^```ya?ml\n([\s\S]*?)\n```$/);
	if (codeBlockMatch && codeBlockMatch[1]) {
		feedback = codeBlockMatch[1].trim();
	}

	return feedback || undefined;
}
