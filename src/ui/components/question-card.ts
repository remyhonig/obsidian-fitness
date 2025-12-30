import type { Question } from '../../types';

export interface QuestionCardOptions {
	question: Question;
	selectedOptionId?: string;
	freeText?: string;
	onSelect: (optionId: string) => void;
	onFreeTextChange?: (text: string) => void;
}

/**
 * Creates a question card with multiple choice options
 * Similar to RPE selector but for questionnaire questions
 */
export function createQuestionCard(parent: HTMLElement, options: QuestionCardOptions): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-question-card' });

	// Question text
	container.createDiv({ cls: 'fit-question-text', text: options.question.text });

	// Options list
	const list = container.createDiv({ cls: 'fit-question-options' });

	for (const opt of options.question.options) {
		const isSelected = options.selectedOptionId === opt.id;
		const item = list.createDiv({
			cls: `fit-question-option ${isSelected ? 'fit-question-option-selected' : ''}`
		});

		item.createSpan({ cls: 'fit-question-option-label', text: opt.label });

		item.addEventListener('click', () => {
			// Remove selection from all items
			list.querySelectorAll('.fit-question-option').forEach(el => {
				el.removeClass('fit-question-option-selected');
			});
			// Select this item
			item.addClass('fit-question-option-selected');
			options.onSelect(opt.id);

			// Show/hide free text input if this option triggers it
			const freeTextContainer = container.querySelector('.fit-question-freetext');
			if (freeTextContainer instanceof HTMLElement) {
				if (options.question.freeTextTrigger === opt.id) {
					freeTextContainer.toggleClass('is-hidden', false);
				} else {
					freeTextContainer.toggleClass('is-hidden', true);
				}
			}
		});
	}

	// Free text input (hidden by default unless triggered option is selected)
	if (options.question.allowFreeText && options.question.freeTextTrigger) {
		const freeTextContainer = container.createDiv({ cls: 'fit-question-freetext' });

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

		textarea.addEventListener('input', () => {
			options.onFreeTextChange?.(textarea.value);
		});
	}

	return container;
}
