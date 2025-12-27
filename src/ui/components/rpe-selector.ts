/**
 * RPE (Rate of Perceived Exertion) selector component
 */

export interface RpeOption {
	value: number;
	description: string;
}

const RPE_OPTIONS: RpeOption[] = [
	{ value: 10, description: 'Failure. Couldn\'t complete another rep with good form' },
	{ value: 9.5, description: 'Near failure. Maybe 1 more rep possible' },
	{ value: 9, description: '1 rep in reserve. Ideal for hypertrophy' },
	{ value: 8.5, description: '1-2 reps in reserve. Great muscle stimulus' },
	{ value: 8, description: '2 reps in reserve. Good training intensity' },
	{ value: 7.5, description: '2-3 reps in reserve. Moderate effort' },
	{ value: 7, description: '3 reps in reserve. Sustainable volume work' },
	{ value: 6, description: '4 reps in reserve. Light working set' },
	{ value: 5, description: '5+ reps in reserve. Technique practice' },
	{ value: 4, description: 'Warmup weight. Preparing muscles and joints' }
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
