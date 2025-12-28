/**
 * RPE (Rate of Perceived Exertion) selector component
 */

interface RpeOption {
	value: number;
	label: string;
}

const RPE_OPTIONS: RpeOption[] = [
	{ value: 10, label: 'Max effort' },
	{ value: 9.5, label: 'Almost failure' },
	{ value: 9, label: '1 rep left' },
	{ value: 8.5, label: '1-2 reps left' },
	{ value: 8, label: '2 reps left' },
	{ value: 7.5, label: '2-3 reps left' },
	{ value: 7, label: '3 reps left' },
	{ value: 6, label: '4 reps left' },
	{ value: 5, label: 'Light effort' },
	{ value: 4, label: 'Warmup' }
];

export interface RpeSelectorOptions {
	selectedValue?: number;
	onSelect: (value: number) => void;
}

/**
 * Creates a compact RPE selector with values in a grid
 */
export function createRpeSelector(parent: HTMLElement, options: RpeSelectorOptions): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-rpe-selector' });

	// Title
	container.createDiv({ cls: 'fit-rpe-title', text: 'Rate of Perceived Exertion' });

	// Options grid (2 per row)
	const grid = container.createDiv({ cls: 'fit-rpe-grid' });

	for (const rpeOption of RPE_OPTIONS) {
		const isSelected = options.selectedValue === rpeOption.value;
		const item = grid.createDiv({
			cls: `fit-rpe-item ${isSelected ? 'fit-rpe-item-selected' : ''}`
		});

		item.createSpan({ cls: 'fit-rpe-value', text: String(rpeOption.value) });
		item.createSpan({ cls: 'fit-rpe-label', text: rpeOption.label });

		item.addEventListener('click', () => {
			// Remove selection from all items
			grid.querySelectorAll('.fit-rpe-item').forEach(el => {
				el.removeClass('fit-rpe-item-selected');
			});
			// Select this item
			item.addClass('fit-rpe-item-selected');
			options.onSelect(rpeOption.value);
		});
	}

	return container;
}
