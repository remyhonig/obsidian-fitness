import type { Session, MuscleEngagement, WorkoutExercise } from '../types';
import type { SessionStateManager } from '../state/session-state';
import type { PluginSettings } from '../settings';
import type { ProgramRepository } from '../data/program-repository';
import type {
	FitViewState,
	ViewStateListener,
	WorkoutTemplate,
	SetUpdate
} from './fit-viewmodel.types';
import {
	computeViewState,
	getDefaultWeight,
	getDefaultReps,
	getCurrentExercise
} from './computed-state';
import { toSlug } from '../domain/identifier';

/**
 * FitViewModel - Testable application behavior layer
 *
 * This ViewModel wraps SessionStateManager and provides:
 * - A simpler interface for UI components
 * - Form state management (weight/reps)
 * - Computed state for rendering
 * - Testable action methods
 *
 * All business logic can be tested by calling action methods and
 * verifying the resulting state, without any DOM or Obsidian dependencies.
 */
export class FitViewModel {
	private listeners: Set<ViewStateListener> = new Set();
	private cachedState: FitViewState | null = null;

	// Form state
	private _weight = 0;
	private _reps = 8;

	constructor(
		private sessionState: SessionStateManager,
		private settings: PluginSettings,
		private programRepo: ProgramRepository,
		private saveSettings: () => Promise<void>
	) {
		// Subscribe to all state changes and invalidate cache
		this.sessionState.subscribe(() => {
			this.invalidateCache();
			this.notifyListeners();
		});
	}

	// ========== State Access ==========

	/**
	 * Get the current computed view state.
	 * This is the primary method screens use to get data for rendering.
	 */
	getState(): FitViewState {
		if (!this.cachedState) {
			this.cachedState = this.computeState();
		}
		return this.cachedState;
	}

	/**
	 * Subscribe to state changes.
	 * Returns an unsubscribe function.
	 */
	subscribe(listener: ViewStateListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	// ========== Session Lifecycle ==========

	/**
	 * Start a new workout session from a workout template.
	 */
	startWorkout(workout: WorkoutTemplate): void {
		this.sessionState.startFromWorkout(workout);
		this.initializeFormStateForExercise(0);
	}

	/**
	 * Start an empty workout session (no predefined exercises).
	 */
	startEmptyWorkout(): void {
		this.sessionState.startEmpty();
		this._weight = 0;
		this._reps = 8;
	}

	/**
	 * Finish the current workout session.
	 * Returns the completed session.
	 */
	async finishWorkout(): Promise<Session | null> {
		const session = await this.sessionState.finishSession();

		// Advance program if matching
		if (session) {
			await this.advanceProgramIfMatching(session);
		}

		return session;
	}

	/**
	 * Discard the current workout session.
	 */
	async discardWorkout(): Promise<void> {
		await this.sessionState.discardSession();
	}

	// ========== Exercise Actions ==========

	/**
	 * Select an exercise by index.
	 * Updates form state with defaults from the exercise.
	 */
	selectExercise(index: number): void {
		this.sessionState.setCurrentExerciseIndex(index);
		this.initializeFormStateForExercise(index);
	}

	/**
	 * Add an exercise to the current session.
	 */
	addExercise(name: string, config?: WorkoutExercise): void {
		this.sessionState.addExercise(name, config);
	}

	/**
	 * Remove an exercise from the current session.
	 */
	removeExercise(index: number): void {
		this.sessionState.removeExercise(index);
	}

	/**
	 * Reorder exercises in the current session.
	 */
	reorderExercises(fromIndex: number, toIndex: number): void {
		this.sessionState.reorderExercises(fromIndex, toIndex);
	}

	// ========== Set Actions ==========

	/**
	 * Log a completed set for the current exercise.
	 * Uses the current form state for weight/reps unless overridden.
	 */
	async logSet(weight?: number, reps?: number, rpe?: number): Promise<void> {
		const state = this.getState();
		const exerciseIndex = state.currentExerciseIndex;

		const actualWeight = weight ?? this._weight;
		const actualReps = reps ?? this._reps;

		// Validation
		if (actualWeight <= 0) {
			throw new Error('Weight must be greater than 0');
		}
		if (actualReps <= 0) {
			throw new Error('Reps must be greater than 0');
		}

		await this.sessionState.logSet(exerciseIndex, actualWeight, actualReps, rpe);
	}

	/**
	 * Edit an existing set.
	 */
	async editSet(setIndex: number, updates: SetUpdate): Promise<void> {
		const state = this.getState();
		await this.sessionState.editSet(state.currentExerciseIndex, setIndex, updates);
	}

	/**
	 * Delete a set from the current exercise.
	 */
	async deleteSet(setIndex: number): Promise<void> {
		const state = this.getState();
		await this.sessionState.deleteSet(state.currentExerciseIndex, setIndex);
	}

	/**
	 * Mark the start of a new set (for timing).
	 * For the first set of each exercise, starts a 5-second countdown before the set timer.
	 * For subsequent sets, starts the set timer immediately.
	 */
	markSetStart(): void {
		const state = this.getState();
		const completedSets = state.exerciseCompletion.completedSets;

		if (completedSets === 0) {
			// First set of exercise - use countdown
			this.sessionState.startSetWithCountdown(state.currentExerciseIndex);
		} else {
			// Subsequent sets - no countdown
			this.sessionState.markSetStart(state.currentExerciseIndex);
		}
	}

	/**
	 * Check if countdown is active.
	 */
	isCountdownActive(): boolean {
		return this.sessionState.isCountdownActive();
	}

	/**
	 * Get the remaining countdown seconds (null if not counting down).
	 */
	getCountdownRemaining(): number | null {
		return this.sessionState.getCountdownRemaining();
	}

	// ========== Timer Actions ==========

	/**
	 * Start the rest timer.
	 */
	startRestTimer(seconds?: number): void {
		const state = this.getState();
		const duration = seconds ?? state.currentExercise?.restSeconds ?? this.settings.defaultRestSeconds;
		this.sessionState.startRestTimer(duration, state.currentExerciseIndex);
	}

	/**
	 * Add time to the rest timer.
	 */
	addRestTime(seconds: number): void {
		this.sessionState.addRestTime(seconds);
	}

	/**
	 * Cancel the rest timer.
	 */
	cancelRestTimer(): void {
		this.sessionState.cancelRestTimer();
	}

	// ========== Questionnaire Actions ==========

	/**
	 * Set the RPE (Rate of Perceived Exertion) for the current exercise.
	 */
	async setExerciseRpe(rpe: number): Promise<void> {
		const state = this.getState();
		await this.sessionState.setExerciseRpe(state.currentExerciseIndex, rpe);
	}

	/**
	 * Set the muscle engagement for the current exercise.
	 */
	async setMuscleEngagement(value: MuscleEngagement): Promise<void> {
		const state = this.getState();
		await this.sessionState.setExerciseMuscleEngagement(state.currentExerciseIndex, value);
	}

	// ========== Form State ==========

	/**
	 * Set the weight for the next set.
	 */
	setWeight(weight: number): void {
		this._weight = weight;
		this.invalidateCache();
		this.notifyListeners();
	}

	/**
	 * Set the reps for the next set.
	 */
	setReps(reps: number): void {
		this._reps = reps;
		this.invalidateCache();
		this.notifyListeners();
	}

	/**
	 * Adjust weight by increment (positive or negative).
	 */
	adjustWeight(delta: number): void {
		this._weight = Math.max(0, this._weight + delta);
		this.invalidateCache();
		this.notifyListeners();
	}

	// ========== Private Methods ==========

	/**
	 * Compute the view state from underlying state.
	 */
	private computeState(): FitViewState {
		const session = this.sessionState.getSession();
		const currentExerciseIndex = this.sessionState.getCurrentExerciseIndex();
		const restTimerState = this.sessionState.getRestTimer();

		return computeViewState({
			session,
			hasActiveSession: this.sessionState.hasActiveSession(),
			currentExerciseIndex,
			restTimer: restTimerState ? {
				remaining: this.sessionState.getRestTimeRemaining(),
				duration: restTimerState.duration,
				exerciseIndex: restTimerState.exerciseIndex
			} : null,
			setTimerActive: this.sessionState.isSetTimerActive(),
			elapsedDuration: this.sessionState.getElapsedDuration(),
			weight: this._weight,
			reps: this._reps
		});
	}

	/**
	 * Initialize form state for an exercise (from last set or defaults).
	 */
	private initializeFormStateForExercise(exerciseIndex: number): void {
		const session = this.sessionState.getSession();
		const exercise = getCurrentExercise(session, exerciseIndex);

		this._weight = getDefaultWeight(exercise);
		this._reps = getDefaultReps(exercise);
		this.invalidateCache();
	}

	/**
	 * Advance program index if the completed workout matches current program workout.
	 */
	private async advanceProgramIfMatching(session: Session): Promise<void> {
		if (!this.settings.activeProgram || !session.workout) return;

		try {
			const program = await this.programRepo.get(this.settings.activeProgram);
			if (!program || program.workouts.length === 0) return;

			const currentIndex = this.settings.programWorkoutIndex % program.workouts.length;
			const currentWorkoutId = program.workouts[currentIndex];

			// Check if completed session matches current program workout
			const sessionWorkoutId = toSlug(session.workout);
			if (currentWorkoutId === sessionWorkoutId) {
				// Advance to next workout
				this.settings.programWorkoutIndex = (currentIndex + 1) % program.workouts.length;
				await this.saveSettings();
			}
		} catch (error) {
			console.error('Failed to advance program:', error);
		}
	}

	/**
	 * Invalidate the cached state.
	 */
	private invalidateCache(): void {
		this.cachedState = null;
	}

	/**
	 * Notify all listeners of state change.
	 */
	private notifyListeners(): void {
		const state = this.getState();
		for (const listener of [...this.listeners]) {
			try {
				listener(state);
			} catch (error) {
				console.error('ViewModel listener error:', error);
			}
		}
	}
}
