/**
 * Manages the session duration timer
 */

export interface DurationTimerManagerCallbacks {
	/** Emit events to parent for notification */
	emit: (event: 'duration.tick', payload: { elapsed: number }) => void;
	/** Get the session start time */
	getSessionStartTime: () => string | null;
	/** Check if session has been persisted (first set completed) */
	isPersisted: () => boolean;
}

export class DurationTimerManager {
	private durationInterval: number | null = null;

	constructor(private callbacks: DurationTimerManagerCallbacks) {}

	/**
	 * Starts the duration timer (ticks every second while session is active)
	 * Timer shows 0:00 until the first set is completed (persisted)
	 */
	start(): void {
		this.stop();

		// Emit immediately
		this.emitElapsed();

		// Then every second
		this.durationInterval = window.setInterval(() => {
			this.emitElapsed();
		}, 1000);
	}

	/**
	 * Emits the elapsed duration
	 */
	private emitElapsed(): void {
		const elapsed = this.getElapsed();
		this.callbacks.emit('duration.tick', { elapsed });
	}

	/**
	 * Stops the duration timer
	 */
	stop(): void {
		if (this.durationInterval !== null) {
			window.clearInterval(this.durationInterval);
			this.durationInterval = null;
		}
	}

	/**
	 * Gets the elapsed duration in seconds
	 * Returns 0 until first set is completed (persisted)
	 */
	getElapsed(): number {
		const startTime = this.callbacks.getSessionStartTime();
		if (!startTime) return 0;
		if (!this.callbacks.isPersisted()) return 0;
		return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
	}

	/**
	 * Cleanup
	 */
	destroy(): void {
		this.stop();
	}
}
