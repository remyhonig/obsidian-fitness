import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Question, QuestionAnswer, SessionReview } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton, createPrimaryAction } from '../components/button';
import { createQuestionCard } from '../components/question-card';

interface AnswerState {
	selectedOptionId?: string;
	freeText?: string;
}

/**
 * Questionnaire screen - post-workout review questions
 */
export class QuestionnaireScreen extends BaseScreen {
	private sessionId: string;
	private programId: string;
	private questions: Question[];
	private answers: Map<string, AnswerState> = new Map();
	private completeBtn: HTMLButtonElement | null = null;

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-questionnaire-screen');
		this.sessionId = params.sessionId ?? '';
		this.programId = params.programId ?? '';
		this.questions = params.questions ?? [];
	}

	render(): void {
		this.prepareRender();

		// If no questions, skip to finish
		if (this.questions.length === 0) {
			this.ctx.view.navigateTo('finish', { sessionId: this.sessionId });
			return;
		}

		this.renderContent();
	}

	private renderContent(): void {
		// Header with consistent screen-header component (no back button on questionnaire)
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'none',
			fallbackWorkoutName: 'Training review',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState
		});

		// Questions
		const questionsContainer = this.containerEl.createDiv({ cls: 'fit-questionnaire-questions' });

		for (const question of this.questions) {
			const answer = this.answers.get(question.id);
			createQuestionCard(questionsContainer, {
				question,
				selectedOptionId: answer?.selectedOptionId,
				freeText: answer?.freeText,
				onSelect: (optionId) => {
					const current = this.answers.get(question.id) ?? {};
					this.answers.set(question.id, { ...current, selectedOptionId: optionId });
					this.updateCompleteButtonState();
				},
				onFreeTextChange: (text) => {
					const current = this.answers.get(question.id) ?? {};
					this.answers.set(question.id, { ...current, freeText: text });
				}
			});
		}

		// Actions
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions fit-questionnaire-actions' });

		createButton(actions, {
			text: 'Overslaan',
			variant: 'secondary',
			onClick: () => { void this.saveReview(true); }
		});

		this.completeBtn = createPrimaryAction(actions, 'Voltooien', () => {
			void this.saveReview(false);
		}, !this.allQuestionsAnswered());
	}

	private allQuestionsAnswered(): boolean {
		return this.questions.every(q => {
			const answer = this.answers.get(q.id);
			return answer?.selectedOptionId !== undefined;
		});
	}

	private updateCompleteButtonState(): void {
		if (this.completeBtn) {
			this.completeBtn.disabled = !this.allQuestionsAnswered();
		}
	}

	private async saveReview(skipped: boolean): Promise<void> {
		// Build the answers array
		const answersArray: QuestionAnswer[] = [];

		if (!skipped) {
			for (const question of this.questions) {
				const answer = this.answers.get(question.id);
				if (answer?.selectedOptionId) {
					const selectedOption = question.options.find(o => o.id === answer.selectedOptionId);
					if (selectedOption) {
						answersArray.push({
							questionId: question.id,
							questionText: question.text,
							selectedOptionId: selectedOption.id,
							selectedOptionLabel: selectedOption.label,
							freeText: answer.freeText
						});
					}
				}
			}
		}

		// Create the review object
		const review: SessionReview = {
			programId: this.programId,
			completedAt: new Date().toISOString(),
			answers: answersArray,
			skipped
		};

		// Save to the session
		try {
			await this.ctx.sessionRepo.addReview(this.sessionId, review);
		} catch (error) {
			console.error('Failed to save review:', error);
		}

		// Navigate to finish screen
		this.ctx.view.navigateTo('finish', { sessionId: this.sessionId });
	}

	destroy(): void {
		super.destroy();
	}
}
