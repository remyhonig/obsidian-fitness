/**
 * Muscle engagement selector component
 * Asks if the exercise worked the correct muscle
 */

import type { MuscleEngagement } from '../../types';

export interface MuscleEngagementOption {
	value: MuscleEngagement;
	label: string;
}

const MUSCLE_ENGAGEMENT_OPTIONS: MuscleEngagementOption[] = [
	{ value: 'yes-clearly', label: 'Yes, clearly' },
	{ value: 'moderately', label: 'Moderately' },
	{ value: 'not-really', label: 'Not really' }
];

export interface MuscleEngagementSelectorOptions {
	selectedValue?: MuscleEngagement;
	onSelect: (value: MuscleEngagement) => void;
}

/**
 * Creates a muscle engagement selector
 */
export function createMuscleEngagementSelector(
	parent: HTMLElement,
	options: MuscleEngagementSelectorOptions
): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-muscle-engagement-selector' });

	// Title/Question
	container.createDiv({
		cls: 'fit-muscle-engagement-title',
		text: 'Did you feel the correct muscle working?'
	});

	// Options row
	const optionsRow = container.createDiv({ cls: 'fit-muscle-engagement-options' });

	for (const option of MUSCLE_ENGAGEMENT_OPTIONS) {
		const isSelected = options.selectedValue === option.value;
		const item = optionsRow.createDiv({
			cls: `fit-muscle-engagement-item ${isSelected ? 'fit-muscle-engagement-item-selected' : ''}`
		});

		item.createSpan({ cls: 'fit-muscle-engagement-label', text: option.label });

		item.addEventListener('click', () => {
			// Remove selection from all items
			optionsRow.querySelectorAll('.fit-muscle-engagement-item').forEach(el => {
				el.removeClass('fit-muscle-engagement-item-selected');
			});
			// Select this item
			item.addClass('fit-muscle-engagement-item-selected');
			options.onSelect(option.value);
		});
	}

	return container;
}
