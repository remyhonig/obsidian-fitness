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

export interface StepperRefs {
	container: HTMLElement;
	destroy: () => void;
}

/**
 * Creates a stepper component with multiple increment buttons
 */
export function createStepper(parent: HTMLElement, options: StepperOptions): StepperRefs {
	const container = parent.createDiv({ cls: 'fit-stepper' });
	const cleanup: (() => void)[] = [];

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
		const btnCleanup = createStepButton(decrementRow, -inc, options, valueDisplay, state);
		cleanup.push(btnCleanup);
	}

	// Increment buttons
	const incrementRow = container.createDiv({ cls: 'fit-stepper-row fit-stepper-increment' });
	for (const inc of sortedIncrements.reverse()) {
		const btnCleanup = createStepButton(incrementRow, inc, options, valueDisplay, state);
		cleanup.push(btnCleanup);
	}

	return {
		container,
		destroy: () => cleanup.forEach(fn => fn())
	};
}

/**
 * Creates a single step button with long-press support
 * Returns a cleanup function
 */
function createStepButton(
	parent: HTMLElement,
	step: number,
	options: StepperOptions,
	valueDisplay: HTMLElement,
	state: { currentValue: number }
): () => void {
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
	const clickHandler = (e: Event) => {
		e.preventDefault();
		updateValue(step);
	};
	btn.addEventListener('click', clickHandler);

	// Touch events for long-press rapid increment
	const touchStartHandler = (e: TouchEvent) => {
		e.preventDefault();
		updateValue(step);
		timeoutId = window.setTimeout(startRapid, 500);
	};
	btn.addEventListener('touchstart', touchStartHandler, { passive: false });
	btn.addEventListener('touchend', stopRapid);
	btn.addEventListener('touchcancel', stopRapid);

	// Mouse events for long-press (desktop)
	const mouseDownHandler = () => {
		timeoutId = window.setTimeout(startRapid, 500);
	};
	btn.addEventListener('mousedown', mouseDownHandler);
	btn.addEventListener('mouseup', stopRapid);
	btn.addEventListener('mouseleave', stopRapid);

	// Return cleanup function
	return () => {
		stopRapid(); // Clear any running timers
		btn.removeEventListener('click', clickHandler);
		btn.removeEventListener('touchstart', touchStartHandler);
		btn.removeEventListener('touchend', stopRapid);
		btn.removeEventListener('touchcancel', stopRapid);
		btn.removeEventListener('mousedown', mouseDownHandler);
		btn.removeEventListener('mouseup', stopRapid);
		btn.removeEventListener('mouseleave', stopRapid);
	};
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

export interface SimpleStepperRefs {
	container: HTMLElement;
	destroy: () => void;
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
): SimpleStepperRefs {
	const container = parent.createDiv({ cls: 'fit-simple-stepper' });
	const cleanup: (() => void)[] = [];

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

	const minusHandler = () => update(-1);
	const plusHandler = () => update(1);

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

/**
 * Formats weight for display - returns "BW" for body weight (0), no decimals if whole number
 */
export function formatWeight(value: number): string {
	if (value === 0) {
		return 'BW';
	}
	if (Number.isInteger(value)) {
		return String(value);
	}
	// Remove trailing zeros
	return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Formats weight as a numeric string (for input fields) - no decimals if whole number
 */
export function formatWeightNumeric(value: number): string {
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

export interface CompactWeightStepperRefs {
	container: HTMLElement;
	destroy: () => void;
}

/**
 * Creates a compact horizontal weight stepper with large display
 */
export function createCompactWeightStepper(parent: HTMLElement, options: CompactWeightStepperOptions): CompactWeightStepperRefs {
	const container = parent.createDiv({ cls: 'fit-compact-weight' });
	const state = { currentValue: options.value };
	const cleanup: (() => void)[] = [];

	// Main row with buttons and display
	const row = container.createDiv({ cls: 'fit-compact-weight-row' });

	// Left buttons (decrease)
	const leftBtns = row.createDiv({ cls: 'fit-compact-weight-btns' });
	cleanup.push(createCompactWeightBtn(leftBtns, -options.largeIncrement, state, options, container));
	cleanup.push(createCompactWeightBtn(leftBtns, -options.smallIncrement, state, options, container));

	// Center display
	const display = row.createDiv({ cls: 'fit-compact-weight-display' });
	display.createSpan({ cls: 'fit-compact-weight-value', text: formatWeight(state.currentValue) });
	display.createSpan({ cls: 'fit-compact-weight-unit', text: options.unit });

	// Right buttons (increase)
	const rightBtns = row.createDiv({ cls: 'fit-compact-weight-btns' });
	cleanup.push(createCompactWeightBtn(rightBtns, options.smallIncrement, state, options, container));
	cleanup.push(createCompactWeightBtn(rightBtns, options.largeIncrement, state, options, container));

	return {
		container,
		destroy: () => cleanup.forEach(fn => fn())
	};
}

function createCompactWeightBtn(
	parent: HTMLElement,
	step: number,
	state: { currentValue: number },
	options: CompactWeightStepperOptions,
	container: HTMLElement
): () => void {
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

	const clickHandler = (e: Event) => { e.preventDefault(); updateValue(); };
	const touchStartHandler = (e: TouchEvent) => { e.preventDefault(); updateValue(); timeoutId = window.setTimeout(startRapid, 400); };
	const mouseDownHandler = () => { timeoutId = window.setTimeout(startRapid, 400); };

	btn.addEventListener('click', clickHandler);
	btn.addEventListener('touchstart', touchStartHandler, { passive: false });
	btn.addEventListener('touchend', stopRapid);
	btn.addEventListener('touchcancel', stopRapid);
	btn.addEventListener('mousedown', mouseDownHandler);
	btn.addEventListener('mouseup', stopRapid);
	btn.addEventListener('mouseleave', stopRapid);

	return () => {
		stopRapid();
		btn.removeEventListener('click', clickHandler);
		btn.removeEventListener('touchstart', touchStartHandler);
		btn.removeEventListener('touchend', stopRapid);
		btn.removeEventListener('touchcancel', stopRapid);
		btn.removeEventListener('mousedown', mouseDownHandler);
		btn.removeEventListener('mouseup', stopRapid);
		btn.removeEventListener('mouseleave', stopRapid);
	};
}
