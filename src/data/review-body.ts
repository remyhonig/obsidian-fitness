/**
 * Session review body parsing and creation utilities
 */

import type { SessionReview, QuestionAnswer } from '../types';

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
