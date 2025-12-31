import { App, TFile } from 'obsidian';
import type { Session, SessionExercise, SessionStatus, SessionReview } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	parseFrontmatter,
	createFileContent,
	parseSessionBody,
	createSessionBody,
	createSessionReviewBody,
	parseSessionReviewBody,
	createPreviousExercisesBody,
	createCoachFeedbackBody,
	parseCoachFeedbackBody,
	extractWikiLinkName
} from './file-utils';
import { toSlug } from '../domain/identifier';

const ACTIVE_SESSION_FILENAME = '.active-session.md';

// Frontmatter only contains metadata, not exercises, review, or coach feedback
interface SessionMetadata {
	date: string;
	startTime: string;
	startTimeFormatted?: string;
	endTime?: string;
	endTimeFormatted?: string;
	workout?: string;
	status: SessionStatus;
	notes?: string;
}

/**
 * Formats an ISO 8601 datetime string to "HH:MM:SS" format
 */
function formatTimeHHMMSS(isoString: string): string {
	const date = new Date(isoString);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

export class SessionRepository {
	private basePath: string;

	constructor(
		private app: App,
		basePath: string
	) {
		this.basePath = `${basePath}/Sessions`;
	}

	/**
	 * Updates the base path (when settings change)
	 */
	setBasePath(basePath: string): void {
		this.basePath = `${basePath}/Sessions`;
	}

	/**
	 * Ensures the sessions folder exists
	 */
	async ensureFolder(): Promise<void> {
		await ensureFolder(this.app, this.basePath);
	}

	/**
	 * Gets all completed sessions (excludes active/paused sessions)
	 */
	async list(): Promise<Session[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const sessions: Session[] = [];

		for (const file of files) {
			// Skip legacy active session file
			if (file.name === ACTIVE_SESSION_FILENAME) continue;

			const session = await this.parseSessionFile(file);
			// Only include completed sessions (exclude active/paused)
			if (session && session.status === 'completed') {
				sessions.push(session);
			}
		}

		// Sort by date, newest first
		sessions.sort((a, b) => b.startTime.localeCompare(a.startTime));
		return sessions;
	}

	/**
	 * Gets a single session by ID
	 */
	async get(id: string): Promise<Session | null> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			return null;
		}
		return this.parseSessionFile(file);
	}

	/**
	 * Gets the active session (if any)
	 * Scans all session files for one with status 'active' or 'paused'
	 */
	async getActive(): Promise<Session | null> {
		await this.ensureFolder();

		// First check legacy .active-session.md for backward compatibility
		const legacyPath = `${this.basePath}/${ACTIVE_SESSION_FILENAME}`;
		const legacyFile = this.app.vault.getFileByPath(legacyPath);
		if (legacyFile) {
			const session = await this.parseSessionFile(legacyFile);
			if (session && (session.status === 'active' || session.status === 'paused')) {
				return session;
			}
		}

		// Scan all session files for active status
		const files = getFilesInFolder(this.app, this.basePath);
		for (const file of files) {
			if (file.name === ACTIVE_SESSION_FILENAME) continue;
			const session = await this.parseSessionFile(file);
			if (session && (session.status === 'active' || session.status === 'paused')) {
				return session;
			}
		}

		return null;
	}

	/**
	 * Saves the active session to a properly named file
	 */
	async saveActive(session: Session): Promise<void> {
		await this.ensureFolder();
		// Use session ID for filename (e.g., "2025-12-27-10-30-00-push-day.md")
		const path = `${this.basePath}/${session.id}.md`;

		// Store workout as internal link to the workout file
		const workoutLink = session.workout
			? `[[Workouts/${toSlug(session.workout)}]]`
			: undefined;

		// Frontmatter: metadata only (no review, coach feedback - those go in body)
		const frontmatter: Record<string, unknown> = {
			date: session.date,
			startTime: session.startTime,
			startTimeFormatted: formatTimeHHMMSS(session.startTime),
			endTime: session.endTime,
			endTimeFormatted: session.endTime ? formatTimeHHMMSS(session.endTime) : undefined,
			workout: workoutLink,
			status: session.status,
			notes: session.notes
		};

		// Body: exercise blocks with set tables under # Exercises
		let body = createSessionBody(
			session.exercises.map(e => ({
				exercise: e.exercise,
				targetSets: e.targetSets,
				targetRepsMin: e.targetRepsMin,
				targetRepsMax: e.targetRepsMax,
				restSeconds: e.restSeconds,
				muscleEngagement: e.muscleEngagement,
				sets: e.sets.map((s, idx) => ({
					setNumber: idx + 1,
					weight: s.weight,
					reps: s.reps,
					rpe: s.rpe,
					timestamp: s.timestamp,
					completed: s.completed
				}))
			}))
		);

		// Add coach feedback section if present
		if (session.coachFeedback) {
			body += '\n' + createCoachFeedbackBody(session.coachFeedback);
		}

		// Add previous session data if available (for AI comparison)
		if (session.workout) {
			const previousSession = await this.getPreviousSession(session.workout, session.id);
			if (previousSession) {
				// Add previous coach feedback if present
				if (previousSession.coachFeedback) {
					body += '\n# Previous Coach Feedback\n\n' + previousSession.coachFeedback + '\n';
				}

				// Add previous exercises
				body += '\n' + createPreviousExercisesBody(
					previousSession.exercises.map(e => ({
						exercise: e.exercise,
						targetSets: e.targetSets,
						targetRepsMin: e.targetRepsMin,
						targetRepsMax: e.targetRepsMax,
						restSeconds: e.restSeconds,
						sets: e.sets.map((s, idx) => ({
							setNumber: idx + 1,
							weight: s.weight,
							reps: s.reps,
							rpe: s.rpe,
							timestamp: s.timestamp,
							completed: s.completed
						}))
					})),
					previousSession.date
				);
			}
		}

		// Add review section if present
		if (session.review) {
			body += '\n' + createSessionReviewBody(session.review);
		}

		const content = createFileContent(frontmatter, body);

		// Use adapter.exists() for more reliable check (bypasses cache)
		const exists = await this.app.vault.adapter.exists(path);

		if (exists) {
			// File exists, get it from vault and modify
			const file = this.app.vault.getFileByPath(path);
			if (file) {
				await this.app.vault.modify(file, content);
			} else {
				// Cache is stale, wait briefly and try again
				await new Promise(resolve => setTimeout(resolve, 50));
				const retryFile = this.app.vault.getFileByPath(path);
				if (retryFile) {
					await this.app.vault.modify(retryFile, content);
				} else {
					// Still no file, use adapter to write directly
					await this.app.vault.adapter.write(path, content);
				}
			}
		} else {
			// File doesn't exist, create it
			try {
				await this.app.vault.create(path, content);
			} catch (error) {
				// If file already exists (race condition), try to modify
				if (error instanceof Error && error.message.includes('already exists')) {
					// Wait briefly for cache to update
					await new Promise(resolve => setTimeout(resolve, 50));
					const file = this.app.vault.getFileByPath(path);
					if (file) {
						await this.app.vault.modify(file, content);
					} else {
						// Use adapter as fallback
						await this.app.vault.adapter.write(path, content);
					}
				} else {
					throw error;
				}
			}
		}
	}

	/**
	 * Finalizes the active session (marks as completed)
	 * Since session is already saved to a proper file, just update the status
	 */
	async finalizeActive(session: Session): Promise<Session> {
		await this.ensureFolder();

		// Update session status
		const finalSession: Session = {
			...session,
			status: 'completed',
			endTime: new Date().toISOString()
		};

		// Save to the same file (using saveActive which uses session.id)
		await this.saveActive(finalSession);

		// Clean up legacy active session file if it exists
		const legacyPath = `${this.basePath}/${ACTIVE_SESSION_FILENAME}`;
		const legacyFile = this.app.vault.getFileByPath(legacyPath);
		if (legacyFile) {
			await this.app.fileManager.trashFile(legacyFile);
		}

		return finalSession;
	}

	/**
	 * Discards the active session by ID
	 */
	async deleteActive(sessionId?: string): Promise<void> {
		// Delete the session file if ID provided
		if (sessionId) {
			const path = `${this.basePath}/${sessionId}.md`;
			const file = this.app.vault.getFileByPath(path);
			if (file) {
				await this.app.fileManager.trashFile(file);
			}
		}

		// Also clean up legacy active session file if it exists
		const legacyPath = `${this.basePath}/${ACTIVE_SESSION_FILENAME}`;
		const legacyFile = this.app.vault.getFileByPath(legacyPath);
		if (legacyFile) {
			await this.app.fileManager.trashFile(legacyFile);
		}
	}

	/**
	 * Deletes a session by ID
	 */
	async delete(id: string): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}

	/**
	 * Adds a review to a completed session
	 */
	async addReview(id: string, review: SessionReview): Promise<void> {
		const session = await this.get(id);
		if (!session) {
			throw new Error(`Session not found: ${id}`);
		}

		session.review = review;
		await this.saveActive(session);
	}

	/**
	 * Adds or updates coach feedback on a session
	 */
	async setCoachFeedback(id: string, feedback: string | undefined): Promise<void> {
		const session = await this.get(id);
		if (!session) {
			throw new Error(`Session not found: ${id}`);
		}

		session.coachFeedback = feedback;
		await this.saveActive(session);
	}

	/**
	 * Gets recent sessions (for home screen)
	 */
	async getRecent(limit = 5): Promise<Session[]> {
		const sessions = await this.list();
		return sessions.slice(0, limit);
	}

	/**
	 * Gets sessions for a specific date range
	 */
	async getByDateRange(startDate: string, endDate: string): Promise<Session[]> {
		const sessions = await this.list();
		return sessions.filter(s =>
			s.date >= startDate && s.date <= endDate
		);
	}

	/**
	 * Gets sessions that used a specific workout
	 */
	async getByWorkout(workoutName: string): Promise<Session[]> {
		const sessions = await this.list();
		return sessions.filter(s =>
			s.workout?.toLowerCase() === workoutName.toLowerCase()
		);
	}

	/**
	 * Gets the previous completed session for the same workout (excluding current)
	 */
	async getPreviousSession(workoutName: string, currentSessionId: string): Promise<Session | null> {
		if (!workoutName) return null;
		const sessions = await this.getByWorkout(workoutName);
		// Sessions are sorted newest first, find first one that isn't current
		for (const session of sessions) {
			if (session.id !== currentSessionId && session.status === 'completed') {
				return session;
			}
		}
		return null;
	}

	/**
	 * Parses a session file into a Session object
	 */
	private async parseSessionFile(file: TFile): Promise<Session | null> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const { frontmatter, body } = parseFrontmatter<SessionMetadata>(content);

			if (!frontmatter?.startTime) {
				return null;
			}

			// Parse exercises from body
			const exerciseBlocks = parseSessionBody(body);
			const exercises: SessionExercise[] = exerciseBlocks.map(block => ({
				exercise: block.exercise,
				targetSets: block.targetSets,
				targetRepsMin: block.targetRepsMin,
				targetRepsMax: block.targetRepsMax,
				restSeconds: block.restSeconds,
				muscleEngagement: block.muscleEngagement as SessionExercise['muscleEngagement'],
				sets: block.sets.map(s => ({
					weight: s.weight,
					reps: s.reps,
					completed: s.completed,
					timestamp: s.timestamp,
					rpe: s.rpe
				}))
			}));

			// Extract workout name from wikilink if present
			const workoutName = frontmatter.workout
				? extractWikiLinkName(frontmatter.workout)
				: undefined;

			// Parse review and coach feedback from body (not frontmatter)
			const review = parseSessionReviewBody(body);
			const coachFeedback = parseCoachFeedbackBody(body);

			return {
				id: getIdFromPath(file.path),
				date: frontmatter.date ?? frontmatter.startTime.split('T')[0],
				startTime: frontmatter.startTime,
				endTime: frontmatter.endTime,
				workout: workoutName,
				status: frontmatter.status ?? 'completed',
				exercises,
				notes: frontmatter.notes,
				review,
				coachFeedback
			};
		} catch {
			return null;
		}
	}
}
