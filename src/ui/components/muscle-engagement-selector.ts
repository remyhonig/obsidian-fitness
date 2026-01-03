/**
 * Muscle engagement selector component
 * Asks if the exercise worked the correct muscle
 */

import type { MuscleEngagement } from '../../types';
import { createSelectableGrid, type SelectableGridOption, type SelectableGridRefs } from './selectable-grid';

const MUSCLE_ENGAGEMENT_OPTIONS: SelectableGridOption<MuscleEngagement>[] = [
	{ value: 'yes-clearly', label: '🟢 Yes, clearly' },
	{ value: 'moderately', label: '🟡 Moderately' },
	{ value: 'not-really', label: '🔴 Not really' }
];

export interface MuscleEngagementSelectorOptions {
	selectedValue?: MuscleEngagement;
	onSelect: (value: MuscleEngagement) => void;
}

export interface MuscleEngagementSelectorRefs {
	container: HTMLElement;
	setSelected: (value: MuscleEngagement | undefined) => void;
	destroy: () => void;
}

/**
 * Creates a muscle engagement selector
 */
export function createMuscleEngagementSelector(
	parent: HTMLElement,
	options: MuscleEngagementSelectorOptions
): MuscleEngagementSelectorRefs {
	const container = parent.createDiv({ cls: 'fit-muscle-engagement-selector' });

	// Title/Question
	container.createDiv({
		cls: 'fit-muscle-engagement-title',
		text: 'Did you feel the correct muscle working?'
	});

	// Use generic selectable grid with row layout
	const gridRefs: SelectableGridRefs<MuscleEngagement> = createSelectableGrid(container, {
		classPrefix: 'fit-muscle-engagement',
		options: MUSCLE_ENGAGEMENT_OPTIONS,
		selectedValue: options.selectedValue,
		onSelect: options.onSelect,
		layout: 'row'
	});

	return {
		container,
		setSelected: gridRefs.setSelected,
		destroy: gridRefs.destroy
	};
}
