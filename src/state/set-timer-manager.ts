/**
 * Manages the set start time tracking
 */

export interface SetTimerManagerCallbacks {
	/** Emit events to parent for notification */
	emit: (event: 'set.started', payload: { exerciseIndex: number }) => void;
	/** Notify legacy listeners */
	notifyListeners: () => void;
}

export class SetTimerManager {
	private setStartTime: number | null = null;

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
	 * Cleanup
	 */
	destroy(): void {
		this.setStartTime = null;
	}
}
