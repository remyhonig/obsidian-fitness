export interface StepperOptions {
	value: number;
	min?: number;
	max?: number;
	increments: number[];
	label: string;
	unit?: string;
	decimals?: number;
	onChange: (value: number) => void;
}

/**
 * Creates a stepper component with multiple increment buttons
 */
export function createStepper(parent: HTMLElement, options: StepperOptions): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-stepper' });

	// Shared state object so all buttons reference the same value
	const state = { currentValue: options.value };

	// Current value display
	const valueDisplay = container.createDiv({ cls: 'fit-stepper-value' });
	valueDisplay.createSpan({
		cls: 'fit-stepper-number',
		text: formatValue(options.value, options.decimals)
	});
	if (options.unit) {
		valueDisplay.createSpan({ cls: 'fit-stepper-unit', text: options.unit });
	}

	// Decrement buttons (in reverse order, largest first)
	const decrementRow = container.createDiv({ cls: 'fit-stepper-row fit-stepper-decrement' });
	const sortedIncrements = [...options.increments].sort((a, b) => b - a);

	for (const inc of sortedIncrements) {
		createStepButton(decrementRow, -inc, options, valueDisplay, state);
	}

	// Increment buttons
	const incrementRow = container.createDiv({ cls: 'fit-stepper-row fit-stepper-increment' });
	for (const inc of sortedIncrements.reverse()) {
		createStepButton(incrementRow, inc, options, valueDisplay, state);
	}

	return container;
}

/**
 * Creates a single step button with long-press support
 */
function createStepButton(
	parent: HTMLElement,
	step: number,
	options: StepperOptions,
	valueDisplay: HTMLElement,
	state: { currentValue: number }
): HTMLButtonElement {
	const isPositive = step > 0;
	const absStep = Math.abs(step);
	const text = `${isPositive ? '+' : '-'}${formatIncrement(absStep)}`;

	const btn = parent.createEl('button', {
		cls: `fit-stepper-button ${isPositive ? 'fit-stepper-plus' : 'fit-stepper-minus'}`,
		text
	});

	let intervalId: number | null = null;
	let timeoutId: number | null = null;

	const updateValue = (delta: number) => {
		const newValue = state.currentValue + delta;

		// Apply bounds
		if (options.min !== undefined && newValue < options.min) {
			state.currentValue = options.min;
		} else if (options.max !== undefined && newValue > options.max) {
			state.currentValue = options.max;
		} else {
			state.currentValue = newValue;
		}

		// Round to avoid floating point issues
		state.currentValue = roundToDecimals(state.currentValue, options.decimals ?? 2);

		// Update display
		const numberEl = valueDisplay.querySelector('.fit-stepper-number');
		if (numberEl) {
			numberEl.textContent = formatValue(state.currentValue, options.decimals);
		}

		options.onChange(state.currentValue);
	};

	const startRapid = () => {
		intervalId = window.setInterval(() => updateValue(step), 100);
	};

	const stopRapid = () => {
		if (timeoutId !== null) {
			window.clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (intervalId !== null) {
			window.clearInterval(intervalId);
			intervalId = null;
		}
	};

	// Click handler
	btn.addEventListener('click', (e) => {
		e.preventDefault();
		updateValue(step);
	});

	// Touch events for long-press rapid increment
	btn.addEventListener('touchstart', (e) => {
		e.preventDefault();
		updateValue(step);
		timeoutId = window.setTimeout(startRapid, 500);
	}, { passive: false });

	btn.addEventListener('touchend', stopRapid);
	btn.addEventListener('touchcancel', stopRapid);

	// Mouse events for long-press (desktop)
	btn.addEventListener('mousedown', () => {
		timeoutId = window.setTimeout(startRapid, 500);
	});

	btn.addEventListener('mouseup', stopRapid);
	btn.addEventListener('mouseleave', stopRapid);

	return btn;
}

/**
 * Formats a value for display
 */
function formatValue(value: number, decimals?: number): string {
	const d = decimals ?? (Number.isInteger(value) ? 0 : 1);
	return value.toFixed(d);
}

/**
 * Formats an increment value for button text
 */
function formatIncrement(value: number): string {
	if (Number.isInteger(value)) {
		return String(value);
	}
	// Remove trailing zeros
	return value.toString();
}

/**
 * Rounds a number to specified decimal places
 */
function roundToDecimals(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

/**
 * Creates a simple +/- stepper for reps
 */
export function createSimpleStepper(
	parent: HTMLElement,
	value: number,
	min: number,
	max: number,
	onChange: (value: number) => void
): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-simple-stepper' });

	let currentValue = value;

	const minusBtn = container.createEl('button', {
		cls: 'fit-stepper-button fit-stepper-minus',
		text: '-'
	});

	const valueDisplay = container.createDiv({
		cls: 'fit-simple-stepper-value',
		text: String(currentValue)
	});

	const plusBtn = container.createEl('button', {
		cls: 'fit-stepper-button fit-stepper-plus',
		text: '+'
	});

	const update = (delta: number) => {
		const newValue = currentValue + delta;
		if (newValue >= min && newValue <= max) {
			currentValue = newValue;
			valueDisplay.textContent = String(currentValue);
			onChange(currentValue);
		}
	};

	minusBtn.addEventListener('click', () => update(-1));
	plusBtn.addEventListener('click', () => update(1));

	return container;
}

/**
 * Formats weight for display - no decimals if whole number
 */
export function formatWeight(value: number): string {
	if (Number.isInteger(value)) {
		return String(value);
	}
	// Remove trailing zeros
	return value.toFixed(2).replace(/\.?0+$/, '');
}

export interface CompactWeightStepperOptions {
	value: number;
	unit: string;
	smallIncrement: number;  // e.g., 0.5 or 1.25
	largeIncrement: number;  // e.g., 2.5 or 5
	onChange: (value: number) => void;
}

/**
 * Creates a compact horizontal weight stepper with large display
 */
export function createCompactWeightStepper(parent: HTMLElement, options: CompactWeightStepperOptions): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-compact-weight' });
	const state = { currentValue: options.value };

	// Main row with buttons and display
	const row = container.createDiv({ cls: 'fit-compact-weight-row' });

	// Left buttons (decrease)
	const leftBtns = row.createDiv({ cls: 'fit-compact-weight-btns' });
	createCompactWeightBtn(leftBtns, -options.largeIncrement, state, options, container);
	createCompactWeightBtn(leftBtns, -options.smallIncrement, state, options, container);

	// Center display
	const display = row.createDiv({ cls: 'fit-compact-weight-display' });
	display.createSpan({ cls: 'fit-compact-weight-value', text: formatWeight(state.currentValue) });
	display.createSpan({ cls: 'fit-compact-weight-unit', text: options.unit });

	// Right buttons (increase)
	const rightBtns = row.createDiv({ cls: 'fit-compact-weight-btns' });
	createCompactWeightBtn(rightBtns, options.smallIncrement, state, options, container);
	createCompactWeightBtn(rightBtns, options.largeIncrement, state, options, container);

	return container;
}

function createCompactWeightBtn(
	parent: HTMLElement,
	step: number,
	state: { currentValue: number },
	options: CompactWeightStepperOptions,
	container: HTMLElement
): void {
	const isPositive = step > 0;
	const absStep = Math.abs(step);
	const text = `${isPositive ? '+' : '−'}${formatWeight(absStep)}`;

	const btn = parent.createEl('button', {
		cls: `fit-compact-weight-btn ${isPositive ? 'fit-plus' : 'fit-minus'}`,
		text
	});

	let intervalId: number | null = null;
	let timeoutId: number | null = null;

	const updateValue = () => {
		const newValue = Math.max(0, state.currentValue + step);
		state.currentValue = Math.round(newValue * 100) / 100; // Avoid floating point issues

		const valueEl = container.querySelector('.fit-compact-weight-value');
		if (valueEl) {
			valueEl.textContent = formatWeight(state.currentValue);
		}
		options.onChange(state.currentValue);
	};

	const startRapid = () => {
		intervalId = window.setInterval(updateValue, 100);
	};

	const stopRapid = () => {
		if (timeoutId) { window.clearTimeout(timeoutId); timeoutId = null; }
		if (intervalId) { window.clearInterval(intervalId); intervalId = null; }
	};

	btn.addEventListener('click', (e) => { e.preventDefault(); updateValue(); });
	btn.addEventListener('touchstart', (e) => { e.preventDefault(); updateValue(); timeoutId = window.setTimeout(startRapid, 400); }, { passive: false });
	btn.addEventListener('touchend', stopRapid);
	btn.addEventListener('touchcancel', stopRapid);
	btn.addEventListener('mousedown', () => { timeoutId = window.setTimeout(startRapid, 400); });
	btn.addEventListener('mouseup', stopRapid);
	btn.addEventListener('mouseleave', stopRapid);
}
