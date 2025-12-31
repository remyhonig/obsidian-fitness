/**
 * Parser for structured coach feedback YAML
 */

import { parseSimpleYaml } from './yaml-utils';
import type {
	StructuredCoachFeedback,
	GymfloorAction,
	ExerciseFeedback,
	FeedbackValidationStatus,
	ExerciseValidationResult,
} from './coach-feedback-types';

/**
 * Safely converts unknown value to string (only for primitives)
 */
function toStringValue(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
}

/**
 * Normalizes exercise name for comparison.
 * Strips all non-alphanumeric characters (spaces, dashes, symbols) and lowercases.
 * This allows "Easy Bar Curl", "easy-bar-curl", "EASY BAR CURL" to all match.
 */
export function normalizeExerciseName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses YAML coach feedback into structured format
 */
export function parseCoachFeedbackYaml(yamlContent: string): StructuredCoachFeedback | null {
	if (!yamlContent.trim()) {
		return null;
	}

	try {
		const parsed = parseSimpleYaml(yamlContent);

		const result: StructuredCoachFeedback = {};

		// Parse gymfloor_acties
		if (Array.isArray(parsed.gymfloor_acties)) {
			result.gymfloor_acties = parsed.gymfloor_acties
				.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
				.map((item): GymfloorAction => ({
					actie: toStringValue(item.actie),
				}))
				.filter(item => item.actie.length > 0);
		}

		// Parse analyse_en_context
		if (Array.isArray(parsed.analyse_en_context)) {
			result.analyse_en_context = parsed.analyse_en_context
				.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
				.map((item): ExerciseFeedback => ({
					oefening: toStringValue(item.oefening),
					stimulus: toStringValue(item.stimulus) || undefined,
					set_degradatie_en_vermoeidheid: toStringValue(item.set_degradatie_en_vermoeidheid) || undefined,
					progressie_tov_vorige: toStringValue(item.progressie_tov_vorige) || undefined,
					coach_cue_volgende_sessie: item.coach_cue_volgende_sessie
						? cleanQuotedString(toStringValue(item.coach_cue_volgende_sessie))
						: undefined,
					aanpak_volgende_sessie: toStringValue(item.aanpak_volgende_sessie) || undefined,
				}))
				.filter(item => item.oefening.length > 0);
		}

		// Parse motivatie_boost
		if (parsed.motivatie_boost && typeof parsed.motivatie_boost === 'object') {
			const mb = parsed.motivatie_boost as Record<string, unknown>;
			const stijl = toStringValue(mb.stijl);
			const tekst = toStringValue(mb.tekst);
			if (stijl && tekst) {
				result.motivatie_boost = { stijl, tekst };
			}
		}

		// Return null if nothing was parsed
		if (!result.gymfloor_acties?.length && !result.analyse_en_context?.length && !result.motivatie_boost) {
			return null;
		}

		return result;
	} catch {
		return null;
	}
}

/**
 * Cleans up escaped quotes in strings
 */
function cleanQuotedString(value: string): string {
	// Remove escaped quotes that may have been preserved
	return value.replace(/\\"/g, '"').replace(/^"|"$/g, '');
}

/**
 * Validates parsed feedback against session exercises
 */
export function validateFeedbackAgainstSession(
	feedback: StructuredCoachFeedback,
	sessionExerciseNames: string[]
): FeedbackValidationStatus {
	const normalizedSessionNames = sessionExerciseNames.map(normalizeExerciseName);

	const exerciseValidations: ExerciseValidationResult[] = [];

	if (feedback.analyse_en_context) {
		for (const ef of feedback.analyse_en_context) {
			const normalizedFeedbackName = normalizeExerciseName(ef.oefening);
			const matchIndex = normalizedSessionNames.findIndex(
				sessionName => sessionName === normalizedFeedbackName
			);

			exerciseValidations.push({
				exerciseName: ef.oefening,
				matched: matchIndex !== -1,
				sessionExerciseName: matchIndex !== -1 ? sessionExerciseNames[matchIndex] : undefined,
			});
		}
	}

	const allExercisesMatched = exerciseValidations.every(v => v.matched);

	return {
		isValid: allExercisesMatched,
		hasGymfloorActies: (feedback.gymfloor_acties?.length ?? 0) > 0,
		gymfloorActiesCount: feedback.gymfloor_acties?.length ?? 0,
		hasExerciseFeedback: (feedback.analyse_en_context?.length ?? 0) > 0,
		exerciseValidations,
		hasMotivation: feedback.motivatie_boost !== undefined,
	};
}

/**
 * Finds exercise feedback by name
 */
export function findExerciseFeedback(
	feedback: StructuredCoachFeedback,
	exerciseName: string
): ExerciseFeedback | undefined {
	if (!feedback.analyse_en_context) {
		return undefined;
	}

	const normalizedName = normalizeExerciseName(exerciseName);
	return feedback.analyse_en_context.find(
		ef => normalizeExerciseName(ef.oefening) === normalizedName
	);
}
