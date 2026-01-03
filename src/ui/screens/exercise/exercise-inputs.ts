/**
 * Weight input component for exercise screen
 */

import { formatWeight, formatWeightNumeric } from '../../components/stepper';
import type { PluginSettings } from '../../../settings';

export interface WeightInputOptions {
	settings: PluginSettings;
	initialWeight: number;
	onWeightChange: (weight: number) => void;
}

export interface WeightInputRefs {
	container: HTMLElement;
	destroy: () => void;
}

/**
 * Creates a weight input with increment/decrement buttons
 */
export function createWeightInput(
	parent: HTMLElement,
	options: WeightInputOptions
): WeightInputRefs {
	const { settings, initialWeight, onWeightChange } = options;
	const unit = settings.weightUnit;
	const smallInc = unit === 'kg' ? 0.5 : 1.25;
	const largeInc = unit === 'kg' ? 2.5 : 5;

	const cleanup: (() => void)[] = [];
	let currentWeight = initialWeight;

	const container = parent.createDiv({ cls: 'fit-weight-input-container' });

	// Left buttons (decrease)
	const leftBtns = container.createDiv({ cls: 'fit-weight-btns' });
	cleanup.push(createWeightBtn(leftBtns, -largeInc, () => currentWeight, updateWeight, container));
	cleanup.push(createWeightBtn(leftBtns, -smallInc, () => currentWeight, updateWeight, container));

	// Center input with unit
	const inputWrapper = container.createDiv({ cls: 'fit-weight-input-wrapper' });
	const input = inputWrapper.createEl('input', {
		cls: 'fit-weight-input',
		type: 'number'
	});
	input.setAttribute('step', String(smallInc));
	input.setAttribute('min', '0');
	// Set value property directly (not just attribute) for cross-environment compatibility
	input.value = String(currentWeight);

	inputWrapper.createSpan({ cls: 'fit-weight-unit', text: unit });

	const changeHandler = () => {
		const val = parseFloat(input.value);
		if (!isNaN(val) && val >= 0) {
			currentWeight = val;
			onWeightChange(currentWeight);
			input.value = formatWeightNumeric(currentWeight);
		}
	};

	const blurHandler = () => {
		input.value = formatWeightNumeric(currentWeight);
	};

	input.addEventListener('change', changeHandler);
	input.addEventListener('blur', blurHandler);
	cleanup.push(() => {
		input.removeEventListener('change', changeHandler);
		input.removeEventListener('blur', blurHandler);
	});

	// Right buttons (increase)
	const rightBtns = container.createDiv({ cls: 'fit-weight-btns' });
	cleanup.push(createWeightBtn(rightBtns, smallInc, () => currentWeight, updateWeight, container));
	cleanup.push(createWeightBtn(rightBtns, largeInc, () => currentWeight, updateWeight, container));

	function updateWeight(newWeight: number): void {
		currentWeight = newWeight;
		onWeightChange(currentWeight);
		const inputEl = container.querySelector('.fit-weight-input') as HTMLInputElement;
		if (inputEl) {
			inputEl.value = formatWeightNumeric(currentWeight);
		}
	}

	return {
		container,
		destroy: () => cleanup.forEach(fn => fn())
	};
}

/**
 * Creates a single weight increment/decrement button
 */
function createWeightBtn(
	parent: HTMLElement,
	step: number,
	getCurrentWeight: () => number,
	onUpdate: (newWeight: number) => void,
	container: HTMLElement
): () => void {
	const isPositive = step > 0;
	const absStep = Math.abs(step);
	const text = `${isPositive ? '+' : '−'}${formatWeight(absStep)}`;

	const btn = parent.createEl('button', {
		cls: `fit-weight-btn ${isPositive ? 'fit-plus' : 'fit-minus'}`,
		text
	});

	let intervalId: number | null = null;
	let timeoutId: number | null = null;

	const updateValue = () => {
		const newWeight = Math.max(0, getCurrentWeight() + step);
		onUpdate(newWeight);
	};

	const startRapid = () => {
		intervalId = window.setInterval(updateValue, 100);
	};

	const stopRapid = () => {
		if (timeoutId) { window.clearTimeout(timeoutId); timeoutId = null; }
		if (intervalId) { window.clearInterval(intervalId); intervalId = null; }
	};

	const clickHandler = (e: Event) => { e.preventDefault(); updateValue(); };
	const touchStartHandler = (e: Event) => {
		e.preventDefault();
		updateValue();
		timeoutId = window.setTimeout(startRapid, 400);
	};
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
