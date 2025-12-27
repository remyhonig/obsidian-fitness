/**
 * RPE (Rate of Perceived Exertion) selector component
 */

export interface RpeOption {
	value: number;
	description: string;
}

const RPE_OPTIONS: RpeOption[] = [
	{ value: 10, description: 'Max effort. Could not have done any more reps' },
	{ value: 9.5, description: 'Maybe could have done 1 more rep' },
	{ value: 9, description: 'Definitely could have done 1 more rep' },
	{ value: 8.5, description: 'Could have done 1 more rep, maybe even 2' },
	{ value: 8, description: 'Definitely could have done 2 more reps' },
	{ value: 7.5, description: 'Could have done 2 more reps, maybe even 3' },
	{ value: 7, description: 'Definitely could have done 3 more reps' },
	{ value: 6, description: 'Could have done 4 more reps' },
	{ value: 5, description: 'Could have done 5+ more reps' },
	{ value: 4, description: 'Light effort, warmup weight' }
];

export interface RpeSelectorOptions {
	selectedValue?: number;
	onSelect: (value: number) => void;
}

/**
 * Creates a vertical RPE selector with values and explanations
 */
export function createRpeSelector(parent: HTMLElement, options: RpeSelectorOptions): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-rpe-selector' });

	// Title
	container.createDiv({ cls: 'fit-rpe-title', text: 'Rate of Perceived Exertion' });

	// Options list
	const list = container.createDiv({ cls: 'fit-rpe-list' });

	for (const rpeOption of RPE_OPTIONS) {
		const isSelected = options.selectedValue === rpeOption.value;
		const item = list.createDiv({
			cls: `fit-rpe-item ${isSelected ? 'fit-rpe-item-selected' : ''}`
		});

		item.createSpan({ cls: 'fit-rpe-value', text: String(rpeOption.value) });
		item.createSpan({ cls: 'fit-rpe-description', text: rpeOption.description });

		item.addEventListener('click', () => {
			// Remove selection from all items
			list.querySelectorAll('.fit-rpe-item').forEach(el => {
				el.removeClass('fit-rpe-item-selected');
			});
			// Select this item
			item.addClass('fit-rpe-item-selected');
			options.onSelect(rpeOption.value);
		});
	}

	return container;
}
