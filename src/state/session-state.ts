import type { App } from 'obsidian';
import type {
	Session,
	SessionExercise,
	LoggedSet,
	RestTimerState,
	StateChangeListener,
	Workout,
	WorkoutExercise
} from '../types';
import type { PluginSettings } from '../settings';
import { SessionRepository } from '../data/session-repository';

/**
 * Manages the active workout session state
 */
export class SessionStateManager {
	private session: Session | null = null;
	private currentExerciseIndex = 0;
	private restTimer: RestTimerState | null = null;
	private restTimerInterval: number | null = null;
	private listeners: Set<StateChangeListener> = new Set();
	private sessionRepo: SessionRepository;

	constructor(
		private app: App,
		private settings: PluginSettings
	) {
		this.sessionRepo = new SessionRepository(app, settings.basePath);
	}

	/**
	 * Updates settings (called when settings change)
	 */
	updateSettings(settings: PluginSettings): void {
		this.settings = settings;
		this.sessionRepo.setBasePath(settings.basePath);
	}

	// ========== Session Lifecycle ==========

	/**
	 * Starts a new session from a workout
	 */
	startFromWorkout(workout: Workout): void {
		const now = new Date();
		const exercises: SessionExercise[] = workout.exercises.map(we => ({
			exercise: we.exercise,
			targetSets: we.targetSets,
			targetRepsMin: we.targetRepsMin,
			targetRepsMax: we.targetRepsMax,
			restSeconds: we.restSeconds,
			sets: []
		}));

		const dateStr = now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10);
		this.session = {
			id: 'active',
			date: dateStr,
			startTime: now.toISOString(),
			workout: workout.name,
			status: 'active',
			exercises
		};

		this.currentExerciseIndex = 0;
		this.restTimer = null;
		this.saveImmediately();
		this.notifyListeners();
	}

	/**
	 * Starts an empty session (no workout)
	 */
	startEmpty(): void {
		const now = new Date();
		const dateStr = now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10);

		this.session = {
			id: 'active',
			date: dateStr,
			startTime: now.toISOString(),
			status: 'active',
			exercises: []
		};

		this.currentExerciseIndex = 0;
		this.restTimer = null;
		this.saveImmediately();
		this.notifyListeners();
	}

	/**
	 * Loads an active session from disk (on plugin load)
	 */
	async loadFromDisk(): Promise<boolean> {
		try {
			const session = await this.sessionRepo.getActive();
			if (session) {
				this.session = session;
				this.currentExerciseIndex = 0;
				this.restTimer = null;
				this.notifyListeners();
				return true;
			}
		} catch (error) {
			console.error('Failed to load active session:', error);
		}
		return false;
	}

	/**
	 * Finishes the current session
	 */
	async finishSession(): Promise<Session | null> {
		if (!this.session) return null;

		try {
			// Wait for any in-progress save to complete
			if (this.savePromise) {
				await this.savePromise;
			}

			// Store reference before clearing state
			const sessionToFinalize = this.session;

			// Clear state
			this.session = null;
			this.currentExerciseIndex = 0;
			this.cancelRestTimer();

			// Finalize and get the saved session
			const finalSession = await this.sessionRepo.finalizeActive(sessionToFinalize);

			this.notifyListeners();
			return finalSession;
		} catch (error) {
			console.error('Failed to finalize session:', error);
			// Clear state even on error to prevent stale "in progress" state
			this.session = null;
			this.currentExerciseIndex = 0;
			this.cancelRestTimer();
			this.notifyListeners();
			throw error;
		}
	}

	/**
	 * Discards the current session
	 */
	async discardSession(): Promise<void> {
		if (!this.session) return;

		// Clear pending save flag
		this.pendingSave = false;

		// Delete active session file
		await this.sessionRepo.deleteActive();

		// Clear state
		this.session = null;
		this.currentExerciseIndex = 0;
		this.cancelRestTimer();
		this.notifyListeners();
	}

	/**
	 * Gets whether there's an active session
	 */
	hasActiveSession(): boolean {
		return this.session !== null;
	}

	/**
	 * Gets the current session
	 */
	getSession(): Session | null {
		return this.session;
	}

	// ========== Exercise Operations ==========

	/**
	 * Gets the current exercise index
	 */
	getCurrentExerciseIndex(): number {
		return this.currentExerciseIndex;
	}

	/**
	 * Sets the current exercise index
	 * Cancels rest timer when switching to a different exercise
	 */
	setCurrentExerciseIndex(index: number): void {
		if (!this.session) return;
		if (index >= 0 && index < this.session.exercises.length) {
			// Cancel rest timer when switching exercises (timer is only for between sets)
			if (index !== this.currentExerciseIndex) {
				this.cancelRestTimer();
			}
			this.currentExerciseIndex = index;
			this.notifyListeners();
		}
	}

	/**
	 * Gets the current exercise
	 */
	getCurrentExercise(): SessionExercise | null {
		if (!this.session || this.session.exercises.length === 0) return null;
		return this.session.exercises[this.currentExerciseIndex] ?? null;
	}

	/**
	 * Gets an exercise by index
	 */
	getExercise(index: number): SessionExercise | null {
		if (!this.session) return null;
		return this.session.exercises[index] ?? null;
	}

	/**
	 * Adds an exercise to the session
	 */
	addExercise(exerciseName: string, workoutExercise?: WorkoutExercise): void {
		if (!this.session) return;

		const newExercise: SessionExercise = {
			exercise: exerciseName,
			targetSets: workoutExercise?.targetSets ?? 3,
			targetRepsMin: workoutExercise?.targetRepsMin ?? 8,
			targetRepsMax: workoutExercise?.targetRepsMax ?? 12,
			restSeconds: workoutExercise?.restSeconds ?? this.settings.defaultRestSeconds,
			sets: []
		};

		this.session.exercises.push(newExercise);
		this.saveImmediately();
		this.notifyListeners();
	}

	/**
	 * Removes an exercise from the session
	 */
	removeExercise(index: number): void {
		if (!this.session) return;
		if (index < 0 || index >= this.session.exercises.length) return;

		this.session.exercises.splice(index, 1);

		// Adjust current exercise index if needed
		if (this.currentExerciseIndex >= this.session.exercises.length) {
			this.currentExerciseIndex = Math.max(0, this.session.exercises.length - 1);
		}

		this.saveImmediately();
		this.notifyListeners();
	}

	/**
	 * Reorders exercises
	 */
	reorderExercises(fromIndex: number, toIndex: number): void {
		if (!this.session) return;
		if (fromIndex < 0 || fromIndex >= this.session.exercises.length) return;
		if (toIndex < 0 || toIndex >= this.session.exercises.length) return;

		const removed = this.session.exercises.splice(fromIndex, 1);
		const exercise = removed[0];
		if (!exercise) return;
		this.session.exercises.splice(toIndex, 0, exercise);

		// Update current exercise index to follow the exercise
		if (this.currentExerciseIndex === fromIndex) {
			this.currentExerciseIndex = toIndex;
		} else if (fromIndex < this.currentExerciseIndex && toIndex >= this.currentExerciseIndex) {
			this.currentExerciseIndex--;
		} else if (fromIndex > this.currentExerciseIndex && toIndex <= this.currentExerciseIndex) {
			this.currentExerciseIndex++;
		}

		this.saveImmediately();
		this.notifyListeners();
	}

	// ========== Set Operations ==========

	/**
	 * Logs a completed set
	 * Returns a promise that resolves when the set is persisted to disk
	 */
	async logSet(exerciseIndex: number, weight: number, reps: number, rpe?: number): Promise<void> {
		if (!this.session) return;
		const exercise: SessionExercise | undefined = this.session.exercises[exerciseIndex];
		if (!exercise) return;

		const set: LoggedSet = {
			weight,
			reps,
			completed: true,
			timestamp: new Date().toISOString(),
			rpe
		};

		exercise.sets.push(set);

		// Auto-start rest timer if enabled, but not if exercise is now complete
		const completedSets = exercise.sets.filter(s => s.completed).length;
		const isExerciseComplete = completedSets >= exercise.targetSets;

		if (this.settings.autoStartRestTimer && !isExerciseComplete) {
			this.startRestTimer(exercise.restSeconds, exerciseIndex);
		}

		// Persist immediately and wait for completion
		await this.saveAndWait();
		this.notifyListeners();
	}

	/**
	 * Edits an existing set
	 */
	async editSet(
		exerciseIndex: number,
		setIndex: number,
		updates: Partial<Pick<LoggedSet, 'weight' | 'reps' | 'rpe'>>
	): Promise<void> {
		if (!this.session) return;
		const exercise = this.session.exercises[exerciseIndex];
		if (!exercise) return;
		const set = exercise.sets[setIndex];
		if (!set) return;

		if (updates.weight !== undefined) set.weight = updates.weight;
		if (updates.reps !== undefined) set.reps = updates.reps;
		if (updates.rpe !== undefined) set.rpe = updates.rpe;

		await this.saveAndWait();
		this.notifyListeners();
	}

	/**
	 * Deletes a set
	 */
	async deleteSet(exerciseIndex: number, setIndex: number): Promise<void> {
		if (!this.session) return;
		const exercise = this.session.exercises[exerciseIndex];
		if (!exercise) return;

		exercise.sets.splice(setIndex, 1);

		await this.saveAndWait();
		this.notifyListeners();
	}

	/**
	 * Gets the last logged set for an exercise (for prefill)
	 */
	getLastSet(exerciseIndex: number): LoggedSet | null {
		if (!this.session) return null;
		const exercise = this.session.exercises[exerciseIndex];
		if (!exercise || exercise.sets.length === 0) return null;
		return exercise.sets[exercise.sets.length - 1] ?? null;
	}

	/**
	 * Sets the RPE for an exercise
	 */
	async setExerciseRpe(exerciseIndex: number, rpe: number): Promise<void> {
		if (!this.session) return;
		const exercise = this.session.exercises[exerciseIndex];
		if (!exercise) return;

		exercise.rpe = rpe;

		await this.saveAndWait();
		this.notifyListeners();
	}

	/**
	 * Gets the RPE for an exercise
	 */
	getExerciseRpe(exerciseIndex: number): number | undefined {
		if (!this.session) return undefined;
		const exercise = this.session.exercises[exerciseIndex];
		return exercise?.rpe;
	}

	// ========== Rest Timer ==========

	/**
	 * Starts the rest timer
	 */
	startRestTimer(seconds: number, exerciseIndex: number): void {
		this.cancelRestTimer();

		this.restTimer = {
			endTime: Date.now() + seconds * 1000,
			duration: seconds,
			exerciseIndex
		};

		// Update every second
		this.restTimerInterval = window.setInterval(() => {
			this.notifyListeners();

			// Check if timer is done
			if (this.restTimer && Date.now() >= this.restTimer.endTime) {
				this.cancelRestTimer();
			}
		}, 1000);

		this.notifyListeners();
	}

	/**
	 * Adds time to the rest timer
	 */
	addRestTime(seconds: number): void {
		if (!this.restTimer) return;

		this.restTimer.endTime += seconds * 1000;
		this.restTimer.duration += seconds;
		this.notifyListeners();
	}

	/**
	 * Cancels the rest timer
	 */
	cancelRestTimer(): void {
		if (this.restTimerInterval !== null) {
			window.clearInterval(this.restTimerInterval);
			this.restTimerInterval = null;
		}
		this.restTimer = null;
		this.notifyListeners();
	}

	/**
	 * Gets the remaining rest time in seconds
	 */
	getRestTimeRemaining(): number {
		if (!this.restTimer) return 0;
		return Math.max(0, Math.ceil((this.restTimer.endTime - Date.now()) / 1000));
	}

	/**
	 * Returns whether the rest timer is active
	 */
	isRestTimerActive(): boolean {
		return this.restTimer !== null && Date.now() < this.restTimer.endTime;
	}

	/**
	 * Gets the rest timer state
	 */
	getRestTimer(): RestTimerState | null {
		return this.restTimer;
	}

	// ========== Subscription ==========

	/**
	 * Subscribes to state changes
	 */
	subscribe(listener: StateChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Notifies all listeners of state change
	 */
	private notifyListeners(): void {
		// Copy listeners to avoid issues when listeners modify the Set during iteration
		const listenersCopy = [...this.listeners];
		for (const listener of listenersCopy) {
			try {
				listener();
			} catch (error) {
				console.error('Listener error:', error);
			}
		}
	}

	// ========== Persistence ==========

	private savePromise: Promise<void> | null = null;
	private pendingSave = false;

	/**
	 * Saves immediately and waits for completion
	 * This ensures data is persisted before returning
	 */
	private async saveAndWait(): Promise<void> {
		if (!this.session) return;

		// If a save is in progress, wait for it and then save again
		if (this.savePromise) {
			await this.savePromise;
		}

		// Now do our save
		this.savePromise = this.doSave();
		await this.savePromise;
	}

	/**
	 * Saves immediately (fire-and-forget)
	 * Uses a queue to prevent concurrent saves
	 */
	private saveImmediately(): void {
		if (!this.session) return;

		// If a save is in progress, mark that we need another save after
		if (this.savePromise) {
			this.pendingSave = true;
			return;
		}

		this.savePromise = this.doSave();
	}

	/**
	 * Performs the actual save operation
	 */
	private async doSave(): Promise<void> {
		try {
			if (this.session) {
				await this.sessionRepo.saveActive(this.session);
			}
		} catch (error) {
			console.error('Save failed:', error);
		} finally {
			this.savePromise = null;

			// If there's a pending save, do it now
			if (this.pendingSave) {
				this.pendingSave = false;
				this.saveImmediately();
			}
		}
	}

	/**
	 * Saves the current session to file (for compatibility)
	 */
	private async saveToFile(): Promise<void> {
		if (!this.session) return;
		await this.sessionRepo.saveActive(this.session);
	}

	/**
	 * Cleanup on unload
	 */
	async cleanup(): Promise<void> {
		// Wait for any in-progress save to complete
		if (this.savePromise) {
			await this.savePromise;
		}

		// Final save if needed
		if (this.session) {
			await this.saveToFile();
		}

		// Cancel rest timer
		this.cancelRestTimer();
	}
}
