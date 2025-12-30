/**
 * Question card component for questionnaire screens
 */

import type { Question } from '../../types';
import { createSelectableGrid, type SelectableGridOption, type SelectableGridRefs } from './selectable-grid';

export interface QuestionCardOptions {
	question: Question;
	selectedOptionId?: string;
	freeText?: string;
	onSelect: (optionId: string) => void;
	onFreeTextChange?: (text: string) => void;
}

export interface QuestionCardRefs {
	container: HTMLElement;
	setSelected: (optionId: string | undefined) => void;
	destroy: () => void;
}

/**
 * Creates a question card with multiple choice options
 */
export function createQuestionCard(parent: HTMLElement, options: QuestionCardOptions): QuestionCardRefs {
	const container = parent.createDiv({ cls: 'fit-question-card' });
	const cleanup: (() => void)[] = [];

	// Question text
	container.createDiv({ cls: 'fit-question-text', text: options.question.text });

	// Build options for selectable grid
	const gridOptions: SelectableGridOption<string>[] = options.question.options.map(opt => ({
		value: opt.id,
		label: opt.label
	}));

	// Track free text container for show/hide logic
	let freeTextContainer: HTMLElement | null = null;

	// Handle selection with free text toggle
	const handleSelect = (optionId: string) => {
		options.onSelect(optionId);

		// Show/hide free text input if this option triggers it
		if (freeTextContainer) {
			if (options.question.freeTextTrigger === optionId) {
				freeTextContainer.removeClass('is-hidden');
			} else {
				freeTextContainer.addClass('is-hidden');
			}
		}
	};

	// Use generic selectable grid
	const gridRefs: SelectableGridRefs<string> = createSelectableGrid(container, {
		classPrefix: 'fit-question',
		options: gridOptions,
		selectedValue: options.selectedOptionId,
		onSelect: handleSelect,
		layout: 'row'
	});
	cleanup.push(gridRefs.destroy);

	// Free text input (hidden by default unless triggered option is selected)
	if (options.question.allowFreeText && options.question.freeTextTrigger) {
		freeTextContainer = container.createDiv({ cls: 'fit-question-freetext' });

		// Initially hide unless the trigger option is already selected
		if (options.selectedOptionId !== options.question.freeTextTrigger) {
			freeTextContainer.addClass('is-hidden');
		}

		const textarea = freeTextContainer.createEl('textarea', {
			cls: 'fit-question-freetext-input',
			placeholder: 'Geef hier je toelichting...'
		});

		if (options.question.freeTextMaxLength) {
			textarea.maxLength = options.question.freeTextMaxLength;
		}

		if (options.freeText) {
			textarea.value = options.freeText;
		}

		const inputHandler = () => {
			options.onFreeTextChange?.(textarea.value);
		};
		textarea.addEventListener('input', inputHandler);
		cleanup.push(() => textarea.removeEventListener('input', inputHandler));
	}

	return {
		container,
		setSelected: gridRefs.setSelected,
		destroy: () => cleanup.forEach(fn => fn())
	};
}
