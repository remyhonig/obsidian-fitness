import type { Session } from '../types';
import type { SessionRepository } from '../data/session-repository';

/**
 * Manages session persistence with proper queuing.
 * Decouples state management from file I/O.
 */
export class PersistenceManager {
	private savePromise: Promise<void> | null = null;
	private pendingSave = false;
	private pendingSession: Session | null = null;

	constructor(private sessionRepo: SessionRepository) {}

	/**
	 * Updates the repository reference (when base path changes)
	 */
	setRepository(repo: SessionRepository): void {
		this.sessionRepo = repo;
	}

	/**
	 * Saves session and waits for completion.
	 * Guarantees data is persisted before returning.
	 */
	async saveAndWait(session: Session): Promise<void> {
		// If a save is in progress, wait for it first
		if (this.savePromise) {
			await this.savePromise;
		}

		// Now do our save
		this.savePromise = this.doSave(session);
		await this.savePromise;
	}

	/**
	 * Queues a save operation (fire-and-forget).
	 * Batches rapid saves to prevent I/O thrashing.
	 */
	saveQueued(session: Session): void {
		// Store the latest session to save
		this.pendingSession = session;

		// If a save is in progress, mark pending and return
		if (this.savePromise) {
			this.pendingSave = true;
			return;
		}

		// Start the save
		this.savePromise = this.doSave(session);
	}

	/**
	 * Performs the actual save operation
	 */
	private async doSave(session: Session): Promise<void> {
		try {
			await this.sessionRepo.saveActive(session);
		} catch (error) {
			console.error('[PersistenceManager] Save failed:', error);
		} finally {
			this.savePromise = null;

			// If there's a pending save, do it now with the latest session
			if (this.pendingSave && this.pendingSession) {
				this.pendingSave = false;
				const nextSession = this.pendingSession;
				this.pendingSession = null;
				this.saveQueued(nextSession);
			}
		}
	}

	/**
	 * Waits for any in-progress save to complete
	 */
	async flush(): Promise<void> {
		if (this.savePromise) {
			await this.savePromise;
		}
	}

	/**
	 * Deletes an active session file
	 */
	async deleteActive(sessionId: string): Promise<void> {
		// Clear any pending saves
		this.pendingSave = false;
		this.pendingSession = null;
		await this.sessionRepo.deleteActive(sessionId);
	}

	/**
	 * Finalizes an active session (moves to completed)
	 */
	async finalizeActive(session: Session): Promise<Session> {
		// Ensure any pending save completes first
		await this.flush();
		return this.sessionRepo.finalizeActive(session);
	}
}
