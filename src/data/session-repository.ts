import { App, TFile } from 'obsidian';
import type { Session, SessionExercise, SessionStatus } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	parseFrontmatter,
	createFileContent,
	parseSessionBody,
	createSessionBody
} from './file-utils';

const ACTIVE_SESSION_FILENAME = '.active-session.md';

// Frontmatter only contains metadata, not exercises
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
	 * Gets all completed sessions (excludes active session)
	 */
	async list(): Promise<Session[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const sessions: Session[] = [];

		for (const file of files) {
			// Skip active session file
			if (file.name === ACTIVE_SESSION_FILENAME) continue;

			const session = await this.parseSessionFile(file);
			if (session) {
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
	 */
	async getActive(): Promise<Session | null> {
		await this.ensureFolder();
		const path = `${this.basePath}/${ACTIVE_SESSION_FILENAME}`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			return null;
		}

		const session = await this.parseSessionFile(file);
		if (!session) {
			return null;
		}

		// Only return if status is active or paused
		if (session.status === 'active' || session.status === 'paused') {
			return session;
		}

		return null;
	}

	/**
	 * Saves the active session
	 */
	async saveActive(session: Session): Promise<void> {
		await this.ensureFolder();
		const path = `${this.basePath}/${ACTIVE_SESSION_FILENAME}`;

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			date: session.date,
			startTime: session.startTime,
			startTimeFormatted: formatTimeHHMMSS(session.startTime),
			endTime: session.endTime,
			endTimeFormatted: session.endTime ? formatTimeHHMMSS(session.endTime) : undefined,
			workout: session.workout,
			status: session.status,
			notes: session.notes
		};

		// Body: exercise blocks with set tables
		const body = createSessionBody(
			session.exercises.map(e => ({
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
			}))
		);

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
	 * Finalizes the active session (marks as completed and renames)
	 */
	async finalizeActive(session: Session): Promise<Session> {
		await this.ensureFolder();

		// Update session status
		const finalSession: Session = {
			...session,
			status: 'completed',
			endTime: new Date().toISOString()
		};

		// Generate a unique filename based on date, time, and workout
		const dateStr = finalSession.date;
		const timeStr = formatTimeHHMMSS(finalSession.startTime).replace(/:/g, '-'); // HH-MM-SS
		const workoutSlug = finalSession.workout
			? `-${finalSession.workout.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
			: '';
		const baseId = `${dateStr}-${timeStr}${workoutSlug}`;

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			date: finalSession.date,
			startTime: finalSession.startTime,
			startTimeFormatted: formatTimeHHMMSS(finalSession.startTime),
			endTime: finalSession.endTime,
			endTimeFormatted: finalSession.endTime ? formatTimeHHMMSS(finalSession.endTime) : undefined,
			workout: finalSession.workout,
			status: finalSession.status,
			notes: finalSession.notes
		};

		// Body: exercise blocks with set tables
		const body = createSessionBody(
			finalSession.exercises.map(e => ({
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
			}))
		);

		const content = createFileContent(frontmatter, body);

		// Try to create file with unique name, handling race conditions
		let id = baseId;
		let counter = 1;
		const maxAttempts = 10;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const filePath = `${this.basePath}/${id}.md`;

			// Use adapter.exists() for reliable check
			const exists = await this.app.vault.adapter.exists(filePath);
			if (exists) {
				id = `${baseId}-${counter}`;
				counter++;
				continue;
			}

			try {
				await this.app.vault.create(filePath, content);
				finalSession.id = id;
				break;
			} catch (error) {
				// If file already exists (race condition), try next ID
				if (error instanceof Error && error.message.includes('already exists')) {
					id = `${baseId}-${counter}`;
					counter++;
					continue;
				}
				throw error;
			}
		}

		// Delete active session file
		await this.deleteActive();

		return finalSession;
	}

	/**
	 * Discards the active session
	 */
	async deleteActive(): Promise<void> {
		const path = `${this.basePath}/${ACTIVE_SESSION_FILENAME}`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
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
	 * Calculates total volume for a session
	 */
	calculateVolume(session: Session): number {
		let total = 0;
		for (const exercise of session.exercises) {
			for (const set of exercise.sets) {
				if (set.completed) {
					total += set.weight * set.reps;
				}
			}
		}
		return total;
	}

	/**
	 * Counts completed sets in a session
	 */
	countCompletedSets(session: Session): number {
		let count = 0;
		for (const exercise of session.exercises) {
			for (const set of exercise.sets) {
				if (set.completed) {
					count++;
				}
			}
		}
		return count;
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
				sets: block.sets.map(s => ({
					weight: s.weight,
					reps: s.reps,
					completed: s.completed,
					timestamp: s.timestamp,
					rpe: s.rpe
				}))
			}));

			return {
				id: getIdFromPath(file.path),
				date: frontmatter.date ?? frontmatter.startTime.split('T')[0],
				startTime: frontmatter.startTime,
				endTime: frontmatter.endTime,
				workout: frontmatter.workout,
				status: frontmatter.status ?? 'completed',
				exercises,
				notes: frontmatter.notes
			};
		} catch {
			return null;
		}
	}
}
