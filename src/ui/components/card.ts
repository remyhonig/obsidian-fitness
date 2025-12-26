import type { SessionExercise } from '../../types';

export interface ExerciseCardOptions {
	exercise: SessionExercise;
	index: number;
	image0?: string;
	image1?: string;
	onClick: () => void;
}

/**
 * Creates an exercise card for the session overview
 */
export function createExerciseCard(parent: HTMLElement, options: ExerciseCardOptions): HTMLElement {
	const { exercise, index, image0, image1 } = options;
	const completedSets = exercise.sets.filter(s => s.completed).length;
	const targetSets = exercise.targetSets;
	const isComplete = completedSets >= targetSets;

	const card = parent.createDiv({
		cls: `fit-exercise-card ${isComplete ? 'fit-exercise-card-complete' : ''}`
	});

	// Card layout: images on left, content on right
	const cardInner = card.createDiv({ cls: 'fit-exercise-card-inner' });

	// Image (left side) - show only image1 (end position)
	if (image1) {
		cardInner.createEl('img', {
			cls: 'fit-exercise-card-img',
			attr: { src: image1, alt: exercise.exercise }
		});
	}

	// Content container (right side)
	const content = cardInner.createDiv({ cls: 'fit-exercise-card-content' });

	// Header row
	const header = content.createDiv({ cls: 'fit-exercise-card-header' });
	header.createSpan({ cls: 'fit-exercise-card-number', text: String(index + 1) });
	header.createSpan({ cls: 'fit-exercise-card-name', text: exercise.exercise });

	// Progress indicator
	const progress = content.createDiv({ cls: 'fit-exercise-card-progress' });
	progress.createSpan({
		cls: 'fit-exercise-card-sets',
		text: `${completedSets}/${targetSets} sets`
	});

	// Target info
	const target = content.createDiv({ cls: 'fit-exercise-card-target' });
	target.createSpan({
		text: `${exercise.targetRepsMin}-${exercise.targetRepsMax} reps`
	});
	target.createSpan({ cls: 'fit-exercise-card-separator', text: '•' });
	target.createSpan({ text: `${exercise.restSeconds}s rest` });

	// Last set info (if any)
	const lastSet = exercise.sets[exercise.sets.length - 1];
	if (lastSet) {
		const lastInfo = content.createDiv({ cls: 'fit-exercise-card-last' });
		lastInfo.createSpan({
			text: `Last: ${lastSet.weight} × ${lastSet.reps}`
		});
	}

	// Progress bar
	const progressBar = content.createDiv({ cls: 'fit-exercise-card-progress-bar' });
	const progressFill = progressBar.createDiv({ cls: 'fit-exercise-card-progress-fill' });
	progressFill.style.width = `${(completedSets / targetSets) * 100}%`;

	// Click handler
	card.addEventListener('click', options.onClick);

	return card;
}

/**
 * Creates a set row for the exercise screen
 */
export interface SetRowOptions {
	setNumber: number;
	weight: number;
	reps: number;
	completed: boolean;
	unit: string;
	isActive?: boolean;
	onEdit?: () => void;
	onDelete?: () => void;
}

export function createSetRow(parent: HTMLElement, options: SetRowOptions): HTMLElement {
	const row = parent.createDiv({
		cls: `fit-set-row ${options.completed ? 'fit-set-row-complete' : ''} ${options.isActive ? 'fit-set-row-active' : ''}`
	});

	// Set number
	row.createSpan({ cls: 'fit-set-number', text: `Set ${options.setNumber}` });

	// Weight and reps
	const data = row.createSpan({ cls: 'fit-set-data' });
	data.createSpan({
		cls: 'fit-set-weight',
		text: `${options.weight} ${options.unit}`
	});
	data.createSpan({ cls: 'fit-set-separator', text: '×' });
	data.createSpan({ cls: 'fit-set-reps', text: String(options.reps) });

	// Status icon
	if (options.completed) {
		row.createSpan({ cls: 'fit-set-status', text: '✓' });
	}

	// Edit button (if handler provided)
	if (options.onEdit) {
		const editBtn = row.createEl('button', {
			cls: 'fit-set-action',
			text: '✎',
			attr: { 'aria-label': 'Edit set' }
		});
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			options.onEdit?.();
		});
	}

	return row;
}

/**
 * Creates a workout card for the workout picker
 */
export interface WorkoutCardOptions {
	name: string;
	description?: string;
	exerciseCount: number;
	onClick: () => void;
}

export function createWorkoutCard(parent: HTMLElement, options: WorkoutCardOptions): HTMLElement {
	const card = parent.createDiv({ cls: 'fit-workout-card' });

	card.createDiv({ cls: 'fit-workout-card-name', text: options.name });

	if (options.description) {
		card.createDiv({ cls: 'fit-workout-card-desc', text: options.description });
	}

	card.createDiv({
		cls: 'fit-workout-card-count',
		text: `${options.exerciseCount} exercises`
	});

	card.addEventListener('click', options.onClick);

	return card;
}

/**
 * Creates a session card for history view
 */
export interface SessionCardOptions {
	date: string;
	workoutName?: string;
	duration?: string;
	exercises: SessionExercise[];
	unit: string;
	onClick: () => void;
}

export function createSessionCard(parent: HTMLElement, options: SessionCardOptions): HTMLElement {
	const card = parent.createDiv({ cls: 'fit-session-card' });

	// Header: Workout name on left, date + duration on right
	const header = card.createDiv({ cls: 'fit-session-card-header' });
	header.createSpan({ cls: 'fit-session-card-workout', text: options.workoutName ?? 'Workout' });

	const headerRight = header.createDiv({ cls: 'fit-session-card-header-right' });
	headerRight.createSpan({ cls: 'fit-session-card-date', text: formatDate(options.date) });
	if (options.duration) {
		headerRight.createSpan({ cls: 'fit-session-card-duration', text: options.duration });
	}

	// Sets as chips (exercise name + chips inline)
	const setsContainer = card.createDiv({ cls: 'fit-session-card-sets' });

	for (const exercise of options.exercises) {
		const completedSets = exercise.sets.filter(s => s.completed);
		if (completedSets.length === 0) continue;

		const exerciseRow = setsContainer.createDiv({ cls: 'fit-session-card-exercise' });
		exerciseRow.createSpan({ cls: 'fit-session-card-exercise-name', text: exercise.exercise });

		for (const set of completedSets) {
			exerciseRow.createSpan({
				cls: 'fit-set-chip fit-set-chip-history',
				text: `${set.reps}×${formatWeight(set.weight)}${options.unit}`
			});
		}
	}

	card.addEventListener('click', options.onClick);

	return card;
}

/**
 * Formats weight for display (removes trailing zeros)
 */
function formatWeight(weight: number): string {
	return weight % 1 === 0 ? String(weight) : weight.toFixed(1).replace(/\.0$/, '');
}

/**
 * Formats a date string for display
 */
function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (dateStr === today.toISOString().split('T')[0]) {
		return 'Today';
	}
	if (dateStr === yesterday.toISOString().split('T')[0]) {
		return 'Yesterday';
	}

	return date.toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}
