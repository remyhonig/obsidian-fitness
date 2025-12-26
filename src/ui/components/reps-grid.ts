export interface RepsGridOptions {
	value: number;
	min?: number;
	max?: number;
	onChange: (value: number) => void;
}

/**
 * Creates a grid of buttons for selecting rep count (1-15 by default)
 */
export function createRepsGrid(parent: HTMLElement, options: RepsGridOptions): HTMLElement {
	const min = options.min ?? 1;
	const max = options.max ?? 15;
	let currentValue = options.value;

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

		btn.addEventListener('click', (e) => {
			e.preventDefault();

			// Update active state
			buttons.forEach(b => b.removeClass('fit-reps-button-active'));
			btn.addClass('fit-reps-button-active');

			// Update value
			currentValue = i;
			const valueEl = display.querySelector('.fit-reps-value');
			if (valueEl) {
				valueEl.textContent = String(currentValue);
			}

			options.onChange(currentValue);
		});

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

	minusBtn.addEventListener('click', () => updateFromFineTune(-1));
	plusBtn.addEventListener('click', () => updateFromFineTune(1));

	return container;
}

/**
 * Creates a compact reps selector (just the grid, no display)
 */
export function createCompactRepsGrid(
	parent: HTMLElement,
	value: number,
	onChange: (value: number) => void
): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-reps-grid-compact' });
	let currentValue = value;
	const buttons: HTMLButtonElement[] = [];

	// Row 1: 1-5
	const row1 = container.createDiv({ cls: 'fit-reps-row' });
	for (let i = 1; i <= 5; i++) {
		buttons.push(createRepButton(row1, i, currentValue, (v) => {
			currentValue = v;
			updateActive(buttons, currentValue);
			onChange(v);
		}));
	}

	// Row 2: 6-10
	const row2 = container.createDiv({ cls: 'fit-reps-row' });
	for (let i = 6; i <= 10; i++) {
		buttons.push(createRepButton(row2, i, currentValue, (v) => {
			currentValue = v;
			updateActive(buttons, currentValue);
			onChange(v);
		}));
	}

	// Row 3: 11-15
	const row3 = container.createDiv({ cls: 'fit-reps-row' });
	for (let i = 11; i <= 15; i++) {
		buttons.push(createRepButton(row3, i, currentValue, (v) => {
			currentValue = v;
			updateActive(buttons, currentValue);
			onChange(v);
		}));
	}

	return container;
}

function createRepButton(
	parent: HTMLElement,
	value: number,
	currentValue: number,
	onChange: (value: number) => void
): HTMLButtonElement {
	const btn = parent.createEl('button', {
		cls: 'fit-reps-button',
		text: String(value)
	});

	if (value === currentValue) {
		btn.addClass('fit-reps-button-active');
	}

	// Store value on button for later lookup
	(btn as HTMLButtonElement & { repValue: number }).repValue = value;

	btn.addEventListener('click', (e) => {
		e.preventDefault();
		onChange(value);
	});

	return btn;
}

function updateActive(buttons: HTMLButtonElement[], currentValue: number): void {
	for (const btn of buttons) {
		const repValue = (btn as HTMLButtonElement & { repValue: number }).repValue;
		if (repValue === currentValue) {
			btn.addClass('fit-reps-button-active');
		} else {
			btn.removeClass('fit-reps-button-active');
		}
	}
}

/**
 * Creates a horizontal scrollable reps selector (single row) with scroll indicators
 */
export function createHorizontalRepsSelector(
	parent: HTMLElement,
	value: number,
	onChange: (value: number) => void
): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-reps-horizontal' });
	let currentValue = value;
	const buttons: HTMLButtonElement[] = [];

	// Left scroll indicator
	const leftIndicator = container.createDiv({ cls: 'fit-reps-scroll-indicator fit-reps-scroll-left' });
	leftIndicator.createSpan({ text: '‹' });

	// Scrollable row with all numbers 1-20
	const scroll = container.createDiv({ cls: 'fit-reps-scroll' });
	const row = scroll.createDiv({ cls: 'fit-reps-scroll-row' });

	// Right scroll indicator
	const rightIndicator = container.createDiv({ cls: 'fit-reps-scroll-indicator fit-reps-scroll-right' });
	rightIndicator.createSpan({ text: '›' });

	for (let i = 1; i <= 20; i++) {
		const btn = row.createEl('button', {
			cls: 'fit-reps-pill',
			text: String(i)
		});

		if (i === currentValue) {
			btn.addClass('fit-reps-pill-active');
		}

		(btn as HTMLButtonElement & { repValue: number }).repValue = i;

		btn.addEventListener('click', (e) => {
			e.preventDefault();
			currentValue = i;
			buttons.forEach(b => b.removeClass('fit-reps-pill-active'));
			btn.addClass('fit-reps-pill-active');
			onChange(i);
		});

		buttons.push(btn);
	}

	// Scroll by page when indicators clicked
	const scrollAmount = 200; // Approximate width of 4 buttons

	leftIndicator.addEventListener('click', () => {
		scroll.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
	});

	rightIndicator.addEventListener('click', () => {
		scroll.scrollBy({ left: scrollAmount, behavior: 'smooth' });
	});

	// Update indicator visibility based on scroll position
	const updateIndicators = () => {
		const atStart = scroll.scrollLeft <= 0;
		const atEnd = scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 1;

		leftIndicator.classList.toggle('fit-reps-scroll-hidden', atStart);
		rightIndicator.classList.toggle('fit-reps-scroll-hidden', atEnd);
	};

	scroll.addEventListener('scroll', updateIndicators);

	// Scroll to show the current value centered
	setTimeout(() => {
		const activeBtn = row.querySelector('.fit-reps-pill-active') as HTMLElement;
		if (activeBtn) {
			// Calculate scroll position to center the button
			const scrollWidth = scroll.clientWidth;
			const btnLeft = activeBtn.offsetLeft;
			const btnWidth = activeBtn.offsetWidth;
			const targetScroll = btnLeft - (scrollWidth / 2) + (btnWidth / 2);
			scroll.scrollLeft = Math.max(0, targetScroll);
		}
		updateIndicators();
	}, 0);

	return container;
}
