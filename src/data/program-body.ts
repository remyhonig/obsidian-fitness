/**
 * Program file body parsing and creation utilities
 */

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
