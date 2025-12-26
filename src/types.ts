// Weight unit types
export type WeightUnit = 'kg' | 'lbs';

// Exercise definition (stored in Exercises/ folder)
export interface Exercise {
	id: string; // Derived from filename
	name: string;
	category?: string;
	equipment?: string;
	muscleGroups?: string[];
	defaultWeight?: number;
	weightIncrement?: number;
	image0?: string; // URL to first exercise image (start position)
	image1?: string; // URL to second exercise image (end position)
	notes?: string;
}

// Template exercise entry (reference to an exercise with targets)
export interface TemplateExercise {
	exercise: string; // Exercise name/id
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	restSeconds: number;
	notes?: string;
}

// Workout template (stored in Templates/ folder)
export interface Template {
	id: string; // Derived from filename
	name: string;
	description?: string;
	estimatedDuration?: number;
	exercises: TemplateExercise[];
}

// Logged set during a workout session
export interface LoggedSet {
	weight: number;
	reps: number;
	completed: boolean;
	timestamp: string; // ISO 8601
	rpe?: number;
}

// Exercise data within a session
export interface SessionExercise {
	exercise: string; // Exercise name/id
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	restSeconds: number;
	sets: LoggedSet[];
}

// Session status
export type SessionStatus = 'active' | 'paused' | 'completed' | 'discarded';

// Workout session (stored in Sessions/ folder)
export interface Session {
	id: string; // Derived from filename
	date: string; // ISO 8601 date
	startTime: string; // ISO 8601 datetime
	endTime?: string; // ISO 8601 datetime
	template?: string; // Template name/id used
	status: SessionStatus;
	exercises: SessionExercise[];
	notes?: string;
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
	| 'template-picker'
	| 'session'
	| 'exercise'
	| 'finish'
	| 'history'
	| 'session-detail'
	| 'template-editor'
	| 'exercise-library'
	| 'exercise-detail';

// Screen navigation parameters
export interface ScreenParams {
	exerciseIndex?: number;
	sessionId?: string;
	templateId?: string;
	exerciseId?: string;
	isNew?: boolean;
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

export interface TemplateFrontmatter {
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
	template?: string;
	status: SessionStatus;
	notes?: string;
	// exercises stored in body as markdown blocks with tables
}
