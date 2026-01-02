/**
 * Manages the set start time tracking and countdown before first set
 */

export type SetTimerEvent =
	| { type: 'set.started'; payload: { exerciseIndex: number } }
	| { type: 'countdown.tick'; payload: { remaining: number; exerciseIndex: number } }
	| { type: 'countdown.complete'; payload: { exerciseIndex: number } };

export interface SetTimerManagerCallbacks {
	/** Emit events to parent for notification */
	emit: (event: SetTimerEvent['type'], payload: SetTimerEvent['payload']) => void;
	/** Notify legacy listeners */
	notifyListeners: () => void;
}

export class SetTimerManager {
	private setStartTime: number | null = null;
	private countdownRemaining: number | null = null;
	private countdownInterval: ReturnType<typeof setInterval> | null = null;
	private countdownExerciseIndex: number | null = null;

	constructor(private callbacks: SetTimerManagerCallbacks) {}

	/**
	 * Marks the start time for the current set.
	 * Called when user explicitly starts a set or when rest timer ends.
	 */
	markStart(exerciseIndex: number): void {
		this.setStartTime = Date.now();
		this.callbacks.emit('set.started', { exerciseIndex });
		this.callbacks.notifyListeners();
	}

	/**
	 * Gets the current set start time (null if not started)
	 */
	getStartTime(): number | null {
		return this.setStartTime;
	}

	/**
	 * Checks if set timer is running (start time is set)
	 */
	isActive(): boolean {
		return this.setStartTime !== null;
	}

	/**
	 * Clears the set start time (called after set completion)
	 */
	clear(): void {
		this.setStartTime = null;
	}

	/**
	 * Calculates duration from start time to now
	 */
	getDuration(): number | undefined {
		if (this.setStartTime === null) return undefined;
		return Math.floor((Date.now() - this.setStartTime) / 1000);
	}

	/**
	 * Starts a countdown before the set timer begins.
	 * Used for the first set of each exercise.
	 */
	startWithCountdown(exerciseIndex: number, countdownSeconds: number): void {
		// Clear any existing countdown
		this.cancelCountdown();
		this.setStartTime = null;

		this.countdownRemaining = countdownSeconds;
		this.countdownExerciseIndex = exerciseIndex;

		// Emit initial tick
		this.callbacks.emit('countdown.tick', { remaining: this.countdownRemaining, exerciseIndex });
		this.callbacks.notifyListeners();

		// Start countdown interval
		this.countdownInterval = setInterval(() => {
			if (this.countdownRemaining === null) {
				this.cancelCountdown();
				return;
			}

			this.countdownRemaining--;

			if (this.countdownRemaining <= 0) {
				// Countdown complete - transition to set timer
				const idx = this.countdownExerciseIndex ?? exerciseIndex;
				this.cancelCountdown();
				this.callbacks.emit('countdown.complete', { exerciseIndex: idx });
				this.markStart(idx);
			} else {
				this.callbacks.emit('countdown.tick', {
					remaining: this.countdownRemaining,
					exerciseIndex: this.countdownExerciseIndex ?? exerciseIndex
				});
				this.callbacks.notifyListeners();
			}
		}, 1000);
	}

	/**
	 * Checks if countdown is active
	 */
	isCountdownActive(): boolean {
		return this.countdownRemaining !== null && this.countdownRemaining > 0;
	}

	/**
	 * Gets the remaining countdown seconds (null if not counting down)
	 */
	getCountdownRemaining(): number | null {
		return this.countdownRemaining;
	}

	/**
	 * Cancels the active countdown
	 */
	cancelCountdown(): void {
		if (this.countdownInterval !== null) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
		this.countdownRemaining = null;
		this.countdownExerciseIndex = null;
	}

	/**
	 * Cleanup
	 */
	destroy(): void {
		this.cancelCountdown();
		this.setStartTime = null;
	}
}
