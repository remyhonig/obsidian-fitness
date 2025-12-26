import { setIcon } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import { createButton } from '../components/button';
import { createWorkoutCard, createSessionCard } from '../components/card';
import { formatDuration } from '../components/timer';
import type { Workout } from '../../types';

/**
 * Home screen - entry point for the workout tracker
 */
export class HomeScreen implements Screen {
	private containerEl: HTMLElement;
	private unsubscribe: (() => void) | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-home-screen' });
	}

	render(): void {
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		header.createEl('h1', { text: 'Workout', cls: 'fit-title' });

		// Main content
		const content = this.containerEl.createDiv({ cls: 'fit-content' });

		// Check for active session with at least one completed set
		if (this.ctx.sessionState.hasActiveSession()) {
			const session = this.ctx.sessionState.getSession();
			const hasCompletedSets = session?.exercises.some(ex =>
				ex.sets.some(s => s.completed)
			) ?? false;

			if (hasCompletedSets) {
				this.renderActiveSessionCard(content);
			}
		}

		// Quick start workouts
		void this.renderRecentWorkouts(content);

		// Recent sessions
		void this.renderRecentSessions(content);

		// Subscribe to state changes for rest timer updates
		this.unsubscribe = this.ctx.sessionState.subscribe(() => {
			// Could update mini timer here if needed
		});
	}

	private renderActiveSessionCard(parent: HTMLElement): void {
		const session = this.ctx.sessionState.getSession();
		if (!session) return;

		const card = parent.createDiv({ cls: 'fit-active-session-card' });

		// Header with badge and delete button
		const header = card.createDiv({ cls: 'fit-active-session-header' });
		header.createDiv({ cls: 'fit-active-session-badge', text: 'In progress' });

		const deleteBtn = header.createEl('button', {
			cls: 'fit-active-session-delete',
			attr: { 'aria-label': 'Discard workout' }
		});
		setIcon(deleteBtn, 'trash-2');
		deleteBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			void this.discardSession();
		});

		const info = card.createDiv({ cls: 'fit-active-session-info' });
		if (session.workout) {
			info.createDiv({ cls: 'fit-active-session-workout', text: session.workout });
		}

		const completedSets = session.exercises.reduce(
			(sum, ex) => sum + ex.sets.filter(s => s.completed).length,
			0
		);
		const totalSets = session.exercises.reduce((sum, ex) => sum + ex.targetSets, 0);

		info.createDiv({
			cls: 'fit-active-session-progress',
			text: `${completedSets}/${totalSets} sets completed`
		});

		card.addEventListener('click', () => {
			this.ctx.view.navigateTo('session');
		});
	}

	private async discardSession(): Promise<void> {
		await this.ctx.sessionState.discardSession();
		this.render();
	}

	private async renderRecentWorkouts(parent: HTMLElement): Promise<void> {
		const workouts = await this.ctx.workoutRepo.list();
		if (workouts.length === 0) return;

		const section = parent.createDiv({ cls: 'fit-section' });
		section.createEl('h2', { text: 'Quick start', cls: 'fit-section-title' });

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

		// "View all" link if more workouts exist
		if (workouts.length > 3) {
			const viewAll = section.createDiv({ cls: 'fit-view-all' });
			createButton(viewAll, {
				text: 'View all workouts',
				variant: 'ghost',
				onClick: () => this.ctx.view.navigateTo('workout-picker')
			});
		}
	}

	private async renderRecentSessions(parent: HTMLElement): Promise<void> {
		const sessions = await this.ctx.sessionRepo.getRecent(3);
		if (sessions.length === 0) return;

		const section = parent.createDiv({ cls: 'fit-section' });
		section.createEl('h2', { text: 'Recent workouts', cls: 'fit-section-title' });

		const list = section.createDiv({ cls: 'fit-session-list' });

		for (const session of sessions) {
			const duration = session.endTime
				? formatDuration(session.startTime, session.endTime)
				: undefined;

			createSessionCard(list, {
				date: session.date,
				workoutName: session.workout,
				duration,
				exercises: session.exercises,
				unit: this.ctx.plugin.settings.weightUnit,
				onClick: () => this.ctx.view.navigateTo('session-detail', { sessionId: session.id })
			});
		}

		// "View all" link
		const viewAll = section.createDiv({ cls: 'fit-view-all' });
		createButton(viewAll, {
			text: 'View history',
			variant: 'ghost',
			onClick: () => this.ctx.view.navigateTo('history')
		});
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
		this.unsubscribe?.();
		this.containerEl.remove();
	}
}
