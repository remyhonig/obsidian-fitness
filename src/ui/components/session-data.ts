import { setIcon } from 'obsidian';
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
	const { currentExercise, feedback } = options;

	const container = parent.createDiv({ cls: 'fit-session-data' });

	// Check if we have content to show
	const hasThisTimeContent = feedback?.coach_cue_volgende_sessie || feedback?.aanpak_volgende_sessie;
	const hasThisTimeSets = currentExercise.targetSets > 0;

	// THIS TIME section
	if (hasThisTimeContent || hasThisTimeSets) {
		renderThisTimeSection(container, options);
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

	// No box styling, no label - content renders directly
	const section = parent.createDiv({ cls: 'fit-session-data-inline' });

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

	// Show previous session's sets for context (helps understand coaching tips)
	const previousCompletedSets = previousExercise?.sets.filter(s => s.completed) ?? [];
	if (previousCompletedSets.length > 0) {
		const previousChipsContainer = section.createDiv({ cls: 'fit-session-data-chips fit-session-data-chips-previous' });

		for (const set of previousCompletedSets) {
			const chipText = `${set.reps}×${set.weight}${weightUnit}`;
			previousChipsContainer.createSpan({
				cls: 'fit-session-data-chip fit-session-data-chip-previous',
				text: chipText
			});
		}
	}

	// Coaching tips section (styled like general coaching tips)
	const hasTips = feedback?.aanpak_volgende_sessie || feedback?.coach_cue_volgende_sessie;
	if (hasTips) {
		const tipsContainer = section.createDiv({ cls: 'fit-exercise-coaching-tips' });

		const header = tipsContainer.createDiv({ cls: 'fit-exercise-coaching-tips-header' });
		const iconEl = header.createDiv({ cls: 'fit-exercise-coaching-tips-icon' });
		setIcon(iconEl, 'target');
		header.createDiv({ cls: 'fit-exercise-coaching-tips-title', text: 'Target' });

		const content = tipsContainer.createDiv({ cls: 'fit-exercise-coaching-tips-content' });

		if (feedback?.aanpak_volgende_sessie) {
			content.createDiv({ cls: 'fit-exercise-coaching-tips-item', text: feedback.aanpak_volgende_sessie });
		}

		if (feedback?.coach_cue_volgende_sessie) {
			content.createDiv({ cls: 'fit-exercise-coaching-tips-item', text: feedback.coach_cue_volgende_sessie });
		}
	}
}
