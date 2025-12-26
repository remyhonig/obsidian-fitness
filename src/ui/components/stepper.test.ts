import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStepper, createSimpleStepper } from './stepper';
import { click } from '../../test/mocks';

describe('Stepper', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('createStepper', () => {
		it('should render initial value', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('80');
		});

		it('should render increment buttons', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const plusButtons = container.querySelectorAll('.fit-stepper-plus');
			expect(plusButtons.length).toBe(2);
		});

		it('should render decrement buttons', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const minusButtons = container.querySelectorAll('.fit-stepper-minus');
			expect(minusButtons.length).toBe(2);
		});

		it('should increase value when + button is clicked', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const plusButton = container.querySelector('.fit-stepper-plus') as HTMLElement;
			click(plusButton);

			expect(onChange).toHaveBeenCalledWith(82.5);
			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('82.5');
		});

		it('should decrease value when - button is clicked', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const minusButton = container.querySelector('.fit-stepper-minus') as HTMLElement;
			click(minusButton);

			expect(onChange).toHaveBeenCalledWith(70);
			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('70');
		});

		it('should handle multiple increases correctly', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			// Click +2.5 twice (first button in increment row is the smaller increment)
			const smallPlusButton = container.querySelector('.fit-stepper-increment .fit-stepper-plus:first-child') as HTMLElement;
			click(smallPlusButton);
			click(smallPlusButton);

			expect(onChange).toHaveBeenLastCalledWith(85);
			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('85');
		});

		it('should handle multiple decreases correctly', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			// Click -10 twice (first button in decrement row is the largest decrement)
			const largeMinusButton = container.querySelector('.fit-stepper-decrement .fit-stepper-minus:first-child') as HTMLElement;
			click(largeMinusButton);
			click(largeMinusButton);

			expect(onChange).toHaveBeenLastCalledWith(60);
			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('60');
		});

		it('should handle mixed increases and decreases correctly', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			// Get buttons
			const buttons = container.querySelectorAll('.fit-stepper-button');
			// Decrement row has: -10, -2.5 (in that order based on sortedIncrements.reverse for display)
			// Increment row has: +2.5, +10 (smallest first based on sortedIncrements.reverse())
			const minusButtons = container.querySelectorAll('.fit-stepper-minus');
			const plusButtons = container.querySelectorAll('.fit-stepper-plus');

			// Start at 80
			// Click +10 -> should be 90
			const plus10 = Array.from(plusButtons).find(b => b.textContent === '+10') as HTMLElement;
			click(plus10);
			expect(onChange).toHaveBeenLastCalledWith(90);

			// Click -2.5 -> should be 87.5 (NOT 77.5!)
			const minus2_5 = Array.from(minusButtons).find(b => b.textContent === '-2.5') as HTMLElement;
			click(minus2_5);
			expect(onChange).toHaveBeenLastCalledWith(87.5);

			// Click +2.5 -> should be 90
			const plus2_5 = Array.from(plusButtons).find(b => b.textContent === '+2.5') as HTMLElement;
			click(plus2_5);
			expect(onChange).toHaveBeenLastCalledWith(90);

			// Click -10 -> should be 80
			const minus10 = Array.from(minusButtons).find(b => b.textContent === '-10') as HTMLElement;
			click(minus10);
			expect(onChange).toHaveBeenLastCalledWith(80);

			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('80');
		});

		it('should not go below minimum', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 5,
				min: 0,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const minusButton = container.querySelector('.fit-stepper-minus') as HTMLElement;
			click(minusButton); // Try to subtract 10 from 5

			expect(onChange).toHaveBeenCalledWith(0); // Should clamp to 0
		});

		it('should not go above maximum', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 95,
				max: 100,
				increments: [10, 2.5],
				label: 'Weight',
				unit: 'kg',
				onChange
			});

			const plusButton = Array.from(container.querySelectorAll('.fit-stepper-plus'))
				.find(b => b.textContent === '+10') as HTMLElement;
			click(plusButton); // Try to add 10 to 95

			expect(onChange).toHaveBeenCalledWith(100); // Should clamp to 100
		});

		it('should handle decimal precision correctly', () => {
			const onChange = vi.fn();
			createStepper(container, {
				value: 80,
				increments: [0.25],
				label: 'Weight',
				unit: 'kg',
				decimals: 2,
				onChange
			});

			const plusButton = container.querySelector('.fit-stepper-plus') as HTMLElement;

			// Click multiple times to test floating point precision
			click(plusButton); // 80.25
			click(plusButton); // 80.50
			click(plusButton); // 80.75
			click(plusButton); // 81.00

			expect(onChange).toHaveBeenLastCalledWith(81);
			const display = container.querySelector('.fit-stepper-number');
			expect(display?.textContent).toBe('81.00');
		});
	});

	describe('createSimpleStepper', () => {
		it('should render initial value', () => {
			const onChange = vi.fn();
			createSimpleStepper(container, 8, 1, 15, onChange);

			const display = container.querySelector('.fit-simple-stepper-value');
			expect(display?.textContent).toBe('8');
		});

		it('should increase value when + is clicked', () => {
			const onChange = vi.fn();
			createSimpleStepper(container, 8, 1, 15, onChange);

			const plusButton = container.querySelector('.fit-stepper-plus') as HTMLElement;
			click(plusButton);

			expect(onChange).toHaveBeenCalledWith(9);
		});

		it('should decrease value when - is clicked', () => {
			const onChange = vi.fn();
			createSimpleStepper(container, 8, 1, 15, onChange);

			const minusButton = container.querySelector('.fit-stepper-minus') as HTMLElement;
			click(minusButton);

			expect(onChange).toHaveBeenCalledWith(7);
		});

		it('should not go below minimum', () => {
			const onChange = vi.fn();
			createSimpleStepper(container, 1, 1, 15, onChange);

			const minusButton = container.querySelector('.fit-stepper-minus') as HTMLElement;
			click(minusButton);

			expect(onChange).not.toHaveBeenCalled();
		});

		it('should not go above maximum', () => {
			const onChange = vi.fn();
			createSimpleStepper(container, 15, 1, 15, onChange);

			const plusButton = container.querySelector('.fit-stepper-plus') as HTMLElement;
			click(plusButton);

			expect(onChange).not.toHaveBeenCalled();
		});
	});
});
