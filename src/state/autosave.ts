/**
 * Manages debounced autosave operations
 */
export class AutosaveManager {
	private debounceTimer: number | null = null;
	private readonly debounceMs: number;

	constructor(debounceMs = 2000) {
		this.debounceMs = debounceMs;
	}

	/**
	 * Schedules an autosave operation (debounced)
	 */
	schedule(saveFn: () => Promise<void>): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			saveFn().catch((error) => {
				console.error('Autosave failed:', error);
			}).finally(() => {
				this.debounceTimer = null;
			});
		}, this.debounceMs);
	}

	/**
	 * Immediately flushes any pending autosave
	 */
	async flush(saveFn: () => Promise<void>): Promise<void> {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		try {
			await saveFn();
		} catch (error) {
			console.error('Flush save failed:', error);
			throw error;
		}
	}

	/**
	 * Cancels any pending autosave
	 */
	cancel(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	/**
	 * Returns whether there's a pending autosave
	 */
	isPending(): boolean {
		return this.debounceTimer !== null;
	}
}
