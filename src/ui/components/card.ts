import { setIcon } from 'obsidian';
import type { SessionExercise } from '../../types';
import type { ExerciseFeedback } from '../../data/coach-feedback-types';
import { createSessionData } from './session-data';

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
	// Expandable details
	previousExercise?: SessionExercise; // Results from last session
	feedback?: ExerciseFeedback; // Exercise-specific coaching feedback
	weightUnit?: string; // For displaying weights (default: 'kg')
	autoExpand?: boolean; // Start expanded (for first incomplete exercise)
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

	// Auto-expand if requested
	const startExpanded = options.autoExpand ?? false;

	const card = parent.createDiv({
		cls: `fit-exercise-card ${isComplete ? 'fit-exercise-card-complete' : ''} ${startExpanded ? 'is-expanded' : ''}`,
		attr: options.draggable ? { draggable: 'true', 'data-index': String(index) } : {}
	});

	// Setup drag events if draggable
	if (options.draggable) {
		setupDragEvents(card, parent, index, options);
	}

	// Render card content (same structure for both completed and incomplete)
	renderCard(card, options, image1, completedSets, targetSets, isComplete, startExpanded);

	// Click handler (for navigating to exercise)
	card.addEventListener('click', (e) => {
		// Don't trigger click when clicking drag handle or expand button
		const target = e.target as HTMLElement;
		if (target.closest('.fit-drag-handle') || target.closest('.fit-exercise-card-expand-btn')) return;
		options.onClick();
	});

	return card;
}

/**
 * Setup drag and drop events for a card
 */
function setupDragEvents(
	card: HTMLElement,
	parent: HTMLElement,
	index: number,
	options: ExerciseCardOptions
): void {
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

/**
 * Render unified card layout for both completed and incomplete exercises
 */
function renderCard(
	card: HTMLElement,
	options: ExerciseCardOptions,
	image1: string | undefined,
	completedSets: number,
	targetSets: number,
	isComplete: boolean,
	startExpanded: boolean
): void {
	const { exercise, index } = options;

	// Top row: (drag handle OR done badge) + image + number + title + expand button
	const topRow = card.createDiv({ cls: 'fit-exercise-card-top' });

	// Show checkmark for completed exercises, drag handle for incomplete
	if (isComplete) {
		const badge = topRow.createSpan({ cls: 'fit-exercise-card-done-badge' });
		setIcon(badge, 'check');
	} else if (options.draggable) {
		const dragHandle = topRow.createDiv({ cls: 'fit-drag-handle' });
		setIcon(dragHandle, 'grip-vertical');
	}

	// Image
	if (image1) {
		topRow.createEl('img', {
			cls: 'fit-exercise-card-img',
			attr: { src: image1, alt: exercise.exercise }
		});
	}

	// Exercise number and name
	topRow.createSpan({ cls: 'fit-exercise-card-number', text: String(index + 1) });
	topRow.createSpan({ cls: 'fit-exercise-card-name', text: options.displayName ?? exercise.exercise });

	// Expand/collapse button
	const expandBtn = topRow.createEl('button', {
		cls: 'fit-exercise-card-expand-btn',
		attr: { 'aria-label': 'Show details' }
	});
	setIcon(expandBtn, startExpanded ? 'chevron-up' : 'chevron-down');

	// Progress bar (for incomplete exercises only)
	if (!isComplete) {
		const progressBar = card.createDiv({ cls: 'fit-exercise-card-progress-bar' });
		const progressFill = progressBar.createDiv({ cls: 'fit-exercise-card-progress-fill' });
		progressFill.style.width = `${(completedSets / targetSets) * 100}%`;
	}

	// Expandable details section
	const details = card.createDiv({ cls: 'fit-exercise-card-details' });
	renderExpandableDetails(details, options);

	// Toggle expand/collapse
	expandBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		const isExpanded = card.hasClass('is-expanded');
		card.toggleClass('is-expanded', !isExpanded);
		setIcon(expandBtn, isExpanded ? 'chevron-down' : 'chevron-up');
	});
}

/**
 * Render the expandable details content using the shared session data component
 */
function renderExpandableDetails(container: HTMLElement, options: ExerciseCardOptions): void {
	createSessionData(container, {
		currentExercise: options.exercise,
		previousExercise: options.previousExercise,
		feedback: options.feedback,
		weightUnit: options.weightUnit
		// No onSetClick - chips are not tappable in the overview
	});
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
