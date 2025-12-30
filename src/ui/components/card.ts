import { setIcon } from 'obsidian';
import type { SessionExercise } from '../../types';

export interface ExerciseCardOptions {
	exercise: SessionExercise;
	index: number;
	displayName?: string; // Override exercise name display (for showing proper name from database)
	image0?: string;
	image1?: string;
	onClick: () => void;
	onDelete?: () => void;
	draggable?: boolean;
	onDragStart?: (index: number) => void;
	onDragEnd?: () => void;
	onDrop?: (fromIndex: number, toIndex: number) => void;
}

// Store dragged index globally for cross-card communication
let draggedCardIndex: number | null = null;

/**
 * Creates an exercise card for the session overview
 */
export function createExerciseCard(parent: HTMLElement, options: ExerciseCardOptions): HTMLElement {
	const { exercise, index, image1 } = options;
	const completedSets = exercise.sets.filter(s => s.completed).length;
	const targetSets = exercise.targetSets;
	const isComplete = completedSets >= targetSets;

	const card = parent.createDiv({
		cls: `fit-exercise-card ${isComplete ? 'fit-exercise-card-complete' : ''}`,
		attr: options.draggable ? { draggable: 'true', 'data-index': String(index) } : {}
	});

	// Top row: drag handle + number + title
	const topRow = card.createDiv({ cls: 'fit-exercise-card-top' });

	// Drag handle (if draggable)
	if (options.draggable) {
		const dragHandle = topRow.createDiv({ cls: 'fit-drag-handle' });
		setIcon(dragHandle, 'grip-vertical');

		// Drag events
		card.addEventListener('dragstart', (e) => {
			draggedCardIndex = index;
			card.addClass('fit-dragging');
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
			}
			options.onDragStart?.(index);
		});

		card.addEventListener('dragend', () => {
			draggedCardIndex = null;
			card.removeClass('fit-dragging');
			parent.querySelectorAll('.fit-drag-over').forEach(el => el.removeClass('fit-drag-over'));
			options.onDragEnd?.();
		});

		card.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (draggedCardIndex === null || draggedCardIndex === index) return;
			card.addClass('fit-drag-over');
		});

		card.addEventListener('dragleave', () => {
			card.removeClass('fit-drag-over');
		});

		card.addEventListener('drop', (e) => {
			e.preventDefault();
			card.removeClass('fit-drag-over');
			if (draggedCardIndex === null || draggedCardIndex === index) return;
			options.onDrop?.(draggedCardIndex, index);
		});
	}

	topRow.createSpan({ cls: 'fit-exercise-card-number', text: String(index + 1) });
	topRow.createSpan({ cls: 'fit-exercise-card-name', text: options.displayName ?? exercise.exercise });

	// Middle row: image + content
	const middleRow = card.createDiv({ cls: 'fit-exercise-card-middle' });

	// Image (left side) - show only image1 (end position)
	if (image1) {
		middleRow.createEl('img', {
			cls: 'fit-exercise-card-img',
			attr: { src: image1, alt: exercise.exercise }
		});
	}

	// Content container (right side)
	const content = middleRow.createDiv({ cls: 'fit-exercise-card-content' });

	// Stats row: sets + reps + rest
	const statsRow = content.createDiv({ cls: 'fit-exercise-card-stats' });
	statsRow.createSpan({
		cls: 'fit-exercise-card-sets',
		text: `${completedSets}/${targetSets} sets`
	});
	statsRow.createSpan({ cls: 'fit-exercise-card-separator', text: '•' });
	statsRow.createSpan({
		cls: 'fit-exercise-card-target',
		text: `${exercise.targetRepsMin}-${exercise.targetRepsMax} reps`
	});
	statsRow.createSpan({ cls: 'fit-exercise-card-separator', text: '•' });
	statsRow.createSpan({
		cls: 'fit-exercise-card-rest',
		text: `${exercise.restSeconds}s`
	});

	// Last set info (if any)
	const lastSet = exercise.sets[exercise.sets.length - 1];
	if (lastSet) {
		content.createSpan({
			cls: 'fit-exercise-card-last',
			text: `Last: ${lastSet.weight}×${lastSet.reps}`
		});
	}

	// Progress bar
	const progressBar = content.createDiv({ cls: 'fit-exercise-card-progress-bar' });
	const progressFill = progressBar.createDiv({ cls: 'fit-exercise-card-progress-fill' });
	progressFill.style.width = `${(completedSets / targetSets) * 100}%`;

	// Click handler (for navigating to exercise)
	card.addEventListener('click', (e) => {
		// Don't trigger click when clicking drag handle
		const target = e.target as HTMLElement;
		if (target.closest('.fit-drag-handle')) return;
		options.onClick();
	});

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
	onClick: () => void;
}

export function createSessionCard(parent: HTMLElement, options: SessionCardOptions): HTMLElement {
	const card = parent.createDiv({ cls: 'fit-session-card' });

	// Icon on the left
	const iconEl = card.createDiv({ cls: 'fit-session-card-icon' });
	setIcon(iconEl, 'clipboard-list');

	// Workout name in the middle
	card.createDiv({ cls: 'fit-session-card-workout', text: options.workoutName ?? 'Workout' });

	// Date on the right
	card.createDiv({ cls: 'fit-session-card-date', text: formatDate(options.date) });

	card.addEventListener('click', options.onClick);

	return card;
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
