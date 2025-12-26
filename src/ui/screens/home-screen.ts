import { setIcon } from 'obsidian';
import type { Screen, ScreenContext } from '../../views/fit-view';
import { createButton } from '../components/button';
import { createWorkoutCard, createSessionCard } from '../components/card';
import { formatDuration } from '../components/timer';
import { toFilename } from '../../data/file-utils';
import type { Workout, Program } from '../../types';

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

		// Render sections in order (must await to maintain order)
		void this.renderSectionsInOrder(content);

		// Subscribe to state changes for rest timer updates
		this.unsubscribe = this.ctx.sessionState.subscribe(() => {
			// Could update mini timer here if needed
		});
	}

	private async renderSectionsInOrder(content: HTMLElement): Promise<void> {
		// Show program OR quick start (not both)
		await this.renderMainSection(content);

		// Recent sessions always at the bottom
		await this.renderRecentSessions(content);
	}

	private async renderMainSection(parent: HTMLElement): Promise<void> {
		const settings = this.ctx.plugin.settings;
		const hasActiveProgram = settings.activeProgram != null;

		if (hasActiveProgram) {
			// Show program section with view all workouts link
			await this.renderActiveProgram(parent);
		} else {
			// Show quick start when no program is active
			await this.renderQuickStart(parent);
		}
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

	private async renderActiveProgram(parent: HTMLElement): Promise<void> {
		const settings = this.ctx.plugin.settings;
		if (!settings.activeProgram) return;

		// Get the active program
		const program = await this.ctx.programRepo.get(settings.activeProgram);
		if (!program || program.workouts.length === 0) {
			// Program not found or empty, fall back to quick start
			await this.renderQuickStart(parent);
			return;
		}

		// Get workouts data for display
		const allWorkouts = await this.ctx.workoutRepo.list();
		const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

		const section = parent.createDiv({ cls: 'fit-section fit-program-section' });

		// Section header with program name
		const header = section.createDiv({ cls: 'fit-program-header' });
		header.createEl('h2', { text: program.name, cls: 'fit-section-title' });
		if (program.description) {
			header.createDiv({ cls: 'fit-program-description', text: program.description });
		}

		// Show next 4 workouts
		const grid = section.createDiv({ cls: 'fit-program-grid' });
		const currentIndex = settings.programWorkoutIndex % program.workouts.length;

		for (let i = 0; i < 4 && i < program.workouts.length; i++) {
			const workoutIndex = (currentIndex + i) % program.workouts.length;
			const workoutId = program.workouts[workoutIndex];
			if (!workoutId) continue;

			const workout = workoutMap.get(workoutId);
			const isCurrent = i === 0;

			const card = grid.createDiv({
				cls: `fit-program-workout-card ${isCurrent ? 'fit-program-workout-current' : ''}`
			});

			// Position indicator
			card.createDiv({
				cls: 'fit-program-workout-position',
				text: isCurrent ? 'Next' : `+${i}`
			});

			// Workout info
			const info = card.createDiv({ cls: 'fit-program-workout-info' });
			info.createDiv({
				cls: 'fit-program-workout-name',
				text: workout?.name ?? workoutId
			});
			if (workout) {
				info.createDiv({
					cls: 'fit-program-workout-meta',
					text: `${workout.exercises.length} exercises`
				});
			}

			// Click to start
			if (workout) {
				card.addEventListener('click', () => {
					void this.startFromWorkout(workout);
				});
			}
		}

		// "View all workouts" link for doing a different workout
		const viewAll = section.createDiv({ cls: 'fit-view-all' });
		createButton(viewAll, {
			text: 'View all workouts',
			variant: 'ghost',
			onClick: () => this.ctx.view.navigateTo('workout-picker')
		});
	}

	private async renderQuickStart(parent: HTMLElement): Promise<void> {
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

		// Build workout lookup map to get actual names
		const workouts = await this.ctx.workoutRepo.list();
		const workoutById = new Map(workouts.map(w => [w.id, w]));

		const section = parent.createDiv({ cls: 'fit-section' });
		section.createEl('h2', { text: 'Recent workouts', cls: 'fit-section-title' });

		const list = section.createDiv({ cls: 'fit-session-list' });

		for (const session of sessions) {
			const duration = session.endTime
				? formatDuration(session.startTime, session.endTime)
				: undefined;

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
