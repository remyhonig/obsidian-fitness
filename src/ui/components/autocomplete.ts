import type { Exercise } from '../../types';

/**
 * Normalizes a string for fuzzy matching by removing separators and converting to lowercase
 * e.g., "pull-up" -> "pullup", "Pull Up" -> "pullup"
 */
function normalizeForSearch(text: string): string {
	return text.toLowerCase().replace(/[-_\s]+/g, '');
}

export interface AutocompleteOptions {
	placeholder?: string;
	value?: string;
	getItems: () => Promise<Exercise[]>;
	onSelect: (exercise: Exercise | null, text: string) => void;
	onChange?: (text: string) => void;
}

/**
 * Creates an autocomplete input for exercise selection
 */
export function createExerciseAutocomplete(
	parent: HTMLElement,
	options: AutocompleteOptions
): HTMLElement {
	const wrapper = parent.createDiv({ cls: 'fit-autocomplete' });

	const input = wrapper.createEl('input', {
		cls: 'fit-form-input fit-autocomplete-input',
		attr: {
			type: 'text',
			placeholder: options.placeholder ?? 'Search exercises...',
			value: options.value ?? '',
			autocomplete: 'off'
		}
	});

	const dropdown = wrapper.createDiv({ cls: 'fit-autocomplete-dropdown is-hidden' });

	let items: Exercise[] = [];
	let filteredItems: Exercise[] = [];
	let selectedIndex = -1;
	let isOpen = false;

	// Load items on first focus
	let itemsLoaded = false;
	const loadItems = async () => {
		if (!itemsLoaded) {
			items = await options.getItems();
			itemsLoaded = true;
		}
	};

	const updateDropdown = () => {
		dropdown.empty();
		const query = input.value.trim();

		if (!query) {
			filteredItems = items.slice(0, 10); // Show first 10 when empty
		} else {
			// Split query into words and normalize each
			const queryWords = query.toLowerCase().split(/[-_\s]+/).filter(w => w.length > 0);
			filteredItems = items
				.filter(e => {
					const normalizedName = normalizeForSearch(e.name);
					// All query words must be present in the name (in any order)
					return queryWords.every(word => normalizedName.includes(word));
				})
				.slice(0, 10);
		}

		if (filteredItems.length === 0) {
			if (query) {
				dropdown.createDiv({
					cls: 'fit-autocomplete-empty',
					text: 'No exercises found'
				});
			}
			return;
		}

		for (let i = 0; i < filteredItems.length; i++) {
			const exercise = filteredItems[i];
			if (!exercise) continue;

			const item = dropdown.createDiv({
				cls: `fit-autocomplete-item${i === selectedIndex ? ' fit-autocomplete-item-selected' : ''}`
			});

			item.createDiv({ cls: 'fit-autocomplete-item-name', text: exercise.name });

			if (exercise.category || exercise.equipment) {
				const meta = item.createDiv({ cls: 'fit-autocomplete-item-meta' });
				if (exercise.category) {
					meta.createSpan({ text: exercise.category });
				}
				if (exercise.equipment) {
					if (exercise.category) meta.createSpan({ text: ' • ' });
					meta.createSpan({ text: exercise.equipment });
				}
			}

			item.addEventListener('mousedown', (e) => {
				e.preventDefault(); // Prevent blur
				selectItem(exercise);
			});

			item.addEventListener('mouseenter', () => {
				selectedIndex = i;
				updateSelection();
			});
		}
	};

	const updateSelection = () => {
		const items = dropdown.querySelectorAll('.fit-autocomplete-item');
		items.forEach((item, i) => {
			item.classList.toggle('fit-autocomplete-item-selected', i === selectedIndex);
		});
	};

	const selectItem = (exercise: Exercise) => {
		input.value = exercise.name;
		options.onSelect(exercise, exercise.name);
		closeDropdown();
	};

	const openDropdown = async () => {
		await loadItems();
		updateDropdown();
		dropdown.removeClass('is-hidden');
		isOpen = true;
		selectedIndex = -1;
	};

	const closeDropdown = () => {
		dropdown.addClass('is-hidden');
		isOpen = false;
		selectedIndex = -1;
	};

	// Event handlers
	input.addEventListener('focus', () => {
		openDropdown().catch(console.error);
	});

	input.addEventListener('blur', () => {
		// Delay close to allow click on dropdown item
		setTimeout(() => {
			closeDropdown();
			// Notify of final value
			options.onSelect(null, input.value);
		}, 150);
	});

	input.addEventListener('input', () => {
		options.onChange?.(input.value);
		if (isOpen) {
			selectedIndex = -1;
			updateDropdown();
		} else {
			openDropdown().catch(console.error);
		}
	});

	input.addEventListener('keydown', (e) => {
		if (!isOpen) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				openDropdown().catch(console.error);
				e.preventDefault();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
				updateSelection();
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				updateSelection();
				break;
			case 'Enter': {
				e.preventDefault();
				const selectedItem = filteredItems[selectedIndex];
				if (selectedIndex >= 0 && selectedItem) {
					selectItem(selectedItem);
				} else {
					closeDropdown();
					options.onSelect(null, input.value);
				}
			}
				break;
			case 'Escape':
				e.preventDefault();
				closeDropdown();
				break;
			case 'Tab':
				closeDropdown();
				break;
		}
	});

	return wrapper;
}
