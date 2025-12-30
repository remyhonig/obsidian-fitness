import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createExerciseAutocomplete } from './autocomplete';
import type { Exercise } from '../../types';

describe('ExerciseAutocomplete', () => {
	let container: HTMLElement;
	const mockExercises: Exercise[] = [
		{ id: 'bench-press', name: 'Bench Press', category: 'Chest', equipment: 'Barbell' },
		{ id: 'squat', name: 'Squat', category: 'Legs', equipment: 'Barbell' },
		{ id: 'deadlift', name: 'Deadlift', category: 'Back', equipment: 'Barbell' },
		{ id: 'bicep-curl', name: 'Bicep Curl', category: 'Arms', equipment: 'Dumbbell' },
		{ id: 'tricep-extension', name: 'Tricep Extension', category: 'Arms', equipment: 'Cable' }
	];

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering', () => {
		it('should render input with placeholder', () => {
			createExerciseAutocomplete(container, {
				placeholder: 'Search exercises...',
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).not.toBeNull();
			expect(input.placeholder).toBe('Search exercises...');
		});

		it('should render input with initial value', () => {
			createExerciseAutocomplete(container, {
				value: 'Bench Press',
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('Bench Press');
		});

		it('should not show overlay initially', () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const overlay = document.body.querySelector('.fit-autocomplete-overlay');
			expect(overlay).toBeNull();
		});
	});

	describe('interaction', () => {
		it('should show overlay on focus', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;
			input.dispatchEvent(new FocusEvent('focus'));

			// Wait for async getItems and overlay creation
			await new Promise(resolve => setTimeout(resolve, 10));

			const overlay = document.body.querySelector('.fit-autocomplete-overlay');
			expect(overlay).not.toBeNull();
		});

		it('should filter items on input', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			// Get overlay input and type 'bench'
			const overlayInput = document.body.querySelector('.fit-autocomplete-overlay-input') as HTMLInputElement;
			expect(overlayInput).not.toBeNull();

			overlayInput.value = 'bench';
			overlayInput.dispatchEvent(new Event('input'));

			const results = document.body.querySelector('.fit-autocomplete-overlay-results') as HTMLElement;
			const items = results.querySelectorAll('.fit-autocomplete-item');

			expect(items.length).toBe(1);
			expect(items[0].querySelector('.fit-autocomplete-item-name')?.textContent).toBe('Bench Press');
		});

		it('should show empty state when no matches', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			// Get overlay input and type something with no match
			const overlayInput = document.body.querySelector('.fit-autocomplete-overlay-input') as HTMLInputElement;
			overlayInput.value = 'xyznotfound';
			overlayInput.dispatchEvent(new Event('input'));

			const emptyState = document.body.querySelector('.fit-autocomplete-empty');
			expect(emptyState?.textContent).toBe('No exercises found');
		});

		it('should call onSelect when item is clicked', async () => {
			const onSelect = vi.fn();
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			const items = document.body.querySelectorAll('.fit-autocomplete-item');
			(items[0] as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

			expect(onSelect).toHaveBeenCalledWith(mockExercises[0], 'Bench Press');
		});

		it('should call onChange during typing', async () => {
			const onChange = vi.fn();
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn(),
				onChange
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			// Type in overlay input
			const overlayInput = document.body.querySelector('.fit-autocomplete-overlay-input') as HTMLInputElement;
			overlayInput.value = 'test';
			overlayInput.dispatchEvent(new Event('input'));

			expect(onChange).toHaveBeenCalledWith('test');
		});

		it('should navigate with arrow keys', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			// Get overlay input and press down arrow
			const overlayInput = document.body.querySelector('.fit-autocomplete-overlay-input') as HTMLInputElement;
			overlayInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

			const selectedItem = document.body.querySelector('.fit-autocomplete-item-selected');
			expect(selectedItem).not.toBeNull();
		});

		it('should select item on Enter', async () => {
			const onSelect = vi.fn();
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			// Get overlay input, navigate to first item and press Enter
			const overlayInput = document.body.querySelector('.fit-autocomplete-overlay-input') as HTMLInputElement;
			overlayInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
			overlayInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

			expect(onSelect).toHaveBeenCalledWith(mockExercises[0], 'Bench Press');
		});

		it('should close overlay on Escape', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to open overlay
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			let overlay = document.body.querySelector('.fit-autocomplete-overlay');
			expect(overlay).not.toBeNull();

			// Press Escape in overlay input
			const overlayInput = document.body.querySelector('.fit-autocomplete-overlay-input') as HTMLInputElement;
			overlayInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

			// Overlay should be removed
			overlay = document.body.querySelector('.fit-autocomplete-overlay');
			expect(overlay).toBeNull();
		});
	});

	describe('display', () => {
		it('should show exercise category and equipment in overlay', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 150));

			const meta = document.body.querySelector('.fit-autocomplete-item-meta');
			expect(meta?.textContent).toContain('Chest');
			expect(meta?.textContent).toContain('Barbell');
		});
	});
});
