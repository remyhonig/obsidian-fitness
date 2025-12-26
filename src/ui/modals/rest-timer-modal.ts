import { App, Modal } from 'obsidian';
import type { SessionStateManager } from '../../state/session-state';
import { formatTime, createProgressRing } from '../components/timer';
import { createButton } from '../components/button';

/**
 * Rest timer modal - shows countdown between sets
 */
export class RestTimerModal extends Modal {
	private timeEl: HTMLElement | null = null;
	private progressRing: SVGElement | null = null;
	private unsubscribe: (() => void) | null = null;
	private initialDuration: number;

	constructor(
		app: App,
		private sessionState: SessionStateManager
	) {
		super(app);
		this.initialDuration = sessionState.getRestTimer()?.duration ?? 120;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('fit-rest-timer-modal');

		// Timer container
		const timerContainer = contentEl.createDiv({ cls: 'fit-rest-timer-container' });

		// Progress ring
		const ringContainer = timerContainer.createDiv({ cls: 'fit-rest-timer-ring' });
		this.updateProgressRing(ringContainer);

		// Time display (centered in ring)
		this.timeEl = timerContainer.createDiv({ cls: 'fit-rest-timer-time' });
		this.updateTimeDisplay();

		// Label
		contentEl.createDiv({ cls: 'fit-rest-timer-label', text: 'Rest' });

		// Actions
		const actions = contentEl.createDiv({ cls: 'fit-rest-timer-actions' });

		createButton(actions, {
			text: '+30s',
			variant: 'secondary',
			onClick: () => {
				this.sessionState.addRestTime(30);
			}
		});

		createButton(actions, {
			text: 'Skip',
			variant: 'ghost',
			onClick: () => {
				this.sessionState.cancelRestTimer();
				this.close();
			}
		});

		// Subscribe to state changes
		this.unsubscribe = this.sessionState.subscribe(() => {
			this.updateTimeDisplay();
			this.updateProgressRing(ringContainer);

			// Close if timer is no longer active
			if (!this.sessionState.isRestTimerActive()) {
				this.close();
			}
		});
	}

	private updateTimeDisplay(): void {
		if (!this.timeEl) return;
		const remaining = this.sessionState.getRestTimeRemaining();
		this.timeEl.textContent = formatTime(remaining);
	}

	private updateProgressRing(container: HTMLElement): void {
		// Remove existing ring
		if (this.progressRing) {
			this.progressRing.remove();
		}

		const remaining = this.sessionState.getRestTimeRemaining();
		const timer = this.sessionState.getRestTimer();
		const duration = timer?.duration ?? this.initialDuration;
		const progress = remaining / duration;

		this.progressRing = createProgressRing(container, progress, 200);
	}

	onClose(): void {
		this.unsubscribe?.();
		const { contentEl } = this;
		contentEl.empty();
	}
}
