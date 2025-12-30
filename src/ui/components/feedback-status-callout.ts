/**
 * Status callout component for coach feedback validation
 */

import { setIcon } from 'obsidian';
import type { FeedbackValidationStatus } from '../../data/coach-feedback-types';

export interface FeedbackStatusCalloutOptions {
	status: FeedbackValidationStatus | null;
}

export interface FeedbackStatusCalloutRefs {
	container: HTMLElement;
	update: (status: FeedbackValidationStatus | null) => void;
	destroy: () => void;
}

/**
 * Creates a status callout showing feedback validation results
 */
export function createFeedbackStatusCallout(
	parent: HTMLElement,
	options: FeedbackStatusCalloutOptions
): FeedbackStatusCalloutRefs {
	const container = parent.createDiv({ cls: 'fit-feedback-status' });

	const render = (status: FeedbackValidationStatus | null) => {
		container.empty();

		if (!status) {
			container.addClass('is-hidden');
			return;
		}

		container.removeClass('is-hidden');

		// Determine status
		const hasUnmatchedExercises = status.exerciseValidations.some(v => !v.matched);
		const matchedCount = status.exerciseValidations.filter(v => v.matched).length;
		const unmatchedCount = status.exerciseValidations.length - matchedCount;

		if (status.parseError) {
			container.addClass('fit-feedback-status-error');
		} else {
			container.removeClass('fit-feedback-status-error');
		}

		// Header with icon
		const header = container.createDiv({ cls: 'fit-feedback-status-header' });

		const iconEl = header.createSpan({ cls: 'fit-feedback-status-icon' });
		if (status.parseError) {
			setIcon(iconEl, 'alert-triangle');
			iconEl.addClass('fit-feedback-status-icon-error');
		} else if (hasUnmatchedExercises) {
			setIcon(iconEl, 'alert-circle');
			iconEl.addClass('fit-feedback-status-icon-warning');
		} else {
			setIcon(iconEl, 'check-circle');
			iconEl.addClass('fit-feedback-status-icon-success');
		}

		// Title
		const title = header.createDiv({ cls: 'fit-feedback-status-title' });
		if (status.parseError) {
			title.setText(status.parseError);
		} else if (hasUnmatchedExercises) {
			title.setText('Structured feedback detected');
		} else {
			title.setText('Structured feedback detected');
		}

		// Content section
		const content = container.createDiv({ cls: 'fit-feedback-status-content' });

		// What was found
		if (!status.parseError) {
			const foundSection = content.createDiv({ cls: 'fit-feedback-status-section' });
			foundSection.createDiv({ cls: 'fit-feedback-status-label', text: 'Parsed content:' });

			const foundList = foundSection.createEl('ul', { cls: 'fit-feedback-status-list' });
			if (status.hasGymfloorActies) {
				foundList.createEl('li', {
					text: `${status.gymfloorActiesCount} training tip${status.gymfloorActiesCount !== 1 ? 's' : ''} (shown at session start)`
				});
			}
			if (status.hasExerciseFeedback) {
				foundList.createEl('li', {
					text: `${status.exerciseValidations.length} exercise cue${status.exerciseValidations.length !== 1 ? 's' : ''} (shown per exercise)`
				});
			}
			if (status.hasMotivation) {
				foundList.createEl('li', { text: 'Motivation message (shown at session start)' });
			}
		}

		// Exercise matching status
		if (status.exerciseValidations.length > 0) {
			const exerciseSection = content.createDiv({ cls: 'fit-feedback-status-section' });

			if (hasUnmatchedExercises) {
				exerciseSection.createDiv({
					cls: 'fit-feedback-status-label fit-feedback-status-label-warning',
					text: `Exercise name mismatch (${unmatchedCount} not found in session):`
				});
			} else {
				exerciseSection.createDiv({
					cls: 'fit-feedback-status-label',
					text: `All ${matchedCount} exercise${matchedCount !== 1 ? 's' : ''} matched to session:`
				});
			}

			const exerciseList = exerciseSection.createDiv({ cls: 'fit-feedback-status-exercises' });

			for (const validation of status.exerciseValidations) {
				const row = exerciseList.createDiv({ cls: 'fit-feedback-exercise-match' });

				const icon = row.createSpan({ cls: 'fit-feedback-exercise-match-icon' });
				if (validation.matched) {
					setIcon(icon, 'check');
					icon.addClass('fit-feedback-status-icon-success');
				} else {
					setIcon(icon, 'x');
					icon.addClass('fit-feedback-status-icon-warning');
				}

				const nameSpan = row.createSpan({ cls: 'fit-feedback-exercise-match-name' });
				nameSpan.setText(validation.exerciseName);

				if (!validation.matched) {
					row.createSpan({
						cls: 'fit-feedback-exercise-match-hint',
						text: '(cue won\'t show - check spelling)'
					});
				}
			}
		}
	};

	// Initial render
	render(options.status);

	return {
		container,
		update: render,
		destroy: () => {
			container.remove();
		},
	};
}
