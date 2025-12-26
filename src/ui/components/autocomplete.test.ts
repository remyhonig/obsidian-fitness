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

		it('should have dropdown hidden initially', () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const dropdown = container.querySelector('.fit-autocomplete-dropdown') as HTMLElement;
			expect(dropdown.style.display).toBe('none');
		});
	});

	describe('interaction', () => {
		it('should show dropdown on focus', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;
			input.dispatchEvent(new FocusEvent('focus'));

			// Wait for async getItems
			await new Promise(resolve => setTimeout(resolve, 10));

			const dropdown = container.querySelector('.fit-autocomplete-dropdown') as HTMLElement;
			expect(dropdown.style.display).toBe('block');
		});

		it('should filter items on input', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to load items
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			// Type 'bench'
			input.value = 'bench';
			input.dispatchEvent(new Event('input'));

			const dropdown = container.querySelector('.fit-autocomplete-dropdown') as HTMLElement;
			const items = dropdown.querySelectorAll('.fit-autocomplete-item');

			expect(items.length).toBe(1);
			expect(items[0].querySelector('.fit-autocomplete-item-name')?.textContent).toBe('Bench Press');
		});

		it('should show empty state when no matches', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to load items
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			// Type something with no match
			input.value = 'xyznotfound';
			input.dispatchEvent(new Event('input'));

			const emptyState = container.querySelector('.fit-autocomplete-empty');
			expect(emptyState?.textContent).toBe('No exercises found');
		});

		it('should call onSelect when item is clicked', async () => {
			const onSelect = vi.fn();
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to load items
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			const items = container.querySelectorAll('.fit-autocomplete-item');
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
			input.value = 'test';
			input.dispatchEvent(new Event('input'));

			expect(onChange).toHaveBeenCalledWith('test');
		});

		it('should navigate with arrow keys', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to load items
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			// Press down arrow
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

			const selectedItem = container.querySelector('.fit-autocomplete-item-selected');
			expect(selectedItem).not.toBeNull();
		});

		it('should select item on Enter', async () => {
			const onSelect = vi.fn();
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to load items
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			// Navigate to first item and press Enter
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

			expect(onSelect).toHaveBeenCalledWith(mockExercises[0], 'Bench Press');
		});

		it('should close dropdown on Escape', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;

			// Focus first to load items
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			const dropdown = container.querySelector('.fit-autocomplete-dropdown') as HTMLElement;
			expect(dropdown.style.display).toBe('block');

			// Press Escape
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

			expect(dropdown.style.display).toBe('none');
		});
	});

	describe('display', () => {
		it('should show exercise category and equipment in dropdown', async () => {
			createExerciseAutocomplete(container, {
				getItems: () => Promise.resolve(mockExercises),
				onSelect: vi.fn()
			});

			const input = container.querySelector('input') as HTMLInputElement;
			input.dispatchEvent(new FocusEvent('focus'));
			await new Promise(resolve => setTimeout(resolve, 10));

			const meta = container.querySelector('.fit-autocomplete-item-meta');
			expect(meta?.textContent).toContain('Chest');
			expect(meta?.textContent).toContain('Barbell');
		});
	});
});
