import { Notice } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton, createPrimaryAction } from '../components/button';
import { parseCoachFeedbackYaml, validateFeedbackAgainstSession } from '../../data/coach-feedback-parser';
import { createFeedbackStatusCallout, type FeedbackStatusCalloutRefs } from '../components/feedback-status-callout';
import type { FeedbackValidationStatus } from '../../data/coach-feedback-types';

/**
 * Feedback screen - full-page coach feedback form
 */
export class FeedbackScreen extends BaseScreen {
	private sessionId: string;
	private workoutName: string;
	private existingFeedback: string;
	private textArea: HTMLTextAreaElement | null = null;
	private feedbackStatusRefs: FeedbackStatusCalloutRefs | null = null;
	private currentValidationStatus: FeedbackValidationStatus | null = null;
	private sessionExerciseNames: string[] = [];

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-feedback-screen');
		this.sessionId = params.sessionId ?? '';
		this.workoutName = params.workoutName ?? 'Workout';
		this.existingFeedback = params.existingFeedback ?? '';
	}

	render(): void {
		this.prepareRender();

		// Load session exercises for validation
		void this.loadSessionExercises();

		// Header with consistent screen-header component
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			fallbackWorkoutName: `Feedback: ${this.workoutName}`,
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: () => this.ctx.view.goBack()
		});

		// Content
		const content = this.containerEl.createDiv({ cls: 'fit-feedback-screen-content' });

		content.createEl('p', {
			text: 'This feedback will be shown when you start your next session of this workout.',
			cls: 'fit-feedback-screen-desc'
		});

		// Status callout for feedback validation (above textarea)
		const statusContainer = content.createDiv({ cls: 'fit-feedback-status-container' });
		this.feedbackStatusRefs = createFeedbackStatusCallout(statusContainer, {
			status: this.currentValidationStatus
		});

		// Text area
		this.textArea = content.createEl('textarea', {
			cls: 'fit-feedback-screen-input',
			attr: {
				placeholder: 'Enter feedback for your next session...',
				rows: '8'
			}
		});
		this.textArea.value = this.existingFeedback;

		// Real-time parsing and validation on input
		this.textArea.addEventListener('input', () => {
			this.parseAndValidateFeedback();
		});

		// Initial parse if there's existing content
		if (this.existingFeedback) {
			this.parseAndValidateFeedback();
		}

		// Focus the text area
		setTimeout(() => this.textArea?.focus(), 50);

		// Actions
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });

		createButton(actions, {
			text: 'Cancel',
			variant: 'ghost',
			onClick: () => this.ctx.view.goBack()
		});

		createPrimaryAction(actions, 'Save', () => {
			void this.saveFeedback();
		});
	}

	private async loadSessionExercises(): Promise<void> {
		if (!this.sessionId) return;

		const session = await this.ctx.sessionRepo.get(this.sessionId);
		if (session) {
			this.sessionExerciseNames = session.exercises.map(e => e.exercise);
			// Re-parse if we have content
			if (this.textArea?.value) {
				this.parseAndValidateFeedback();
			}
		}
	}

	private parseAndValidateFeedback(): void {
		const content = this.textArea?.value ?? '';
		const parsed = parseCoachFeedbackYaml(content);

		if (parsed) {
			// Valid structured YAML - show validation status
			this.currentValidationStatus = validateFeedbackAgainstSession(parsed, this.sessionExerciseNames);
		} else {
			// Plain text or empty - hide status callout (will be shown as markdown)
			this.currentValidationStatus = null;
		}

		this.feedbackStatusRefs?.update(this.currentValidationStatus);
	}

	private async saveFeedback(): Promise<void> {
		const feedback = this.textArea?.value.trim() ?? '';

		try {
			await this.ctx.sessionRepo.setCoachFeedback(
				this.sessionId,
				feedback || undefined
			);
			new Notice(feedback ? 'Feedback saved' : 'Feedback cleared');
		} catch (error) {
			console.error('Failed to save feedback:', error);
			new Notice('Failed to save feedback');
		}

		this.ctx.view.goBack();
	}

	destroy(): void {
		this.feedbackStatusRefs?.destroy();
		this.feedbackStatusRefs = null;
		super.destroy();
	}
}
