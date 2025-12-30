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
			autocomplete: 'off',
			readonly: 'true' // Make readonly to prevent keyboard on mobile until overlay opens
		}
	});

	// Create full-screen overlay (hidden by default)
	let overlay: HTMLElement | null = null;
	let overlayInput: HTMLInputElement | null = null;
	let dropdown: HTMLElement | null = null;

	let items: Exercise[] = [];
	let filteredItems: Exercise[] = [];
	let selectedIndex = -1;
	let isOpen = false;

	const createOverlay = () => {
		// Create overlay container
		overlay = document.body.createDiv({ cls: 'fit-autocomplete-overlay' });

		// Overlay header with input
		const header = overlay.createDiv({ cls: 'fit-autocomplete-overlay-header' });

		overlayInput = header.createEl('input', {
			cls: 'fit-form-input fit-autocomplete-overlay-input',
			attr: {
				type: 'text',
				placeholder: options.placeholder ?? 'Search exercises...',
				value: input.value,
				autocomplete: 'off'
			}
		});

		// Close button
		const closeBtn = header.createEl('button', {
			cls: 'fit-autocomplete-overlay-close',
			text: '×'
		});
		closeBtn.addEventListener('click', () => {
			closeOverlay();
		});

		// Results container
		dropdown = overlay.createDiv({ cls: 'fit-autocomplete-overlay-results' });

		// Auto-focus the input
		setTimeout(() => overlayInput?.focus(), 100);

		// Handle input changes in overlay
		overlayInput.addEventListener('input', () => {
			if (overlayInput) {
				options.onChange?.(overlayInput.value);
				updateDropdown();
			}
		});

		// Handle keyboard navigation in overlay
		overlayInput.addEventListener('keydown', handleKeyDown);

		// Prevent backdrop clicks from closing (only close button should close)
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				closeOverlay();
			}
		});
	};

	const closeOverlay = () => {
		if (overlay) {
			// Save overlay input value before clearing
			const finalValue = overlayInput?.value ?? input.value;

			overlay.remove();
			overlay = null;
			overlayInput = null;
			dropdown = null;
			isOpen = false;
			selectedIndex = -1;

			// Update main input with final value
			input.value = finalValue;

			// Notify of final value
			options.onSelect(null, finalValue);
		}
	};

	// Load items on first focus
	let itemsLoaded = false;
	const loadItems = async () => {
		if (!itemsLoaded) {
			items = await options.getItems();
			itemsLoaded = true;
		}
	};

	const updateDropdown = () => {
		if (!dropdown) return;

		dropdown.empty();
		const query = (overlayInput?.value || input.value).trim();

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
		if (!dropdown) return;
		const items = dropdown.querySelectorAll('.fit-autocomplete-item');
		items.forEach((item, i) => {
			item.classList.toggle('fit-autocomplete-item-selected', i === selectedIndex);
		});
	};

	const selectItem = (exercise: Exercise) => {
		input.value = exercise.name;
		options.onSelect(exercise, exercise.name);
		closeOverlay();
	};

	const openOverlay = async () => {
		await loadItems();
		createOverlay();
		updateDropdown();
		isOpen = true;
		selectedIndex = -1;
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!isOpen || !dropdown) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
				updateSelection();
				scrollToSelected();
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				updateSelection();
				scrollToSelected();
				break;
			case 'Enter': {
				e.preventDefault();
				const selectedItem = filteredItems[selectedIndex];
				if (selectedIndex >= 0 && selectedItem) {
					selectItem(selectedItem);
				} else {
					closeOverlay();
				}
			}
				break;
			case 'Escape':
				e.preventDefault();
				closeOverlay();
				break;
		}
	};

	const scrollToSelected = () => {
		if (!dropdown || selectedIndex < 0) return;
		const items = dropdown.querySelectorAll('.fit-autocomplete-item');
		const selectedEl = items[selectedIndex] as HTMLElement | undefined;
		if (selectedEl && typeof selectedEl.scrollIntoView === 'function') {
			selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	};

	// Event handlers
	input.addEventListener('click', () => {
		openOverlay().catch(console.error);
	});

	input.addEventListener('focus', () => {
		openOverlay().catch(console.error);
	});

	return wrapper;
}
