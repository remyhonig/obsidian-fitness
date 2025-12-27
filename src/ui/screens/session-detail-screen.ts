import { Notice, setIcon } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Session } from '../../types';
import { createBackButton } from '../components/button';
import { formatDuration } from '../components/timer';

/**
 * Session detail screen - shows full details of a completed session
 */
export class SessionDetailScreen implements Screen {
	private containerEl: HTMLElement;
	private sessionId: string;
	private textArea: HTMLTextAreaElement | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext,
		params: ScreenParams
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-session-detail-screen' });
		this.sessionId = params.sessionId ?? '';
	}

	render(): void {
		this.containerEl.empty();

		// Load session and render
		void this.loadAndRender();
	}

	private async loadAndRender(): Promise<void> {
		const session = await this.ctx.sessionRepo.get(this.sessionId);

		if (!session) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'Session not found'
			});
			return;
		}

		this.renderContent(session);
	}

	private renderContent(session: Session): void {
		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.ctx.view.goBack());

		const titleContainer = header.createDiv({ cls: 'fit-header-title' });
		titleContainer.createEl('h1', {
			text: session.workout ?? 'Workout',
			cls: 'fit-title'
		});

		// Copy button in header
		const copyBtn = header.createEl('button', {
			cls: 'fit-header-action',
			attr: { 'aria-label': 'Copy for AI' }
		});
		setIcon(copyBtn, 'copy');
		copyBtn.addEventListener('click', () => { void this.copySession(session); });

		// Session info
		const info = this.containerEl.createDiv({ cls: 'fit-session-detail-info' });

		const date = new Date(session.date);
		const dateStr = date.toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		info.createDiv({ cls: 'fit-session-detail-date', text: dateStr });

		if (session.endTime) {
			const duration = formatDuration(session.startTime, session.endTime);
			info.createDiv({ cls: 'fit-session-detail-duration', text: `Duration: ${duration}` });
		}

		// Coach feedback section (always visible)
		const feedbackSection = this.containerEl.createDiv({ cls: 'fit-session-detail-feedback' });
		feedbackSection.createDiv({ cls: 'fit-session-detail-section-title', text: 'Coach Feedback' });

		this.textArea = feedbackSection.createEl('textarea', {
			cls: 'fit-feedback-textarea',
			attr: { placeholder: 'Add feedback from your coach or personal notes...' }
		});
		this.textArea.value = session.coachFeedback ?? '';

		// Auto-save on blur
		this.textArea.addEventListener('blur', () => {
			void this.saveFeedback(session.id);
		});

		// Exercises section
		const exercisesSection = this.containerEl.createDiv({ cls: 'fit-session-detail-exercises' });
		exercisesSection.createDiv({ cls: 'fit-session-detail-section-title', text: 'Exercises' });

		const unit = this.ctx.plugin.settings.weightUnit;

		for (const exercise of session.exercises) {
			const completedSets = exercise.sets.filter(s => s.completed);
			if (completedSets.length === 0) continue;

			const exerciseCard = exercisesSection.createDiv({ cls: 'fit-session-detail-exercise' });

			// Exercise name with rest time
			const nameRow = exerciseCard.createDiv({ cls: 'fit-session-detail-exercise-header' });
			nameRow.createSpan({ cls: 'fit-session-detail-exercise-name', text: exercise.exercise });
			if (exercise.restSeconds > 0) {
				nameRow.createSpan({
					cls: 'fit-session-detail-exercise-rest',
					text: `${exercise.restSeconds}s rest`
				});
			}

			// Sets
			const setsContainer = exerciseCard.createDiv({ cls: 'fit-session-detail-sets' });
			for (const set of completedSets) {
				let setText = `${set.reps} reps @ ${set.weight}${unit}`;
				if (set.rpe !== undefined) {
					setText += ` (RPE ${set.rpe})`;
				}
				setsContainer.createDiv({ cls: 'fit-session-detail-set', text: setText });
			}
		}

	}

	private async saveFeedback(sessionId: string): Promise<void> {
		const feedback = this.textArea?.value.trim() ?? '';
		await this.ctx.sessionRepo.setCoachFeedback(sessionId, feedback);
		if (feedback) {
			new Notice('Feedback saved');
		}
	}

	private async copySession(session: Session): Promise<void> {
		const basePath = this.ctx.plugin.settings.basePath;
		const path = `${basePath}/Sessions/${session.id}.md`;
		const file = this.ctx.view.app.vault.getFileByPath(path);
		if (file) {
			const content = await this.ctx.view.app.vault.read(file);
			await navigator.clipboard.writeText(content);
			new Notice('Copied to clipboard');
		}
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
