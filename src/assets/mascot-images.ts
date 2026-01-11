/**
 * Mascot Images Module
 *
 * Imports all mascot illustrations as base64 data URLs.
 * This ensures images are bundled into main.js and work on all platforms.
 */

// Full body SVGs
import gorillaCoachCelebrating from './illustrations/gorilla_coach_celebrating.svg';
import gorillaCoachNeutral from './illustrations/gorilla_coach_neutral.svg';
import gorillaCoachThinking from './illustrations/gorilla_coach_thinking.svg';

// Head only SVGs
import gorillaCoachCelebratingHead from './illustrations/gorilla_coach_celebrating_head.svg';
import gorillaCoachNeutralHead from './illustrations/gorilla_coach_neutral_head.svg';
import gorillaCoachThinkingHeadHand from './illustrations/gorilla_coach_thinking_head_hand.svg';

// PNG variants
import gorillaCoachTakingNotes from './illustrations/gorilla_coach_taking_notes.png';
import gorillaCoachPosing from './illustrations/gorillal_coach_posing_with_me.png';

// Icons
import iconCheckmark from './illustrations/icon-checkmark.svg';
import iconDumbbell from './illustrations/icon-dumbbell.svg';
import iconMuscle from './illustrations/icon-muscle.svg';
import iconRest from './illustrations/icon-rest.svg';
import iconTimer from './illustrations/icon-timer.svg';

export type MascotMood = 'neutral' | 'celebrating' | 'thinking' | 'taking_notes' | 'posing';

/**
 * Get the mascot image URL for a given mood and variant
 */
export function getMascotImage(mood: MascotMood, headOnly: boolean): string {
	if (mood === 'taking_notes') {
		return gorillaCoachTakingNotes;
	}
	if (mood === 'posing') {
		return gorillaCoachPosing;
	}

	if (headOnly) {
		switch (mood) {
			case 'celebrating':
				return gorillaCoachCelebratingHead;
			case 'thinking':
				return gorillaCoachThinkingHeadHand;
			case 'neutral':
			default:
				return gorillaCoachNeutralHead;
		}
	} else {
		switch (mood) {
			case 'celebrating':
				return gorillaCoachCelebrating;
			case 'thinking':
				return gorillaCoachThinking;
			case 'neutral':
			default:
				return gorillaCoachNeutral;
		}
	}
}

/**
 * Icon exports for use elsewhere in the app
 */
export const icons = {
	checkmark: iconCheckmark,
	dumbbell: iconDumbbell,
	muscle: iconMuscle,
	rest: iconRest,
	timer: iconTimer,
};
