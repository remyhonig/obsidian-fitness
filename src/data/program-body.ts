/**
 * Program file body parsing and creation utilities
 */

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
