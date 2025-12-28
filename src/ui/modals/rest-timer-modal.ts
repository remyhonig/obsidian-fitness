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
	private eventUnsubscribers: (() => void)[] = [];
	private initialDuration: number;
	private ringContainer: HTMLElement | null = null;

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
		this.ringContainer = timerContainer.createDiv({ cls: 'fit-rest-timer-ring' });
		this.updateProgressRing();

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

		// Subscribe to timer events
		this.subscribeToEvents();
	}

	private subscribeToEvents(): void {
		// Timer tick - update display every second
		this.eventUnsubscribers.push(
			this.sessionState.on('timer.tick', ({ remaining }) => {
				this.updateTimeDisplayFromEvent(remaining);
				this.updateProgressRing();
			})
		);

		// Timer cancelled - close modal
		this.eventUnsubscribers.push(
			this.sessionState.on('timer.cancelled', () => {
				this.close();
			})
		);

		// Timer extended - update display (tick will handle ongoing updates)
		this.eventUnsubscribers.push(
			this.sessionState.on('timer.extended', () => {
				this.updateTimeDisplay();
				this.updateProgressRing();
			})
		);
	}

	private unsubscribeFromEvents(): void {
		for (const unsub of this.eventUnsubscribers) {
			unsub();
		}
		this.eventUnsubscribers = [];
	}

	/**
	 * Lightweight time display update from tick event
	 */
	private updateTimeDisplayFromEvent(remaining: number): void {
		if (!this.timeEl) return;
		this.timeEl.textContent = formatTime(remaining);
	}

	private updateTimeDisplay(): void {
		if (!this.timeEl) return;
		const remaining = this.sessionState.getRestTimeRemaining();
		this.timeEl.textContent = formatTime(remaining);
	}

	private updateProgressRing(): void {
		if (!this.ringContainer) return;

		// Remove existing ring
		if (this.progressRing) {
			this.progressRing.remove();
		}

		const remaining = this.sessionState.getRestTimeRemaining();
		const timer = this.sessionState.getRestTimer();
		const duration = timer?.duration ?? this.initialDuration;
		const progress = remaining / duration;

		this.progressRing = createProgressRing(this.ringContainer, progress, 200);
	}

	onClose(): void {
		this.unsubscribeFromEvents();
		const { contentEl } = this;
		contentEl.empty();
	}
}
