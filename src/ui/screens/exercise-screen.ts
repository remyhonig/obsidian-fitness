import { setIcon, MarkdownRenderer, Component } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import type { ScreenParams, SessionExercise, Session, MuscleEngagement } from '../../types';
import { createBackButton, createPrimaryAction, createButton } from '../components/button';
import { formatWeight } from '../components/stepper';
import { createHorizontalRepsSelector } from '../components/reps-grid';
import { createMiniTimer } from '../components/timer';
import { createRpeSelector } from '../components/rpe-selector';
import { createMuscleEngagementSelector } from '../components/muscle-engagement-selector';
import { toFilename } from '../../data/file-utils';

interface ExerciseStatus {
	index: number;
	exercise: SessionExercise;
	completedSets: number;
	targetSets: number;
	isComplete: boolean;
}

/**
 * Exercise screen - fullscreen set logging for an exercise
 */
export class ExerciseScreen implements Screen {
	private containerEl: HTMLElement;
	private exerciseIndex: number;
	private currentWeight: number;
	private currentReps: number;
	private unsubscribe: (() => void) | null = null;
	private showingExercisePicker = false;
	private timerEl: HTMLElement | null = null;
	private durationIntervalId: number | null = null;
	private historyLoaded = false;
	private isCompletingSet = false;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext,
		params: ScreenParams
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-exercise-screen' });
		this.exerciseIndex = params.exerciseIndex ?? 0;

		// Initialize values from current session's last set or defaults
		const exercise = this.getExercise();
		const lastSet = this.ctx.sessionState.getLastSet(this.exerciseIndex);

		// Use current session's last set if available, otherwise use defaults
		// Default weight of 20 is reasonable for most exercises until history loads
		this.currentWeight = lastSet?.weight ?? 20;
		this.currentReps = lastSet?.reps ?? exercise?.targetRepsMin ?? 8;

		// If no current session set, load from history (will update weight/reps)
		if (!lastSet) {
			void this.loadFromHistory();
		}
	}

	/**
	 * Load weight/reps from the last session's matching exercise
	 */
	private async loadFromHistory(): Promise<void> {
		if (this.historyLoaded) return;
		this.historyLoaded = true;

		const exercise = this.getExercise();
		if (!exercise) return;

		try {
			const sessions = await this.ctx.sessionRepo.list();
			const exerciseName = exercise.exercise.toLowerCase();

			for (const session of sessions) {
				const sessionEx = session.exercises.find(
					e => e.exercise.toLowerCase() === exerciseName
				);
				if (sessionEx && sessionEx.sets.length > 0) {
					const completedSets = sessionEx.sets.filter(s => s.completed);
					if (completedSets.length > 0) {
						// Get the last completed set from previous session
						const lastHistorySet = completedSets[completedSets.length - 1];
						if (lastHistorySet) {
							this.currentWeight = lastHistorySet.weight;
							this.currentReps = lastHistorySet.reps;
							// Re-render to show updated values
							this.render();
						}
					}
					break; // Most recent first
				}
			}
		} catch (error) {
			console.error('Failed to load history:', error);
		}
	}

	render(): void {
		// Unsubscribe from previous subscription to avoid accumulating listeners
		this.unsubscribe?.();
		this.unsubscribe = null;

		// Clear duration interval
		if (this.durationIntervalId) {
			window.clearInterval(this.durationIntervalId);
			this.durationIntervalId = null;
		}

		this.containerEl.empty();

		const exercise = this.getExercise();
		if (!exercise) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'Exercise not found'
			});
			return;
		}

		// Header with exercise name
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.ctx.view.navigateTo('session'));
		header.createEl('h1', { text: exercise.exercise, cls: 'fit-title' });

		// Top section: Progress stats + Sets history (integrated)
		const topSection = this.containerEl.createDiv({ cls: 'fit-exercise-top' });

		// Progress card - sets, timer, target reps
		const completedSets = exercise.sets.filter(s => s.completed).length;
		const progressCard = topSection.createDiv({ cls: 'fit-progress-card-wide' });

		// Sets stat
		const setsSection = progressCard.createDiv({ cls: 'fit-stat-wide' });
		setsSection.createDiv({ cls: 'fit-stat-label-vertical', text: 'Sets' });
		setsSection.createDiv({ cls: 'fit-stat-value-large', text: `${completedSets} / ${exercise.targetSets}` });

		// Duration/Timer stat
		const timerSection = progressCard.createDiv({ cls: 'fit-stat-wide' });
		timerSection.createDiv({ cls: 'fit-stat-label-vertical', text: 'Duration' });
		this.timerEl = timerSection.createDiv({ cls: 'fit-stat-value-large' });
		this.updateTimer();

		// Target Reps stat
		const targetReps = exercise.targetRepsMin === exercise.targetRepsMax
			? `${exercise.targetRepsMin}`
			: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
		const targetSection = progressCard.createDiv({ cls: 'fit-stat-wide' });
		targetSection.createDiv({ cls: 'fit-stat-label-vertical', text: 'Target' });
		targetSection.createDiv({ cls: 'fit-stat-value-large', text: targetReps });

		// Integrated sets row (current session in accent, history in gray)
		const setsRow = topSection.createDiv({ cls: 'fit-sets-integrated' });
		this.renderIntegratedSets(exercise, setsRow);

		// Check if exercise is complete (for conditional rendering)
		const isExerciseComplete = completedSets >= exercise.targetSets;

		// Middle content area (scrollable)
		const middleContent = this.containerEl.createDiv({ cls: 'fit-middle-content' });

		if (isExerciseComplete) {
			// Show muscle engagement selector first
			createMuscleEngagementSelector(middleContent, {
				selectedValue: exercise.muscleEngagement,
				onSelect: (value: MuscleEngagement) => {
					void this.ctx.sessionState.setExerciseMuscleEngagement(this.exerciseIndex, value);
				}
			});

			// Show RPE selector below
			const lastSetIndex = exercise.sets.length - 1;
			const lastSet = exercise.sets[lastSetIndex];
			createRpeSelector(middleContent, {
				selectedValue: lastSet?.rpe,
				onSelect: (value) => {
					// Save RPE to the last set
					void this.ctx.sessionState.editSet(this.exerciseIndex, lastSetIndex, { rpe: value });
				}
			});
		} else {
			// Show exercise details when still logging sets
			this.renderExerciseDetails(exercise, middleContent);

			// Bottom input area (fixed above action button)
			const bottomInputs = this.containerEl.createDiv({ cls: 'fit-bottom-inputs' });

			// Weight card - full width (no title, just controls)
			const weightCard = bottomInputs.createDiv({ cls: 'fit-input-card-wide' });
			this.renderWeightInput(weightCard);

			// Reps card - full width (no title, just controls)
			const repsCard = bottomInputs.createDiv({ cls: 'fit-input-card-wide' });
			createHorizontalRepsSelector(repsCard, this.currentReps, (value) => {
				this.currentReps = value;
			});
		}

		// Action area
		const actionArea = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });
		const allStatuses = this.getAllExerciseStatuses();
		const allExercisesComplete = allStatuses.every(s => s.isComplete);

		if (isExerciseComplete) {
			// Show navigation button (next exercise or complete session)
			if (allExercisesComplete) {
				createPrimaryAction(actionArea, 'Complete session', () => {
					void this.finishWorkout();
				});
			} else {
				createPrimaryAction(actionArea, 'Next exercise', () => {
					this.ctx.view.navigateTo('session');
				});
			}

			// Skip RPE option
			createButton(actionArea, {
				text: 'Skip RPE',
				variant: 'ghost',
				onClick: () => this.ctx.view.navigateTo('session')
			});
		} else {
			// Normal complete set button
			createPrimaryAction(actionArea, 'Complete set', () => this.completeSet());
		}

		// Subscribe to state changes
		this.unsubscribe = this.ctx.sessionState.subscribe(() => {
			// Update timer display
			this.updateTimer();

			// Re-render when state changes (e.g., after completing a set)
			// But don't re-render if showing the exercise picker or timer is active
			if (!this.showingExercisePicker && !this.ctx.sessionState.isRestTimerActive()) {
				this.render();
			}
		});
	}

	private updateTimer(): void {
		if (!this.timerEl) return;

		if (this.ctx.sessionState.isRestTimerActive()) {
			// Clear duration interval when rest timer is active
			if (this.durationIntervalId) {
				window.clearInterval(this.durationIntervalId);
				this.durationIntervalId = null;
			}
			const remaining = this.ctx.sessionState.getRestTimeRemaining();
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
			this.timerEl.addClass('fit-timer-active');
		} else {
			this.timerEl.removeClass('fit-timer-active');
			// Show workout duration when no timer is active
			const session = this.ctx.sessionState.getSession();
			if (session?.startTime) {
				const start = new Date(session.startTime).getTime();

				const renderDuration = () => {
					if (!this.timerEl) return;
					const now = Date.now();
					const durationMs = now - start;
					const minutes = Math.floor(durationMs / 60000);
					const seconds = Math.floor((durationMs % 60000) / 1000);

					// Render with styled units (m and s smaller and grayer)
					this.timerEl.empty();
					this.timerEl.createSpan({ text: String(minutes) });
					this.timerEl.createSpan({ cls: 'fit-duration-unit', text: 'm' });
					this.timerEl.createSpan({ text: seconds.toString().padStart(2, '0') });
					this.timerEl.createSpan({ cls: 'fit-duration-unit', text: 's' });
				};

				renderDuration();

				// Start interval to update duration every second
				if (!this.durationIntervalId) {
					this.durationIntervalId = window.setInterval(renderDuration, 1000);
				}
			}
		}
	}

	private renderWeightInput(parent: HTMLElement): void {
		const settings = this.ctx.settings;
		const unit = settings.weightUnit;
		const smallInc = unit === 'kg' ? 0.5 : 1.25;
		const largeInc = unit === 'kg' ? 2.5 : 5;

		const container = parent.createDiv({ cls: 'fit-weight-input-container' });

		// Left buttons (decrease)
		const leftBtns = container.createDiv({ cls: 'fit-weight-btns' });
		this.createWeightBtn(leftBtns, -largeInc, container);
		this.createWeightBtn(leftBtns, -smallInc, container);

		// Center input with unit
		const inputWrapper = container.createDiv({ cls: 'fit-weight-input-wrapper' });
		const input = inputWrapper.createEl('input', {
			cls: 'fit-weight-input',
			type: 'number',
			value: String(this.currentWeight)
		});
		input.setAttribute('step', String(smallInc));
		input.setAttribute('min', '0');

		inputWrapper.createSpan({ cls: 'fit-weight-unit', text: unit });

		input.addEventListener('change', () => {
			const val = parseFloat(input.value);
			if (!isNaN(val) && val >= 0) {
				this.currentWeight = Math.round(val * 100) / 100;
				input.value = formatWeight(this.currentWeight);
			}
		});

		input.addEventListener('blur', () => {
			input.value = formatWeight(this.currentWeight);
		});

		// Right buttons (increase)
		const rightBtns = container.createDiv({ cls: 'fit-weight-btns' });
		this.createWeightBtn(rightBtns, smallInc, container);
		this.createWeightBtn(rightBtns, largeInc, container);
	}

	private createWeightBtn(parent: HTMLElement, step: number, container: HTMLElement): void {
		const isPositive = step > 0;
		const absStep = Math.abs(step);
		const text = `${isPositive ? '+' : '−'}${formatWeight(absStep)}`;

		const btn = parent.createEl('button', {
			cls: `fit-weight-btn ${isPositive ? 'fit-plus' : 'fit-minus'}`,
			text
		});

		let intervalId: number | null = null;
		let timeoutId: number | null = null;

		const updateValue = () => {
			const newValue = Math.max(0, this.currentWeight + step);
			this.currentWeight = Math.round(newValue * 100) / 100;

			const input = container.querySelector('.fit-weight-input') as HTMLInputElement;
			if (input) {
				input.value = formatWeight(this.currentWeight);
			}
		};

		const startRapid = () => {
			intervalId = window.setInterval(updateValue, 100);
		};

		const stopRapid = () => {
			if (timeoutId) { window.clearTimeout(timeoutId); timeoutId = null; }
			if (intervalId) { window.clearInterval(intervalId); intervalId = null; }
		};

		btn.addEventListener('click', (e) => { e.preventDefault(); updateValue(); });
		btn.addEventListener('touchstart', (e) => { e.preventDefault(); updateValue(); timeoutId = window.setTimeout(startRapid, 400); }, { passive: false });
		btn.addEventListener('touchend', stopRapid);
		btn.addEventListener('touchcancel', stopRapid);
		btn.addEventListener('mousedown', () => { timeoutId = window.setTimeout(startRapid, 400); });
		btn.addEventListener('mouseup', stopRapid);
		btn.addEventListener('mouseleave', stopRapid);
	}

	/**
	 * Render integrated sets row - interweaved: history1, current1, history2, current2...
	 */
	private renderIntegratedSets(exercise: SessionExercise, parent: HTMLElement): void {
		const unit = this.ctx.settings.weightUnit;
		const currentSets = exercise.sets;

		// Create placeholder containers for each set pair (history + current)
		// This allows us to interweave properly when history loads
		const setContainers: HTMLElement[] = [];
		const maxCurrentSets = currentSets.length;

		// Pre-create containers and render current sets synchronously
		for (let i = 0; i < maxCurrentSets; i++) {
			// Container for this pair
			const pairContainer = parent.createDiv({ cls: 'fit-set-pair' });
			setContainers.push(pairContainer);

			// Placeholder for history (will be filled async)
			pairContainer.createDiv({ cls: 'fit-set-history-placeholder', attr: { 'data-index': String(i) } });

			// Current set (rendered now)
			const currSet = currentSets[i];
			if (currSet) {
				const chip = pairContainer.createDiv({ cls: 'fit-set-chip fit-set-chip-current' });
				chip.createSpan({
					cls: 'fit-set-chip-text',
					text: `${currSet.reps}×${formatWeight(currSet.weight)}${unit}`
				});

				const deleteBtn = chip.createEl('button', { cls: 'fit-set-chip-delete' });
				try { setIcon(deleteBtn, 'x'); } catch { deleteBtn.textContent = 'x'; }
				const setIndex = i;
				deleteBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.deleteSet(setIndex);
				});
			}
		}

		// Load history async and insert into placeholders
		void this.ctx.sessionRepo.list().then(sessions => {
			const exerciseName = exercise.exercise.toLowerCase();
			let historySets: Array<{ weight: number; reps: number }> = [];

			// Find most recent completed session with this exercise
			for (const session of sessions) {
				const sessionEx = session.exercises.find(
					e => e.exercise.toLowerCase() === exerciseName
				);
				if (sessionEx && sessionEx.sets.length > 0) {
					historySets = sessionEx.sets.filter(s => s.completed).map(s => ({
						weight: s.weight,
						reps: s.reps
					}));
					break;
				}
			}

			// Fill in history chips at their placeholders
			for (let i = 0; i < historySets.length; i++) {
				const histSet = historySets[i];
				if (!histSet) continue;

				// Find or create container for this index
				let container: HTMLElement;
				if (i < setContainers.length) {
					container = setContainers[i]!;
				} else {
					// More history than current - create new container
					container = parent.createDiv({ cls: 'fit-set-pair' });
					setContainers.push(container);
				}

				// Find placeholder and replace with actual chip
				const placeholder = container.querySelector('.fit-set-history-placeholder');
				const chip = document.createElement('div');
				chip.className = 'fit-set-chip fit-set-chip-history';
				const textSpan = document.createElement('span');
				textSpan.className = 'fit-set-chip-text';
				textSpan.textContent = `${histSet.reps}×${formatWeight(histSet.weight)}${unit}`;
				chip.appendChild(textSpan);

				if (placeholder) {
					placeholder.replaceWith(chip);
				} else {
					// Insert at beginning of container
					container.insertBefore(chip, container.firstChild);
				}
			}

			// Remove any remaining empty placeholders
			parent.querySelectorAll('.fit-set-history-placeholder').forEach(p => p.remove());
		});
	}

	private renderCurrentSets(exercise: SessionExercise, parent: HTMLElement): void {
		if (exercise.sets.length === 0) return;

		const section = parent.createDiv({ cls: 'fit-sets-logged' });
		section.createDiv({ cls: 'fit-card-title', text: 'This Session' });

		// Horizontal scrollable row of compact set chips
		const row = section.createDiv({ cls: 'fit-sets-chips' });
		const unit = this.ctx.settings.weightUnit;

		for (let i = 0; i < exercise.sets.length; i++) {
			const set = exercise.sets[i];
			if (!set) continue;

			// Compact chip with notation: "8×40kg" (reps×weight)
			const chip = row.createDiv({ cls: 'fit-set-chip' });
			chip.createSpan({
				cls: 'fit-set-chip-text',
				text: `${set.reps}×${formatWeight(set.weight)}${unit}`
			});

			const deleteBtn = chip.createEl('button', { cls: 'fit-set-chip-delete' });
			try { setIcon(deleteBtn, 'x'); } catch { deleteBtn.textContent = 'x'; }
			deleteBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.deleteSet(i);
			});
		}
	}

	private renderHistorySets(exercise: SessionExercise, parent: HTMLElement): void {
		// Find previous sessions with this exercise (async)
		void this.ctx.sessionRepo.list().then(sessions => {
			// Find most recent completed session with this exercise
			const exerciseName = exercise.exercise.toLowerCase();
			let lastSession: { date: string; sets: Array<{ weight: number; reps: number }> } | null = null;

			for (const session of sessions) {
				const sessionEx = session.exercises.find(
					e => e.exercise.toLowerCase() === exerciseName
				);
				if (sessionEx && sessionEx.sets.length > 0) {
					lastSession = {
						date: session.startTime,
						sets: sessionEx.sets.filter(s => s.completed).map(s => ({
							weight: s.weight,
							reps: s.reps
						}))
					};
					break; // Most recent first
				}
			}

			if (!lastSession || lastSession.sets.length === 0) return;

			// Calculate relative time
			const sessionDate = new Date(lastSession.date);
			const now = new Date();
			const diffMs = now.getTime() - sessionDate.getTime();
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

			let relativeTime: string;
			if (diffDays === 0) {
				relativeTime = 'today';
			} else if (diffDays === 1) {
				relativeTime = 'yesterday';
			} else if (diffDays < 7) {
				relativeTime = `${diffDays}d ago`;
			} else if (diffDays < 30) {
				const weeks = Math.floor(diffDays / 7);
				relativeTime = weeks === 1 ? '1w ago' : `${weeks}w ago`;
			} else {
				const months = Math.floor(diffDays / 30);
				relativeTime = months === 1 ? '1mo ago' : `${months}mo ago`;
			}

			const section = parent.createDiv({ cls: 'fit-sets-history' });
			section.createDiv({ cls: 'fit-card-title', text: `Last: ${relativeTime}` });

			// Horizontal row of history chips (not deletable)
			const row = section.createDiv({ cls: 'fit-sets-chips' });
			const unit = this.ctx.settings.weightUnit;

			for (const set of lastSession.sets) {
				const chip = row.createDiv({ cls: 'fit-set-chip fit-set-chip-history' });
				chip.createSpan({
					cls: 'fit-set-chip-text',
					text: `${set.reps}×${formatWeight(set.weight)}${unit}`
				});
			}
		});
	}

	private renderExerciseDetails(sessionExercise: SessionExercise, parent: HTMLElement): void {
		// Look up full exercise details asynchronously
		void this.ctx.exerciseRepo.getByName(sessionExercise.exercise).then(exercise => {
			// Check if we have any details to show (only images and notes, skip properties)
			if (!exercise?.notes && !exercise?.image0) {
				return;
			}

			const section = parent.createDiv({ cls: 'fit-exercise-details' });
			const content = section.createDiv({ cls: 'fit-exercise-details-content' });

			// Exercise images at the top (side by side)
			if (exercise.image0 || exercise.image1) {
				const imagesRow = content.createDiv({ cls: 'fit-exercise-images' });
				if (exercise.image0) {
					imagesRow.createEl('img', {
						cls: 'fit-exercise-image',
						attr: { src: exercise.image0, alt: exercise.name }
					});
				}
				if (exercise.image1) {
					imagesRow.createEl('img', {
						cls: 'fit-exercise-image',
						attr: { src: exercise.image1, alt: exercise.name }
					});
				}
			}

			// Notes - render as markdown (skip muscles, equipment, category)
			if (exercise.notes) {
				const notesSection = content.createDiv({ cls: 'fit-exercise-notes' });
				const notesContent = notesSection.createDiv({ cls: 'fit-exercise-notes-content' });

				// Use a temporary component for markdown rendering lifecycle
				const tempComponent = new Component();
				tempComponent.load();

				void MarkdownRenderer.render(
					this.ctx.app,
					exercise.notes,
					notesContent,
					'',
					tempComponent
				);
			}
		});
	}

	private getExercise(): SessionExercise | null {
		return this.ctx.sessionState.getExercise(this.exerciseIndex);
	}

	private async completeSet(): Promise<void> {
		// Prevent multiple rapid clicks
		if (this.isCompletingSet) return;

		if (this.currentWeight <= 0 || this.currentReps <= 0) {
			return;
		}

		this.isCompletingSet = true;

		try {
			// Log the set and wait for persistence
			await this.ctx.sessionState.logSet(
				this.exerciseIndex,
				this.currentWeight,
				this.currentReps
			);

			// Explicitly re-render (subscription handler may be blocked by rest timer)
			this.render();
		} finally {
			this.isCompletingSet = false;
		}
	}

	private async editSet(setIndex: number): Promise<void> {
		const exercise = this.getExercise();
		if (!exercise) return;

		const set = exercise.sets[setIndex];
		if (!set) return;

		// Load set values into current inputs
		const setWeight = set.weight;
		const setReps = set.reps;
		this.currentWeight = setWeight;
		this.currentReps = setReps;

		// Delete the set so it can be re-logged
		await this.ctx.sessionState.deleteSet(this.exerciseIndex, setIndex);

		// Re-render
		this.render();
	}

	private async deleteSet(setIndex: number): Promise<void> {
		await this.ctx.sessionState.deleteSet(this.exerciseIndex, setIndex);
		this.render();
	}

	private getAllExerciseStatuses(): ExerciseStatus[] {
		const session = this.ctx.sessionState.getSession();
		if (!session) return [];

		return session.exercises.map((exercise, index) => {
			const completedSets = exercise.sets.filter(s => s.completed).length;
			return {
				index,
				exercise,
				completedSets,
				targetSets: exercise.targetSets,
				isComplete: completedSets >= exercise.targetSets
			};
		});
	}

	private showExercisePicker(): void {
		this.showingExercisePicker = true;

		// Create overlay
		const overlay = this.containerEl.createDiv({ cls: 'fit-exercise-picker-overlay' });

		const modal = overlay.createDiv({ cls: 'fit-exercise-picker-modal' });

		// Header
		const header = modal.createDiv({ cls: 'fit-picker-header' });
		header.createEl('h2', { text: 'Next exercise' });
		createButton(header, {
			text: '×',
			variant: 'ghost',
			size: 'small',
			onClick: () => this.closeExercisePicker(overlay)
		});

		// Exercise list
		const list = modal.createDiv({ cls: 'fit-exercise-picker-list' });

		const statuses = this.getAllExerciseStatuses();
		const pendingExercises = statuses.filter(s => !s.isComplete && s.index !== this.exerciseIndex);
		const completedExercises = statuses.filter(s => s.isComplete && s.index !== this.exerciseIndex);

		// Pending exercises section
		if (pendingExercises.length > 0) {
			list.createEl('h3', { text: 'To do', cls: 'fit-picker-section-title' });
			for (const status of pendingExercises) {
				this.renderExercisePickerItem(list, status, false, overlay);
			}
		}

		// Completed exercises section (for editing)
		if (completedExercises.length > 0) {
			list.createEl('h3', { text: 'Completed (tap to edit)', cls: 'fit-picker-section-title' });
			for (const status of completedExercises) {
				this.renderExercisePickerItem(list, status, true, overlay);
			}
		}

		// Complete session button if all done
		const allComplete = statuses.every(s => s.isComplete);
		if (allComplete) {
			const actions = modal.createDiv({ cls: 'fit-picker-actions' });
			createPrimaryAction(actions, 'Complete session', () => {
				this.closeExercisePicker(overlay);
				void this.finishWorkout();
			});
		}

		// Back to session button
		const backActions = modal.createDiv({ cls: 'fit-picker-back' });
		createButton(backActions, {
			text: 'Back to session overview',
			variant: 'secondary',
			onClick: () => {
				this.closeExercisePicker(overlay);
				this.ctx.view.navigateTo('session');
			}
		});
	}

	private renderExercisePickerItem(
		parent: HTMLElement,
		status: ExerciseStatus,
		isCompleted: boolean,
		overlay: HTMLElement
	): void {
		const item = parent.createDiv({
			cls: `fit-exercise-picker-item ${isCompleted ? 'fit-exercise-picker-item-completed' : ''}`
		});

		const info = item.createDiv({ cls: 'fit-picker-item-info' });
		info.createDiv({ cls: 'fit-picker-item-name', text: status.exercise.exercise });

		const progressText = `${status.completedSets}/${status.targetSets} sets`;
		const repsText = status.exercise.targetRepsMin === status.exercise.targetRepsMax
			? `${status.exercise.targetRepsMin} reps`
			: `${status.exercise.targetRepsMin}-${status.exercise.targetRepsMax} reps`;

		info.createDiv({
			cls: 'fit-picker-item-progress',
			text: `${progressText} • ${repsText}`
		});

		// Status indicator
		if (isCompleted) {
			item.createDiv({ cls: 'fit-picker-item-check', text: '✓' });
		}

		item.addEventListener('click', () => {
			this.closeExercisePicker(overlay);
			this.navigateToExercise(status.index);
		});
	}

	private closeExercisePicker(overlay: HTMLElement): void {
		this.showingExercisePicker = false;
		overlay.remove();
	}

	private navigateToExercise(index: number): void {
		this.exerciseIndex = index;
		this.ctx.sessionState.setCurrentExerciseIndex(index);

		// Reset weight/reps from the new exercise's last set
		const exercise = this.getExercise();
		const lastSet = this.ctx.sessionState.getLastSet(index);

		if (lastSet) {
			this.currentWeight = lastSet.weight;
			this.currentReps = lastSet.reps;
			this.render();
		} else {
			// No current session set, load from history
			this.currentWeight = 20; // Default until history loads
			this.currentReps = exercise?.targetRepsMin ?? 8;
			this.historyLoaded = false; // Allow loading for new exercise
			this.render();
			void this.loadFromHistory();
		}
	}

	private async finishWorkout(): Promise<void> {
		try {
			const session = await this.ctx.sessionState.finishSession();
			if (session) {
				// Advance program if this workout matches the current program workout
				await this.advanceProgramIfMatching(session);
				this.ctx.view.navigateTo('finish', { sessionId: session.id });
			} else {
				this.ctx.view.navigateTo('home');
			}
		} catch (error) {
			console.error('Failed to finish workout:', error);
			this.ctx.view.navigateTo('home');
		}
	}

	private async advanceProgramIfMatching(session: Session): Promise<void> {
		const settings = this.ctx.settings;
		if (!settings.activeProgram || !session.workout) return;

		try {
			const program = await this.ctx.programRepo.get(settings.activeProgram);
			if (!program || program.workouts.length === 0) return;

			// Get the current workout in the program
			const currentIndex = settings.programWorkoutIndex % program.workouts.length;
			const currentWorkoutId = program.workouts[currentIndex];

			// Check if the completed session's workout matches the current program workout
			// Compare by ID (slug) since that's what's stored in the program
			const sessionWorkoutId = toFilename(session.workout);
			if (currentWorkoutId === sessionWorkoutId) {
				// Advance to next workout in the program
				settings.programWorkoutIndex = (currentIndex + 1) % program.workouts.length;
				await this.ctx.saveSettings();
			}
		} catch (error) {
			console.error('Failed to advance program:', error);
		}
	}

	destroy(): void {
		this.unsubscribe?.();
		if (this.durationIntervalId) {
			window.clearInterval(this.durationIntervalId);
			this.durationIntervalId = null;
		}
		this.containerEl.remove();
	}
}
