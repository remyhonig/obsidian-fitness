/**
 * Generic selectable grid component
 * Used by RPE selector, muscle engagement selector, and question cards
 */

export interface SelectableGridOption<T> {
	value: T;
	label: string;
	sublabel?: string; // Optional secondary label (e.g., RPE description)
}

export interface SelectableGridOptions<T> {
	/** CSS class prefix for styling (e.g., 'fit-rpe' creates 'fit-rpe-grid', 'fit-rpe-item', etc.) */
	classPrefix: string;
	/** Options to display */
	options: SelectableGridOption<T>[];
	/** Currently selected value */
	selectedValue?: T;
	/** Callback when an option is selected */
	onSelect: (value: T) => void;
	/** Layout mode: 'grid' for 2-column, 'row' for horizontal */
	layout?: 'grid' | 'row';
}

export interface SelectableGridRefs<T = unknown> {
	container: HTMLElement;
	/** Update the selected value without re-rendering */
	setSelected: (value: T | undefined) => void;
	destroy: () => void;
}

/**
 * Creates a selectable grid/row of options
 * Handles selection state and click events
 */
export function createSelectableGrid<T>(
	parent: HTMLElement,
	options: SelectableGridOptions<T>
): SelectableGridRefs {
	const { classPrefix, layout = 'grid' } = options;
	const gridClass = layout === 'row' ? `${classPrefix}-options` : `${classPrefix}-grid`;
	const itemClass = `${classPrefix}-item`;
	const selectedClass = `${classPrefix}-item-selected`;

	const container = parent.createDiv({ cls: gridClass });
	const cleanup: (() => void)[] = [];

	for (const opt of options.options) {
		const isSelected = options.selectedValue === opt.value;
		const item = container.createDiv({
			cls: `${itemClass} ${isSelected ? selectedClass : ''}`
		});

		// Store value on element for lookup
		(item as unknown as { _value: T })._value = opt.value;

		// Sublabel first if present (e.g., RPE value)
		if (opt.sublabel) {
			item.createSpan({ cls: `${classPrefix}-value`, text: opt.sublabel });
		}

		// Main label
		item.createSpan({ cls: `${classPrefix}-label`, text: opt.label });

		const clickHandler = () => {
			// Remove selection from all items
			container.querySelectorAll(`.${itemClass}`).forEach(el => {
				el.removeClass(selectedClass);
			});
			// Select this item
			item.addClass(selectedClass);
			options.onSelect(opt.value);
		};

		item.addEventListener('click', clickHandler);
		cleanup.push(() => item.removeEventListener('click', clickHandler));
	}

	const setSelected = (value: T | undefined) => {
		container.querySelectorAll(`.${itemClass}`).forEach(el => {
			const itemValue = (el as unknown as { _value: T })._value;
			if (itemValue === value) {
				el.addClass(selectedClass);
			} else {
				el.removeClass(selectedClass);
			}
		});
	};

	return {
		container,
		setSelected,
		destroy: () => cleanup.forEach(fn => fn())
	};
}
