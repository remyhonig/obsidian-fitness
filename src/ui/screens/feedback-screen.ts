import { Notice } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { ScreenParams } from '../../types';
import { createBackButton, createButton, createPrimaryAction } from '../components/button';

/**
 * Feedback screen - full-page coach feedback form
 */
export class FeedbackScreen implements Screen {
	private containerEl: HTMLElement;
	private sessionId: string;
	private workoutName: string;
	private existingFeedback: string;
	private textArea: HTMLTextAreaElement | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext,
		params: ScreenParams
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-feedback-screen' });
		this.sessionId = params.sessionId ?? '';
		this.workoutName = params.workoutName ?? 'Workout';
		this.existingFeedback = params.existingFeedback ?? '';
	}

	render(): void {
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.ctx.view.goBack());

		const titleContainer = header.createDiv({ cls: 'fit-header-title' });
		titleContainer.createEl('h1', {
			text: `Feedback for ${this.workoutName}`,
			cls: 'fit-title'
		});

		// Content
		const content = this.containerEl.createDiv({ cls: 'fit-feedback-screen-content' });

		content.createEl('p', {
			text: 'This feedback will be shown when you start your next session of this workout.',
			cls: 'fit-feedback-screen-desc'
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
		this.containerEl.remove();
	}
}
