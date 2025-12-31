import { setIcon } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import { BaseScreen } from './base-screen';
import { createWorkoutCard, createSessionCard } from '../components/card';
import { createScreenHeader } from '../components/screen-header';
import { toFilename } from '../../data/file-utils';
import type { Workout, Session } from '../../types';

/**
 * Home screen - entry point for the workout tracker
 */
export class HomeScreen extends BaseScreen {
	constructor(parentEl: HTMLElement, ctx: ScreenContext) {
		super(parentEl, ctx, 'fit-home-screen');
	}

	render(): void {
		this.prepareRender();
		const signal = this.resetAbortController();

		// Main content
		const content = this.containerEl.createDiv({ cls: 'fit-content' });

		// Render sections in order (must await to maintain order)
		void this.renderSectionsInOrder(content, signal);

		// Subscribe to session lifecycle events to update resume card
		// Note: Timer events are handled by the header component
		const state = this.ctx.sessionState;
		this.subscribe(state.on('session.started', () => this.render()));
		this.subscribe(state.on('session.finished', () => this.render()));
		this.subscribe(state.on('session.discarded', () => this.render()));
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
		const activeSession = this.ctx.sessionState.getSession();
		const isInProgress = this.ctx.sessionState.isInProgress();

		// Show resume card only if session is in progress (at least one set completed)
		if (activeSession && isInProgress) {
			this.renderResumeCard(parent, activeSession);
		}

		if (hasActiveProgram) {
			// Show program section with view all workouts link
			await this.renderActiveProgram(parent, isInProgress, signal);
		} else {
			// Show quick start when no program is active
			await this.renderQuickStart(parent, signal);
		}
	}

	private renderResumeCard(parent: HTMLElement, session: Session): void {
		this.headerRefs = createScreenHeader(parent, {
			leftElement: 'barbell',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			showSetTimer: this.ctx.sessionState.isSetTimerActive(),
			onCardClick: () => {
				const firstUnfinishedIndex = this.findFirstUnfinishedExerciseIndex(session);
				if (firstUnfinishedIndex >= 0) {
					this.ctx.view.navigateTo('exercise', { exerciseIndex: firstUnfinishedIndex });
				} else {
					this.ctx.view.navigateTo('session');
				}
			}
		});
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

		const currentIndex = settings.programWorkoutIndex % program.workouts.length;
		const nextWorkoutId = program.workouts[currentIndex];
		const nextWorkout = nextWorkoutId ? workoutMap.get(nextWorkoutId) : undefined;

		// Show next workout header if no resume card
		if (!hasResumeCard && nextWorkout) {
			this.renderNextWorkoutHeader(parent, nextWorkout);
		}

		const section = parent.createDiv({ cls: 'fit-section fit-program-section' });

		// Section header with program name
		const header = section.createDiv({ cls: 'fit-section-header' });
		header.createEl('h2', { text: program.name, cls: 'fit-section-title' });

		const grid = section.createDiv({ cls: 'fit-program-grid' });

		// Show next workouts (not accented since header shows the next one)
		for (let i = 0; i < 4 && i < program.workouts.length; i++) {
			const workoutIndex = (currentIndex + i) % program.workouts.length;
			const workoutId = program.workouts[workoutIndex];
			if (!workoutId) continue;

			const workout = workoutMap.get(workoutId);

			const card = grid.createDiv({
				cls: 'fit-program-workout-card'
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

	private renderNextWorkoutHeader(parent: HTMLElement, workout: Workout): void {
		this.headerRefs = createScreenHeader(parent, {
			leftElement: 'barbell',
			fallbackWorkoutName: workout.name,
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onCardClick: () => {
				void this.startFromWorkout(workout);
			}
		});
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
			if (this.ctx.sessionState.isInProgress()) {
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

}
