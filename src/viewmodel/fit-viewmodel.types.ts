import type { Session, SessionExercise, MuscleEngagement, Workout } from '../types';

/**
 * Exercise completion status - computed from session state
 */
export interface ExerciseCompletionStatus {
	completedSets: number;
	targetSets: number;
	isComplete: boolean;
	/** True when all exercises in the session have met their target sets */
	allExercisesComplete: boolean;
}

/**
 * Rest timer state - simplified for ViewModel consumers
 */
export interface RestTimerStatus {
	remaining: number;
	duration: number;
	exerciseIndex: number;
}

/**
 * FitViewState - The complete computed state for rendering
 *
 * This represents everything a screen needs to render, computed from
 * the underlying session state and domain functions.
 */
export interface FitViewState {
	// Session state
	hasActiveSession: boolean;
	isInProgress: boolean;
	session: Session | null;

	// Current exercise context
	currentExerciseIndex: number;
	currentExercise: SessionExercise | null;
	exerciseCompletion: ExerciseCompletionStatus;

	// Timer state
	restTimer: RestTimerStatus | null;
	setTimerActive: boolean;
	elapsedDuration: number;

	// Session metrics (computed via domain functions)
	sessionProgress: number;
	totalCompletedSets: number;
	totalTargetSets: number;
	totalVolume: number;

	// Form state for exercise screen
	weight: number;
	reps: number;
}

/**
 * Listener for state changes
 */
export type ViewStateListener = (state: FitViewState) => void;

/**
 * Dependencies required by the ViewModel
 * These are injected to enable testing without Obsidian
 */
export interface ViewModelDependencies {
	/** Function to persist settings changes */
	saveSettings: () => Promise<void>;
}

/**
 * Workout with exercises - passed to startWorkout
 */
export type WorkoutTemplate = Workout;

/**
 * Set update payload for editSet
 */
export interface SetUpdate {
	weight?: number;
	reps?: number;
	rpe?: number;
}

/**
 * Questionnaire answers for exercise
 */
export interface ExerciseQuestionnaire {
	rpe?: number;
	muscleEngagement?: MuscleEngagement;
}
