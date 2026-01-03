import type { SessionExercise, LoggedSet, MuscleEngagement } from '../../types';
import type { ExerciseFeedback } from '../../data/coach-feedback-types';

/** Maps muscle engagement values to emoji icons */
const MUSCLE_ENGAGEMENT_ICONS: Record<MuscleEngagement, string> = {
	'yes-clearly': '🟢',
	'moderately': '🟡',
	'not-really': '🔴'
};

export interface SessionDataOptions {
	currentExercise: SessionExercise;
	previousExercise?: SessionExercise;
	feedback?: ExerciseFeedback;
	weightUnit?: string;
	/** Callback when a completed set chip is clicked (for deletion) */
	onSetClick?: (setIndex: number) => void;
}

/**
 * Creates a reusable component showing THIS TIME and LAST TIME blocks
 * Used in both exercise detail screen and exercise card expandable section
 */
export function createSessionData(parent: HTMLElement, options: SessionDataOptions): HTMLElement {
	const { currentExercise, previousExercise, feedback, weightUnit = 'kg' } = options;

	const container = parent.createDiv({ cls: 'fit-session-data' });

	// Check if we have content to show
	const hasThisTimeContent = feedback?.coach_cue_volgende_sessie || feedback?.aanpak_volgende_sessie;
	const hasThisTimeSets = currentExercise.targetSets > 0;
	const hasLastTimeContent = feedback?.stimulus || feedback?.set_degradatie_en_vermoeidheid || feedback?.progressie_tov_vorige;
	const hasLastTimeSets = previousExercise && previousExercise.sets.some(s => s.completed);

	// THIS TIME section
	if (hasThisTimeContent || hasThisTimeSets) {
		renderThisTimeSection(container, options);
	}

	// LAST TIME section (only if there's previous data)
	if (hasLastTimeContent || hasLastTimeSets) {
		renderLastTimeSection(container, options);
	}

	return container;
}

interface FormatSetChipOptions {
	set: LoggedSet;
	weightUnit: string;
	muscleEngagement?: MuscleEngagement;
}

/**
 * Formats a set as chip text with optional annotations, RPE, and muscle engagement icon
 */
function formatSetChip(options: FormatSetChipOptions): string {
	const { set, weightUnit, muscleEngagement } = options;
	let chipText = `${set.reps}×${set.weight}${weightUnit}`;
	const annotations: string[] = [];

	if (set.extraRestSeconds) {
		annotations.push(`+${set.extraRestSeconds}s`);
	}
	if (set.avgRepDuration) {
		annotations.push(`${set.avgRepDuration.toFixed(1)}s/rep`);
	}
	if (annotations.length > 0) {
		chipText += ` (${annotations.join(', ')})`;
	}

	// Add RPE if present on the set
	if (set.rpe !== undefined) {
		chipText += ` RPE:${set.rpe}`;
	}

	// Add muscle engagement icon if present and valid
	if (muscleEngagement) {
		const icon = MUSCLE_ENGAGEMENT_ICONS[muscleEngagement];
		if (icon) {
			chipText += ` ${icon}`;
		}
	}

	return chipText;
}

/**
 * Renders the THIS TIME section with target sets and coaching advice
 */
function renderThisTimeSection(parent: HTMLElement, options: SessionDataOptions): void {
	const { currentExercise, previousExercise, feedback, weightUnit = 'kg', onSetClick } = options;

	const section = parent.createDiv({ cls: 'fit-session-data-section fit-session-data-this-time' });
	section.createDiv({ cls: 'fit-session-data-label', text: 'This time' });

	// Set chips - one per target set
	const chipsContainer = section.createDiv({ cls: 'fit-session-data-chips' });

	// Get target weight from last set of previous session
	const lastPreviousSet = previousExercise?.sets.filter(s => s.completed).slice(-1)[0];
	const targetWeight = lastPreviousSet?.weight;
	// Show single number if min equals max, otherwise show range
	const repsRange = currentExercise.targetRepsMin === currentExercise.targetRepsMax
		? `${currentExercise.targetRepsMin}`
		: `${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax}`;

	const completedSets = currentExercise.sets.filter(s => s.completed);

	for (let i = 0; i < currentExercise.targetSets; i++) {
		const completedSet = completedSets[i];

		if (completedSet) {
			// Show actual values - tappable if callback provided
			const chipText = formatSetChip({
				set: completedSet,
				weightUnit,
				muscleEngagement: currentExercise.muscleEngagement
			});
			const chip = chipsContainer.createSpan({
				cls: `fit-session-data-chip fit-session-data-chip-completed${onSetClick ? ' fit-session-data-chip-tappable' : ''}`,
				text: chipText
			});

			if (onSetClick) {
				// Find the actual index in the sets array
				const setIndex = currentExercise.sets.findIndex(s => s === completedSet);
				chip.addEventListener('click', (e) => {
					e.stopPropagation();
					onSetClick(setIndex);
				});
			}
		} else {
			// Show target values in muted color
			const weightText = targetWeight !== undefined ? `${targetWeight}${weightUnit}` : `?${weightUnit}`;
			const chipText = `${repsRange}×${weightText}`;
			chipsContainer.createSpan({
				cls: 'fit-session-data-chip fit-session-data-chip-target',
				text: chipText
			});
		}
	}

	// Rest time (no label)
	section.createDiv({ cls: 'fit-session-data-row fit-session-data-row-value', text: `${currentExercise.restSeconds}s` });

	// Approach (no label) - shown before coach cue
	if (feedback?.aanpak_volgende_sessie) {
		section.createDiv({ cls: 'fit-session-data-row fit-session-data-row-value', text: feedback.aanpak_volgende_sessie });
	}

	// Coach cue (no label)
	if (feedback?.coach_cue_volgende_sessie) {
		section.createDiv({ cls: 'fit-session-data-row fit-session-data-row-value', text: feedback.coach_cue_volgende_sessie });
	}
}

/**
 * Renders the LAST TIME section with previous session data and analysis
 */
function renderLastTimeSection(parent: HTMLElement, options: SessionDataOptions): void {
	const { previousExercise, feedback, weightUnit = 'kg' } = options;

	const section = parent.createDiv({ cls: 'fit-session-data-section fit-session-data-last-time' });
	section.createDiv({ cls: 'fit-session-data-label', text: 'Last time' });

	// Set chips from previous session
	if (previousExercise) {
		const completedSets = previousExercise.sets.filter(s => s.completed);
		if (completedSets.length > 0) {
			const chipsContainer = section.createDiv({ cls: 'fit-session-data-chips' });
			for (const set of completedSets) {
				chipsContainer.createSpan({
					cls: 'fit-session-data-chip',
					text: formatSetChip({
						set,
						weightUnit,
						muscleEngagement: previousExercise.muscleEngagement
					})
				});
			}
		}
	}

	// Set analysis (no label)
	if (feedback?.set_degradatie_en_vermoeidheid) {
		section.createDiv({ cls: 'fit-session-data-row fit-session-data-row-value', text: feedback.set_degradatie_en_vermoeidheid });
	}

	// Progress (no label)
	if (feedback?.progressie_tov_vorige) {
		section.createDiv({ cls: 'fit-session-data-row fit-session-data-row-value', text: feedback.progressie_tov_vorige });
	}

	// Stimulus (no label) - at the bottom
	if (feedback?.stimulus) {
		section.createDiv({ cls: 'fit-session-data-row fit-session-data-row-value', text: feedback.stimulus });
	}
}
