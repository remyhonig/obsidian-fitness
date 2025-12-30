import { setIcon } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import { createWorkoutCard, createSessionCard } from '../components/card';
import { toFilename } from '../../data/file-utils';
import type { Workout, Session } from '../../types';

/**
 * Home screen - entry point for the workout tracker
 */
export class HomeScreen implements Screen {
	private containerEl: HTMLElement;
	private eventUnsubscribers: (() => void)[] = [];
	private abortController: AbortController | null = null;
	private playIconEl: HTMLElement | null = null;
	private durationEl: HTMLElement | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-home-screen' });
	}

	render(): void {
		// Clear element references
		this.playIconEl = null;
		this.durationEl = null;

		// Abort previous async render operations
		this.abortController?.abort();
		this.abortController = new AbortController();

		this.containerEl.empty();

		// Main content
		const content = this.containerEl.createDiv({ cls: 'fit-content' });

		// Render sections in order (must await to maintain order)
		void this.renderSectionsInOrder(content, this.abortController.signal);

		// Subscribe to session lifecycle events to update resume card
		this.subscribeToEvents();
	}

	private subscribeToEvents(): void {
		// Unsubscribe from previous subscriptions
		this.unsubscribeFromEvents();

		const state = this.ctx.sessionState;

		// Session lifecycle events - re-render to show/hide resume card
		this.eventUnsubscribers.push(
			state.on('session.started', () => this.render())
		);
		this.eventUnsubscribers.push(
			state.on('session.finished', () => this.render())
		);
		this.eventUnsubscribers.push(
			state.on('session.discarded', () => this.render())
		);

		// Rest timer tick - show rest countdown when active
		this.eventUnsubscribers.push(
			state.on('timer.tick', ({ remaining }) => {
				if (this.durationEl && state.isRestTimerActive()) {
					const minutes = Math.floor(remaining / 60);
					const seconds = remaining % 60;
					this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					this.durationEl.addClass('fit-timer-rest');
				}
			})
		);

		// Rest timer cancelled - switch back to session duration
		this.eventUnsubscribers.push(
			state.on('timer.cancelled', () => {
				if (this.durationEl) {
					this.durationEl.removeClass('fit-timer-rest');
				}
			})
		);

		// Duration tick - update timer display and pulse animation (only when not resting)
		this.eventUnsubscribers.push(
			state.on('duration.tick', ({ elapsed }) => {
				if (this.durationEl && !state.isRestTimerActive()) {
					const minutes = Math.floor(elapsed / 60);
					const seconds = elapsed % 60;
					this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					this.durationEl.removeClass('fit-timer-rest');
				}
				if (this.playIconEl) {
					this.playIconEl.classList.toggle('fit-pulse-tick');
				}
			})
		);
	}

	private unsubscribeFromEvents(): void {
		for (const unsub of this.eventUnsubscribers) {
			unsub();
		}
		this.eventUnsubscribers = [];
	}

	private async renderSectionsInOrder(content: HTMLElement, signal: AbortSignal): Promise<void> {
		// Show program OR quick start (not both)
		await this.renderMainSection(content, signal);
		if (signal.aborted) return;

		// Recent sessions always at the bottom
		await this.renderRecentSessions(content, signal);
	}

	private async renderMainSection(parent: HTMLElement, signal: AbortSignal): Promise<void> {
		const settings = this.ctx.settings;
		const hasActiveProgram = settings.activeProgram != null;

		// Check for active session with completed sets to resume
		const hasActiveSession = this.ctx.sessionState.hasActiveSession();
		const activeSession = this.ctx.sessionState.getSession();
		const hasCompletedSets = activeSession?.exercises.some(ex =>
			ex.sets.some(s => s.completed)
		) ?? false;

		// Show resume card only if session has completed at least one set
		if (hasActiveSession && activeSession && hasCompletedSets) {
			this.renderResumeCard(parent, activeSession);
		}

		if (hasActiveProgram) {
			// Show program section with view all workouts link
			await this.renderActiveProgram(parent, hasCompletedSets, signal);
		} else {
			// Show quick start when no program is active
			await this.renderQuickStart(parent, signal);
		}
	}

	private renderResumeCard(parent: HTMLElement, session: Session): void {
		const section = parent.createDiv({ cls: 'fit-section' });
		const row = section.createDiv({ cls: 'fit-resume-row' });

		// Barbell emoji placeholder (maintains layout consistency with other screens)
		row.createDiv({ cls: 'fit-home-icon', text: '🏋️' });

		const resumeCard = row.createDiv({
			cls: 'fit-program-workout-card fit-program-workout-current'
		});

		// Play icon
		this.playIconEl = resumeCard.createDiv({ cls: 'fit-program-workout-play' });
		setIcon(this.playIconEl, 'play');

		// Workout name
		resumeCard.createDiv({
			cls: 'fit-program-workout-name',
			text: session.workout ?? 'Workout'
		});

		// Duration display (updated via duration.tick event)
		this.durationEl = resumeCard.createDiv({
			cls: 'fit-program-workout-time'
		});

		// Set initial display - rest time if resting, otherwise session duration
		if (this.ctx.sessionState.isRestTimerActive()) {
			const remaining = this.ctx.sessionState.getRestTimeRemaining();
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
			this.durationEl.addClass('fit-timer-rest');
		} else {
			const elapsed = this.ctx.sessionState.getElapsedDuration();
			const minutes = Math.floor(elapsed / 60);
			const seconds = elapsed % 60;
			this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}

		// Click navigates to first unfinished exercise, or session overview if all complete
		resumeCard.addEventListener('click', () => {
			const firstUnfinishedIndex = this.findFirstUnfinishedExerciseIndex(session);
			if (firstUnfinishedIndex >= 0) {
				this.ctx.view.navigateTo('exercise', { exerciseIndex: firstUnfinishedIndex });
			} else {
				this.ctx.view.navigateTo('session');
			}
		});

		// Fullscreen toggle button
		if (this.ctx.view.isInFullscreen()) {
			// Exit fullscreen button
			const exitBtn = row.createEl('button', {
				cls: 'fit-fullscreen-exit',
				attr: { 'aria-label': 'Exit fullscreen' }
			});
			exitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
			exitBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.ctx.view.exitFullscreen();
			});
		} else {
			// Enter fullscreen button
			const enterBtn = row.createEl('button', {
				cls: 'fit-fullscreen-enter',
				attr: { 'aria-label': 'Enter fullscreen' }
			});
			enterBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
			enterBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.ctx.view.enterFullscreen();
			});
		}
	}

	private async renderActiveProgram(parent: HTMLElement, hasResumeCard: boolean, signal: AbortSignal): Promise<void> {
		const settings = this.ctx.settings;
		if (!settings.activeProgram) return;

		// Get the active program
		const program = await this.ctx.programRepo.get(settings.activeProgram);
		if (signal.aborted) return;
		if (!program || program.workouts.length === 0) {
			// Program not found or empty, fall back to quick start
			await this.renderQuickStart(parent, signal);
			return;
		}

		// Get workouts data for display
		const allWorkouts = await this.ctx.workoutRepo.list();
		if (signal.aborted) return;
		const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

		const section = parent.createDiv({ cls: 'fit-section fit-program-section' });

		// Section header with program name
		const header = section.createDiv({ cls: 'fit-section-header' });
		header.createEl('h2', { text: program.name, cls: 'fit-section-title' });

		const grid = section.createDiv({ cls: 'fit-program-grid' });

		// Show next workouts (not accented if there's a resume card above)
		const currentIndex = settings.programWorkoutIndex % program.workouts.length;

		for (let i = 0; i < 4 && i < program.workouts.length; i++) {
			const workoutIndex = (currentIndex + i) % program.workouts.length;
			const workoutId = program.workouts[workoutIndex];
			if (!workoutId) continue;

			const workout = workoutMap.get(workoutId);
			// Only accent first card if no resume card
			const isAccented = i === 0 && !hasResumeCard;

			const card = grid.createDiv({
				cls: `fit-program-workout-card ${isAccented ? 'fit-program-workout-current' : ''}`
			});

			// Play icon indicator
			const playIcon = card.createDiv({
				cls: 'fit-program-workout-play'
			});
			setIcon(playIcon, 'play');

			// Workout info
			const info = card.createDiv({ cls: 'fit-program-workout-info' });
			info.createDiv({
				cls: 'fit-program-workout-name',
				text: workout?.name ?? workoutId
			});

			// Click to start
			if (workout) {
				card.addEventListener('click', () => {
					void this.startFromWorkout(workout);
				});
			}
		}

		// View all link at bottom
		const viewAllLink = section.createEl('a', { cls: 'fit-section-footer-link', text: 'View all workouts' });
		viewAllLink.addEventListener('click', () => this.ctx.view.navigateTo('workout-picker'));
	}

	private async renderQuickStart(parent: HTMLElement, signal: AbortSignal): Promise<void> {
		const workouts = await this.ctx.workoutRepo.list();
		if (signal.aborted || workouts.length === 0) return;

		const section = parent.createDiv({ cls: 'fit-section' });

		// Section header
		const header = section.createDiv({ cls: 'fit-section-header' });
		header.createEl('h2', { text: 'Quick start', cls: 'fit-section-title' });

		const grid = section.createDiv({ cls: 'fit-workout-grid' });

		// Show up to 3 recent workouts
		const recent = workouts.slice(0, 3);
		for (const workout of recent) {
			createWorkoutCard(grid, {
				name: workout.name,
				description: workout.description,
				exerciseCount: workout.exercises.length,
				onClick: () => { void this.startFromWorkout(workout); }
			});
		}

		// View all link at bottom (only if more workouts exist)
		if (workouts.length > 3) {
			const viewAllLink = section.createEl('a', { cls: 'fit-section-footer-link', text: 'View all workouts' });
			viewAllLink.addEventListener('click', () => this.ctx.view.navigateTo('workout-picker'));
		}
	}

	private async renderRecentSessions(parent: HTMLElement, signal: AbortSignal): Promise<void> {
		const sessions = await this.ctx.sessionRepo.getRecent(5);
		if (signal.aborted || sessions.length === 0) return;

		// Build workout lookup map to get actual names
		const workouts = await this.ctx.workoutRepo.list();
		if (signal.aborted) return;
		const workoutById = new Map(workouts.map(w => [w.id, w]));

		const section = parent.createDiv({ cls: 'fit-section' });

		// Section header
		const header = section.createDiv({ cls: 'fit-section-header' });
		header.createEl('h2', { text: 'Recent workouts', cls: 'fit-section-title' });

		const list = section.createDiv({ cls: 'fit-session-list' });

		for (const session of sessions) {
			// Look up actual workout name by converting session.workout to slug
			let workoutName = session.workout;
			if (session.workout) {
				const workoutSlug = toFilename(session.workout);
				const workout = workoutById.get(workoutSlug);
				if (workout) {
					workoutName = workout.name;
				}
			}

			createSessionCard(list, {
				date: session.date,
				workoutName,
				onClick: () => this.ctx.view.navigateTo('session-detail', { sessionId: session.id })
			});
		}

		// View all link at bottom
		const viewAllLink = section.createEl('a', { cls: 'fit-section-footer-link', text: 'View all history' });
		viewAllLink.addEventListener('click', () => this.ctx.view.navigateTo('history'));
	}

	/**
	 * Finds the index of the first exercise that hasn't completed all target sets
	 * Returns -1 if all exercises are complete
	 */
	private findFirstUnfinishedExerciseIndex(session: Session): number {
		for (let i = 0; i < session.exercises.length; i++) {
			const exercise = session.exercises[i];
			if (!exercise) continue;
			const completedSets = exercise.sets.filter(s => s.completed).length;
			if (completedSets < exercise.targetSets) {
				return i;
			}
		}
		return -1;
	}

	private async startFromWorkout(workout: Workout): Promise<void> {
		// Check if there's already an active session with completed sets
		if (this.ctx.sessionState.hasActiveSession()) {
			const session = this.ctx.sessionState.getSession();
			const hasCompletedSets = session?.exercises.some(ex =>
				ex.sets.some(s => s.completed)
			) ?? false;

			if (hasCompletedSets) {
				// Has real progress - navigate to it
				this.ctx.view.navigateTo('session');
				return;
			}

			// No completed sets - discard empty session (must await to avoid race condition)
			await this.ctx.sessionState.discardSession();
		}

		// Start new session from workout
		this.ctx.sessionState.startFromWorkout(workout);
		this.ctx.view.navigateTo('session');
	}

	destroy(): void {
		// Abort any in-flight async operations
		this.abortController?.abort();
		this.abortController = null;
		this.unsubscribeFromEvents();
		this.containerEl.remove();
	}
}
