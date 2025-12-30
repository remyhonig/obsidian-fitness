/**
 * Progress card component for exercise screen
 */

import type { SessionExercise } from '../../../types';
import type { SessionStateManager } from '../../../state/session-state';
import { TimerDisplayRefs, updateTimerDisplay } from './exercise-timer';

export interface ProgressCardOptions {
	exercise: SessionExercise;
	sessionState: SessionStateManager;
	exerciseIndex: number;
}

export interface ProgressCardRefs {
	container: HTMLElement;
	timerRefs: TimerDisplayRefs;
	isComplete: boolean;
}

/**
 * Creates the progress card showing sets, timer, and target reps
 */
export function createProgressCard(
	parent: HTMLElement,
	options: ProgressCardOptions
): ProgressCardRefs {
	const { exercise, sessionState, exerciseIndex } = options;

	const completedSets = exercise.sets.filter(s => s.completed).length;
	const isComplete = completedSets >= exercise.targetSets;

	const progressCard = parent.createDiv({ cls: 'fit-progress-card-wide' });

	// Sets stat
	const setsSection = progressCard.createDiv({ cls: 'fit-stat-wide' });
	setsSection.createDiv({ cls: 'fit-stat-label-vertical', text: 'Sets' });
	setsSection.createDiv({ cls: 'fit-stat-value-large', text: `${completedSets} / ${exercise.targetSets}` });

	// Duration/Timer stat (clickable to start/reset set timer when not complete)
	const timerSection = progressCard.createDiv({ cls: 'fit-stat-wide' });
	if (!isComplete) {
		timerSection.addClass('fit-timer-section');
	}

	const timerLabelEl = timerSection.createDiv({ cls: 'fit-stat-label-vertical' });
	const timerEl = timerSection.createDiv({ cls: 'fit-stat-value-large' });

	const timerRefs: TimerDisplayRefs = { labelEl: timerLabelEl, valueEl: timerEl };

	// Initial timer update
	updateTimerDisplay(timerRefs, sessionState);

	// Click on timer to skip rest or start/reset set duration tracking (only if exercise not complete)
	if (!isComplete) {
		timerSection.addEventListener('click', () => {
			if (sessionState.isRestTimerActive()) {
				// Skip rest and start set timer
				sessionState.cancelRestTimer();
			}
			sessionState.markSetStart(exerciseIndex);
		});
	}

	// Target Reps stat
	const targetReps = exercise.targetRepsMin === exercise.targetRepsMax
		? `${exercise.targetRepsMin}`
		: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
	const targetSection = progressCard.createDiv({ cls: 'fit-stat-wide' });
	targetSection.createDiv({ cls: 'fit-stat-label-vertical', text: 'Target' });
	targetSection.createDiv({ cls: 'fit-stat-value-large', text: targetReps });

	return {
		container: progressCard,
		timerRefs,
		isComplete
	};
}
