/**
 * Manages the rest timer between sets
 */

import type { RestTimerState } from '../types';

export interface RestTimerManagerCallbacks {
	/** Emit events to parent for notification */
	emit: <E extends 'timer.started' | 'timer.tick' | 'timer.cancelled' | 'timer.extended'>(
		event: E,
		payload: E extends 'timer.started' ? { exerciseIndex: number; duration: number } :
			E extends 'timer.tick' ? { remaining: number } :
			E extends 'timer.extended' ? { additionalSeconds: number } :
			undefined
	) => void;
	/** Called when timer completes naturally */
	onComplete: (exerciseIndex: number) => void;
	/** Notify legacy listeners */
	notifyListeners: () => void;
}

export class RestTimerManager {
	private restTimer: RestTimerState | null = null;
	private restTimerInterval: number | null = null;

	constructor(private callbacks: RestTimerManagerCallbacks) {}

	/**
	 * Starts the rest timer
	 */
	start(seconds: number, exerciseIndex: number): void {
		this.cancel();

		this.restTimer = {
			endTime: Date.now() + seconds * 1000,
			duration: seconds,
			exerciseIndex
		};

		// Update every second
		this.restTimerInterval = window.setInterval(() => {
			const remaining = this.getRemaining();
			this.callbacks.emit('timer.tick', { remaining });
			this.callbacks.notifyListeners();

			// Check if timer is done
			if (this.restTimer && Date.now() >= this.restTimer.endTime) {
				this.complete();
			}
		}, 1000);

		this.callbacks.emit('timer.started', { exerciseIndex, duration: seconds });
		this.callbacks.notifyListeners();
	}

	/**
	 * Called when rest timer completes naturally
	 */
	private complete(): void {
		const exerciseIndex = this.restTimer?.exerciseIndex ?? 0;
		this.stopInterval();
		this.restTimer = null;

		// Notify parent to handle completion (e.g., auto-mark set start)
		this.callbacks.onComplete(exerciseIndex);

		this.callbacks.emit('timer.cancelled', undefined);
		this.callbacks.notifyListeners();
	}

	/**
	 * Adds time to the rest timer
	 */
	addTime(seconds: number): void {
		if (!this.restTimer) return;

		this.restTimer.endTime += seconds * 1000;
		this.restTimer.duration += seconds;
		this.callbacks.emit('timer.extended', { additionalSeconds: seconds });
		this.callbacks.notifyListeners();
	}

	/**
	 * Cancels the rest timer (user-initiated)
	 */
	cancel(): void {
		const wasActive = this.restTimerInterval !== null;
		this.stopInterval();
		this.restTimer = null;
		if (wasActive) {
			this.callbacks.emit('timer.cancelled', undefined);
		}
		this.callbacks.notifyListeners();
	}

	/**
	 * Stops the rest timer interval
	 */
	private stopInterval(): void {
		if (this.restTimerInterval !== null) {
			window.clearInterval(this.restTimerInterval);
			this.restTimerInterval = null;
		}
	}

	/**
	 * Gets the remaining rest time in seconds
	 */
	getRemaining(): number {
		if (!this.restTimer) return 0;
		return Math.max(0, Math.ceil((this.restTimer.endTime - Date.now()) / 1000));
	}

	/**
	 * Returns whether the rest timer is active
	 */
	isActive(): boolean {
		return this.restTimer !== null && Date.now() < this.restTimer.endTime;
	}

	/**
	 * Gets the rest timer state
	 */
	getState(): RestTimerState | null {
		return this.restTimer;
	}

	/**
	 * Cleanup
	 */
	destroy(): void {
		this.stopInterval();
		this.restTimer = null;
	}
}
