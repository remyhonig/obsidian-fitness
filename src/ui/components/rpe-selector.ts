/**
 * RPE (Rate of Perceived Exertion) selector component
 */

import { createSelectableGrid, type SelectableGridOption, type SelectableGridRefs } from './selectable-grid';

const RPE_OPTIONS: SelectableGridOption<number>[] = [
	{ value: 10, label: 'Max effort', sublabel: '10' },
	{ value: 9.5, label: 'Almost failure', sublabel: '9.5' },
	{ value: 9, label: '1 rep left', sublabel: '9' },
	{ value: 8.5, label: '1-2 reps left', sublabel: '8.5' },
	{ value: 8, label: '2 reps left', sublabel: '8' },
	{ value: 7.5, label: '2-3 reps left', sublabel: '7.5' },
	{ value: 7, label: '3 reps left', sublabel: '7' },
	{ value: 6, label: '4 reps left', sublabel: '6' },
	{ value: 5, label: 'Light effort', sublabel: '5' },
	{ value: 4, label: 'Warmup', sublabel: '4' }
];

export interface RpeSelectorOptions {
	selectedValue?: number;
	onSelect: (value: number) => void;
}

export interface RpeSelectorRefs {
	container: HTMLElement;
	setSelected: (value: number | undefined) => void;
	destroy: () => void;
}

/**
 * Creates a compact RPE selector with values in a grid
 */
export function createRpeSelector(parent: HTMLElement, options: RpeSelectorOptions): RpeSelectorRefs {
	const container = parent.createDiv({ cls: 'fit-rpe-selector' });

	// Title
	container.createDiv({ cls: 'fit-rpe-title', text: 'Rate of Perceived Exertion' });

	// Use generic selectable grid
	const gridRefs: SelectableGridRefs<number> = createSelectableGrid(container, {
		classPrefix: 'fit-rpe',
		options: RPE_OPTIONS,
		selectedValue: options.selectedValue,
		onSelect: options.onSelect,
		layout: 'grid'
	});

	return {
		container,
		setSelected: gridRefs.setSelected,
		destroy: gridRefs.destroy
	};
}
