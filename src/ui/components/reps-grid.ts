export interface RepsGridOptions {
	value: number;
	min?: number;
	max?: number;
	onChange: (value: number) => void;
}

export interface RepsGridRefs {
	container: HTMLElement;
	destroy: () => void;
}

/**
 * Creates a grid of buttons for selecting rep count (1-15 by default)
 */
export function createRepsGrid(parent: HTMLElement, options: RepsGridOptions): RepsGridRefs {
	const min = options.min ?? 1;
	const max = options.max ?? 15;
	let currentValue = options.value;
	const cleanup: (() => void)[] = [];

	const container = parent.createDiv({ cls: 'fit-reps-grid' });

	// Current value display
	const display = container.createDiv({ cls: 'fit-reps-display' });
	display.createSpan({ cls: 'fit-reps-value', text: String(currentValue) });
	display.createSpan({ cls: 'fit-reps-label', text: 'reps' });

	// Grid of buttons
	const grid = container.createDiv({ cls: 'fit-reps-buttons' });

	const buttons: HTMLButtonElement[] = [];

	for (let i = min; i <= max; i++) {
		const btn = grid.createEl('button', {
			cls: 'fit-reps-button',
			text: String(i)
		});

		if (i === currentValue) {
			btn.addClass('fit-reps-button-active');
		}

		const value = i;
		const clickHandler = (e: Event) => {
			e.preventDefault();

			// Update active state
			buttons.forEach(b => b.removeClass('fit-reps-button-active'));
			btn.addClass('fit-reps-button-active');

			// Update value
			currentValue = value;
			const valueEl = display.querySelector('.fit-reps-value');
			if (valueEl) {
				valueEl.textContent = String(currentValue);
			}

			options.onChange(currentValue);
		};

		btn.addEventListener('click', clickHandler);
		cleanup.push(() => btn.removeEventListener('click', clickHandler));
		buttons.push(btn);
	}

	// Fine-tune buttons for values outside grid
	const fineTune = container.createDiv({ cls: 'fit-reps-finetune' });

	const minusBtn = fineTune.createEl('button', {
		cls: 'fit-button fit-button-ghost',
		text: '-1'
	});

	const plusBtn = fineTune.createEl('button', {
		cls: 'fit-button fit-button-ghost',
		text: '+1'
	});

	const updateFromFineTune = (delta: number) => {
		const newValue = currentValue + delta;
		if (newValue >= 0 && newValue <= 99) {
			currentValue = newValue;

			// Update display
			const valueEl = display.querySelector('.fit-reps-value');
			if (valueEl) {
				valueEl.textContent = String(currentValue);
			}

			// Update button active states
			buttons.forEach((b, idx) => {
				if (idx + min === currentValue) {
					b.addClass('fit-reps-button-active');
				} else {
					b.removeClass('fit-reps-button-active');
				}
			});

			options.onChange(currentValue);
		}
	};

	const minusHandler = () => updateFromFineTune(-1);
	const plusHandler = () => updateFromFineTune(1);

	minusBtn.addEventListener('click', minusHandler);
	plusBtn.addEventListener('click', plusHandler);

	cleanup.push(() => {
		minusBtn.removeEventListener('click', minusHandler);
		plusBtn.removeEventListener('click', plusHandler);
	});

	return {
		container,
		destroy: () => cleanup.forEach(fn => fn())
	};
}

export interface CompactRepsGridRefs {
	container: HTMLElement;
	destroy: () => void;
}

/**
 * Creates a compact reps selector (just the grid, no display)
 */
export function createCompactRepsGrid(
	parent: HTMLElement,
	value: number,
	onChange: (value: number) => void
): CompactRepsGridRefs {
	const container = parent.createDiv({ cls: 'fit-reps-grid-compact' });
	let currentValue = value;
	const buttons: HTMLButtonElement[] = [];
	const cleanup: (() => void)[] = [];

	const handleChange = (v: number, btn: HTMLButtonElement) => {
		currentValue = v;
		updateActive(buttons, currentValue);
		onChange(v);
	};

	// Row 1: 1-5
	const row1 = container.createDiv({ cls: 'fit-reps-row' });
	for (let i = 1; i <= 5; i++) {
		const { btn, cleanup: btnCleanup } = createRepButton(row1, i, currentValue, handleChange);
		buttons.push(btn);
		cleanup.push(btnCleanup);
	}

	// Row 2: 6-10
	const row2 = container.createDiv({ cls: 'fit-reps-row' });
	for (let i = 6; i <= 10; i++) {
		const { btn, cleanup: btnCleanup } = createRepButton(row2, i, currentValue, handleChange);
		buttons.push(btn);
		cleanup.push(btnCleanup);
	}

	// Row 3: 11-15
	const row3 = container.createDiv({ cls: 'fit-reps-row' });
	for (let i = 11; i <= 15; i++) {
		const { btn, cleanup: btnCleanup } = createRepButton(row3, i, currentValue, handleChange);
		buttons.push(btn);
		cleanup.push(btnCleanup);
	}

	return {
		container,
		destroy: () => cleanup.forEach(fn => fn())
	};
}

function createRepButton(
	parent: HTMLElement,
	value: number,
	currentValue: number,
	onChange: (value: number, btn: HTMLButtonElement) => void
): { btn: HTMLButtonElement; cleanup: () => void } {
	const btn = parent.createEl('button', {
		cls: 'fit-reps-button',
		text: String(value)
	});

	if (value === currentValue) {
		btn.addClass('fit-reps-button-active');
	}

	// Store value on button for later lookup
	(btn as unknown as { repValue: number }).repValue = value;

	const clickHandler = (e: Event) => {
		e.preventDefault();
		onChange(value, btn);
	};

	btn.addEventListener('click', clickHandler);

	return {
		btn,
		cleanup: () => btn.removeEventListener('click', clickHandler)
	};
}

function updateActive(buttons: HTMLButtonElement[], currentValue: number): void {
	for (const btn of buttons) {
		const repValue = (btn as unknown as { repValue: number }).repValue;
		if (repValue === currentValue) {
			btn.addClass('fit-reps-button-active');
		} else {
			btn.removeClass('fit-reps-button-active');
		}
	}
}

export interface HorizontalRepsSelectorOptions {
	/** Target rep range (min-max) to highlight with outline */
	targetRange?: { min: number; max: number };
}

export interface HorizontalRepsSelectorRefs {
	container: HTMLElement;
	destroy: () => void;
}

/**
 * Creates a horizontal scrollable reps selector (single row) with scroll indicators
 */
export function createHorizontalRepsSelector(
	parent: HTMLElement,
	value: number,
	onChange: (value: number) => void,
	options?: HorizontalRepsSelectorOptions
): HorizontalRepsSelectorRefs {
	const container = parent.createDiv({ cls: 'fit-reps-horizontal' });
	let currentValue = value;
	const buttons: HTMLButtonElement[] = [];
	const cleanup: (() => void)[] = [];

	// Left scroll indicator
	const leftIndicator = container.createDiv({ cls: 'fit-reps-scroll-indicator fit-reps-scroll-left' });
	leftIndicator.createSpan({ text: '‹' });

	// Scrollable row with all numbers 1-20
	const scroll = container.createDiv({ cls: 'fit-reps-scroll' });
	const row = scroll.createDiv({ cls: 'fit-reps-scroll-row' });

	// Right scroll indicator
	const rightIndicator = container.createDiv({ cls: 'fit-reps-scroll-indicator fit-reps-scroll-right' });
	rightIndicator.createSpan({ text: '›' });

	// Find target range to wrap in a band
	const targetRange = options?.targetRange;
	const targetMin = targetRange?.min ?? -1;
	const targetMax = targetRange?.max ?? -1;

	// Track when we need to create/close the target band wrapper
	let targetBand: HTMLElement | null = null;

	for (let i = 1; i <= 20; i++) {
		// Start target band wrapper at targetMin
		if (targetRange && i === targetMin) {
			targetBand = row.createDiv({ cls: 'fit-reps-target-band' });
		}

		// Create button in either the target band or directly in the row
		const parent = (targetBand && i >= targetMin && i <= targetMax) ? targetBand : row;
		const btn = parent.createEl('button', {
			cls: 'fit-reps-pill',
			text: String(i)
		});

		if (i === currentValue) {
			btn.addClass('fit-reps-pill-active');
		}

		(btn as unknown as { repValue: number }).repValue = i;

		const value = i;
		const clickHandler = (e: Event) => {
			e.preventDefault();
			currentValue = value;
			buttons.forEach(b => b.removeClass('fit-reps-pill-active'));
			btn.addClass('fit-reps-pill-active');
			onChange(value);
		};

		btn.addEventListener('click', clickHandler);
		cleanup.push(() => btn.removeEventListener('click', clickHandler));
		buttons.push(btn);

		// Close target band after targetMax
		if (targetRange && i === targetMax) {
			targetBand = null;
		}
	}

	// Scroll by page when indicators clicked
	const scrollAmount = 200; // Approximate width of 4 buttons

	const leftClickHandler = () => {
		scroll.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
	};

	const rightClickHandler = () => {
		scroll.scrollBy({ left: scrollAmount, behavior: 'smooth' });
	};

	leftIndicator.addEventListener('click', leftClickHandler);
	rightIndicator.addEventListener('click', rightClickHandler);

	cleanup.push(() => {
		leftIndicator.removeEventListener('click', leftClickHandler);
		rightIndicator.removeEventListener('click', rightClickHandler);
	});

	// Update indicator visibility based on scroll position
	const updateIndicators = () => {
		const atStart = scroll.scrollLeft <= 0;
		const atEnd = scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 1;

		leftIndicator.classList.toggle('fit-reps-scroll-hidden', atStart);
		rightIndicator.classList.toggle('fit-reps-scroll-hidden', atEnd);
	};

	scroll.addEventListener('scroll', updateIndicators);
	cleanup.push(() => scroll.removeEventListener('scroll', updateIndicators));

	// Scroll to show target range at the start (or active value if no target range)
	setTimeout(() => {
		const targetBandEl = row.querySelector('.fit-reps-target-band') as HTMLElement;
		if (targetBandEl) {
			// Align target range to left edge
			scroll.scrollLeft = Math.max(0, targetBandEl.offsetLeft);
		} else {
			// Fall back to centering the active button
			const activeBtn = row.querySelector('.fit-reps-pill-active') as HTMLElement;
			if (activeBtn) {
				const scrollWidth = scroll.clientWidth;
				const btnLeft = activeBtn.offsetLeft;
				const btnWidth = activeBtn.offsetWidth;
				const targetScroll = btnLeft - (scrollWidth / 2) + (btnWidth / 2);
				scroll.scrollLeft = Math.max(0, targetScroll);
			}
		}
		updateIndicators();
	}, 0);

	return {
		container,
		destroy: () => cleanup.forEach(fn => fn())
	};
}
