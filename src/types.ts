// Weight unit types
export type WeightUnit = 'kg' | 'lbs';

// Exercise source - database (read-only, not synced) or custom (editable, synced)
export type ExerciseSource = 'database' | 'custom';

// Exercise definition
export interface Exercise {
	id: string; // Derived from filename or database key
	name: string;
	category?: string;
	equipment?: string;
	muscleGroups?: string[];
	defaultWeight?: number;
	weightIncrement?: number;
	image0?: string; // URL to first exercise image (start position)
	image1?: string; // URL to second exercise image (end position)
	notes?: string;
	source: ExerciseSource; // Where the exercise comes from
}

// Raw database exercise entry (as stored in exercise-database.json)
export interface DatabaseExerciseEntry {
	id: string;
	name: string;
	category?: string;
	equipment?: string;
	primaryMuscles: string[];
	secondaryMuscles: string[];
	instructions: string[];
	images: string[];
}

// Workout exercise entry (reference to an exercise with targets)
export interface WorkoutExercise {
	exercise: string; // Exercise name (display)
	exerciseId?: string; // Exercise ID/slug (for lookups)
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	restSeconds: number;
	notes?: string;
	source?: ExerciseSource; // Database or custom exercise
}

// Workout definition (stored in Workouts/ folder)
export interface Workout {
	id: string; // Derived from filename
	name: string;
	description?: string;
	estimatedDuration?: number;
	exercises: WorkoutExercise[];
}

// Program definition (stored in Programs/ folder)
export interface Program {
	id: string; // Derived from filename
	name: string;
	description?: string;
	workouts: string[]; // Workout IDs in order
	questions?: Question[]; // Optional review questions embedded in program
}

// Questionnaire option (single choice)
export interface QuestionOption {
	id: string;
	label: string;
}

// Question definition
export interface Question {
	id: string;
	text: string;
	options: QuestionOption[];
	allowFreeText?: boolean;
	freeTextTrigger?: string; // Option ID that triggers free text
	freeTextMaxLength?: number;
}

// Answer to a single question
export interface QuestionAnswer {
	questionId: string;
	questionText: string;
	selectedOptionId: string;
	selectedOptionLabel: string;
	freeText?: string;
}

// Review attached to a completed session
export interface SessionReview {
	programId: string;
	completedAt: string; // ISO 8601 datetime
	answers: QuestionAnswer[];
	skipped: boolean;
}

// Logged set during a workout session
export interface LoggedSet {
	weight: number;
	reps: number;
	completed: boolean;
	timestamp: string; // ISO 8601
	rpe?: number;
	duration?: number; // Set duration in seconds (from start to completion)
}

// Muscle engagement options
export type MuscleEngagement = 'yes-clearly' | 'moderately' | 'not-really';

// Exercise data within a session
export interface SessionExercise {
	exercise: string; // Exercise name/id
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	restSeconds: number;
	sets: LoggedSet[];
	rpe?: number; // Rate of Perceived Exertion (7-10)
	muscleEngagement?: MuscleEngagement; // Did the exercise work the correct muscle?
}

// Session status
export type SessionStatus = 'active' | 'paused' | 'completed' | 'discarded';

// Workout session (stored in Sessions/ folder)
export interface Session {
	id: string; // Derived from filename
	date: string; // ISO 8601 date
	startTime: string; // ISO 8601 datetime
	endTime?: string; // ISO 8601 datetime
	workout?: string; // Workout name used
	status: SessionStatus;
	exercises: SessionExercise[];
	notes?: string;
	review?: SessionReview; // Post-workout questionnaire answers
	coachFeedback?: string; // Feedback for the next session of this workout
}

// Rest timer state
export interface RestTimerState {
	endTime: number; // Unix timestamp when timer ends
	duration: number; // Original duration in seconds
	exerciseIndex: number; // Which exercise triggered the timer
}

// Active session state (in-memory)
export interface ActiveSessionState {
	session: Session;
	currentExerciseIndex: number;
	restTimer: RestTimerState | null;
	isDirty: boolean; // Has unsaved changes
}

// Screen types for navigation
export type ScreenType =
	| 'home'
	| 'workout-picker'
	| 'session'
	| 'exercise'
	| 'finish'
	| 'history'
	| 'session-detail'
	| 'workout-editor'
	| 'exercise-library'
	| 'exercise-detail'
	| 'questionnaire'
	| 'feedback';

// Screen navigation parameters
export interface ScreenParams {
	exerciseIndex?: number;
	sessionId?: string;
	workoutId?: string;
	exerciseId?: string;
	programId?: string;
	questions?: Question[];
	isNew?: boolean;
	workoutName?: string; // For feedback screen title
	existingFeedback?: string; // For pre-populating feedback textarea
	fromScreen?: ScreenType; // Origin screen for context-aware back navigation
}

// Event listener types
export type StateChangeListener = () => void;

// File frontmatter types (for parsing)
// Note: Exercises are stored in the body as markdown tables, not in frontmatter
export interface ExerciseFrontmatter {
	name: string;
	category?: string;
	equipment?: string;
	muscleGroups?: string[];
	defaultWeight?: number;
	weightIncrement?: number;
	image0?: string;
	image1?: string;
}

export interface WorkoutFrontmatter {
	name: string;
	description?: string;
	estimatedDuration?: number;
	// exercises stored in body as markdown table
}

export interface SessionFrontmatter {
	date: string;
	startTime: string;
	startTimeFormatted?: string;
	endTime?: string;
	endTimeFormatted?: string;
	workout?: string;
	status: SessionStatus;
	notes?: string;
	// exercises and coachFeedback stored in body as markdown sections
}
