/**
 * Types for structured coach feedback parsing
 */

/**
 * Gymfloor action - general training advice
 */
export interface GymfloorAction {
	actie: string;
}

/**
 * Exercise-specific feedback with analysis
 */
export interface ExerciseFeedback {
	oefening: string;
	stimulus?: string;
	set_degradatie_en_vermoeidheid?: string;
	progressie_tov_vorige?: string;
	coach_cue_volgende_sessie?: string;
	aanpak_volgende_sessie?: string;
}

/**
 * Motivational message
 */
export interface MotivationBoost {
	stijl: string;
	tekst: string;
}

/**
 * Root coach feedback structure
 */
export interface StructuredCoachFeedback {
	gymfloor_acties?: GymfloorAction[];
	analyse_en_context?: ExerciseFeedback[];
	motivatie_boost?: MotivationBoost;
}

/**
 * Validation result for exercise matching
 */
export interface ExerciseValidationResult {
	exerciseName: string;
	matched: boolean;
	sessionExerciseName?: string;
}

/**
 * Overall validation status
 */
export interface FeedbackValidationStatus {
	isValid: boolean;
	hasGymfloorActies: boolean;
	gymfloorActiesCount: number;
	hasExerciseFeedback: boolean;
	exerciseValidations: ExerciseValidationResult[];
	hasMotivation: boolean;
	parseError?: string;
}
