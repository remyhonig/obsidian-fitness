import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Question, QuestionAnswer, SessionReview } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton } from '../components/button';
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
	private isEditing = false;
	private fromSessionDetail = false;

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-questionnaire-screen');
		this.sessionId = params.sessionId ?? '';
		this.programId = params.programId ?? '';
		this.questions = params.questions ?? [];
		this.fromSessionDetail = params.fromScreen === 'session-detail';
	}

	render(): void {
		this.prepareRender();

		// If no questions, skip to finish
		if (this.questions.length === 0) {
			this.ctx.view.navigateTo('finish', { sessionId: this.sessionId });
			return;
		}

		// Load existing answers if editing
		void this.loadExistingAnswers().then(() => {
			this.renderContent();
		});
	}

	private async loadExistingAnswers(): Promise<void> {
		const session = await this.ctx.sessionRepo.get(this.sessionId);
		if (session?.review && !session.review.skipped) {
			// Pre-fill answers from existing review
			this.isEditing = true;
			for (const answer of session.review.answers) {
				this.answers.set(answer.questionId, {
					selectedOptionId: answer.selectedOptionId,
					freeText: answer.freeText
				});
			}
		}
	}

	private renderContent(): void {
		// Header - show back button when editing from session-detail
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: this.fromSessionDetail ? 'back' : 'none',
			fallbackWorkoutName: 'Training review',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: this.fromSessionDetail ? () => {
				this.ctx.view.navigateTo('session-detail', { sessionId: this.sessionId });
			} : undefined
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

		// Actions - both buttons same size in a row
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions fit-questionnaire-actions' });

		if (this.fromSessionDetail) {
			// From session detail: Cancel just goes back without changes
			createButton(actions, {
				text: 'Cancel',
				variant: 'secondary',
				onClick: () => {
					this.ctx.view.navigateTo('session-detail', { sessionId: this.sessionId });
				}
			});
		} else {
			// From workout completion: Skip saves as skipped
			createButton(actions, {
				text: 'Overslaan',
				variant: 'secondary',
				onClick: () => { void this.saveReview(true); }
			});
		}

		this.completeBtn = createButton(actions, {
			text: 'Voltooien',
			variant: 'primary',
			onClick: () => { void this.saveReview(false); },
			disabled: !this.allQuestionsAnswered()
		});
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

		// Navigate back: to session-detail if came from there, to finish if from workout completion
		if (this.fromSessionDetail) {
			this.ctx.view.navigateTo('session-detail', { sessionId: this.sessionId });
		} else {
			this.ctx.view.navigateTo('finish', { sessionId: this.sessionId });
		}
	}

	destroy(): void {
		super.destroy();
	}
}
