/**
 * Stat display component for showing label/value pairs
 * Used in exercise progress cards and finish screens
 */

export interface StatDisplayOptions {
	/** Label text (e.g., 'Sets', 'Target') */
	label: string;
	/** Value text (e.g., '3 / 4', '8-12') */
	value: string;
	/** Optional click handler (makes the stat clickable) */
	onClick?: () => void;
}

export interface StatDisplayRefs {
	container: HTMLElement;
	labelEl: HTMLElement;
	valueEl: HTMLElement;
	/** Update the value text */
	setValue: (value: string) => void;
	/** Update the label text */
	setLabel: (label: string) => void;
	destroy: () => void;
}

/**
 * Creates a stat display with label and value
 * Styled with fit-stat-wide, fit-stat-label-vertical, fit-stat-value-large classes
 */
export function createStatDisplay(parent: HTMLElement, options: StatDisplayOptions): StatDisplayRefs {
	const container = parent.createDiv({ cls: 'fit-stat-wide' });
	const cleanup: (() => void)[] = [];

	const labelEl = container.createDiv({ cls: 'fit-stat-label-vertical', text: options.label });
	const valueEl = container.createDiv({ cls: 'fit-stat-value-large', text: options.value });

	if (options.onClick) {
		container.addClass('fit-stat-clickable');
		const clickHandler = options.onClick;
		container.addEventListener('click', clickHandler);
		cleanup.push(() => container.removeEventListener('click', clickHandler));
	}

	return {
		container,
		labelEl,
		valueEl,
		setValue: (value: string) => {
			valueEl.textContent = value;
		},
		setLabel: (label: string) => {
			labelEl.textContent = label;
		},
		destroy: () => cleanup.forEach(fn => fn())
	};
}
