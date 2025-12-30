import type { SessionExercise, LoggedSet } from '../../types';
import type { SessionRepository } from '../../data/session-repository';

/**
 * Encapsulates form state for the exercise screen.
 * Separates screen-local form state from global session state.
 */
export class ExerciseFormState {
	weight = 20; // Reasonable default for most exercises
	reps = 8;
	private historyLoaded = false;

	/**
	 * Initializes form state from the current session's last set
	 */
	loadFromCurrentSession(exercise: SessionExercise, lastSet: LoggedSet | null): void {
		if (lastSet) {
			this.weight = lastSet.weight;
			this.reps = lastSet.reps;
		} else {
			// Use target reps as default
			this.reps = exercise.targetRepsMin ?? 8;
		}
	}

	/**
	 * Loads form values from history (previous session's matching exercise)
	 * Returns true if values were updated
	 */
	async loadFromHistory(
		exerciseName: string,
		sessionRepo: SessionRepository,
		signal: AbortSignal
	): Promise<boolean> {
		if (this.historyLoaded) return false;
		this.historyLoaded = true;

		try {
			const sessions = await sessionRepo.list();
			if (signal.aborted) return false;

			const exerciseNameLower = exerciseName.toLowerCase();

			for (const session of sessions) {
				const sessionEx = session.exercises.find(
					e => e.exercise.toLowerCase() === exerciseNameLower
				);
				if (sessionEx && sessionEx.sets.length > 0) {
					const completedSets = sessionEx.sets.filter(s => s.completed);
					if (completedSets.length > 0) {
						const lastHistorySet = completedSets[completedSets.length - 1];
						if (lastHistorySet && !signal.aborted) {
							this.weight = lastHistorySet.weight;
							this.reps = lastHistorySet.reps;
							return true;
						}
					}
					break; // Most recent first
				}
			}
		} catch (error) {
			console.error('Failed to load history:', error);
		}
		return false;
	}

	/**
	 * Resets history loaded flag (for when switching exercises)
	 */
	resetHistoryLoaded(): void {
		this.historyLoaded = false;
	}

	/**
	 * Updates weight value
	 */
	setWeight(value: number): void {
		this.weight = Math.max(0, Math.round(value * 100) / 100);
	}

	/**
	 * Updates reps value
	 */
	setReps(value: number): void {
		this.reps = Math.max(1, Math.round(value));
	}

	/**
	 * Loads values from an existing set (for editing)
	 */
	loadFromSet(set: LoggedSet): void {
		this.weight = set.weight;
		this.reps = set.reps;
	}

	/**
	 * Resets to defaults for a new exercise
	 */
	resetForExercise(exercise: SessionExercise, lastSet: LoggedSet | null): void {
		if (lastSet) {
			this.weight = lastSet.weight;
			this.reps = lastSet.reps;
		} else {
			this.weight = 20;
			this.reps = exercise.targetRepsMin ?? 8;
		}
		this.historyLoaded = false;
	}

	/**
	 * Validates that the form has valid values for logging
	 * Weight can be 0 for body weight exercises
	 */
	isValid(): boolean {
		return this.weight >= 0 && this.reps > 0;
	}
}
