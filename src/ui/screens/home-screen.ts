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

		// Check for active session to resume
		const hasActiveSession = this.ctx.sessionState.hasActiveSession();
		const activeSession = this.ctx.sessionState.getSession();

		// Show resume card if there's an active session
		if (hasActiveSession && activeSession) {
			this.renderResumeCard(parent, activeSession);
		}

		if (hasActiveProgram) {
			// Show program section with view all workouts link
			await this.renderActiveProgram(parent, hasActiveSession);
		} else {
			// Show quick start when no program is active
			await this.renderQuickStart(parent);
		}
	}

	private renderResumeCard(parent: HTMLElement, session: Session): void {
		const section = parent.createDiv({ cls: 'fit-section' });
		const grid = section.createDiv({ cls: 'fit-program-grid' });

		const resumeCard = grid.createDiv({
			cls: 'fit-program-workout-card fit-program-workout-current'
		});

		// Play icon
		const playIcon = resumeCard.createDiv({ cls: 'fit-program-workout-play' });
		setIcon(playIcon, 'play');

		// Workout name
		resumeCard.createDiv({
			cls: 'fit-program-workout-name',
			text: session.workout ?? 'Workout'
		});

		// Start time on the right (hh:mm, 24h format)
		const startDate = new Date(session.startTime);
		const timeStr = startDate.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		resumeCard.createDiv({
			cls: 'fit-program-workout-time',
			text: timeStr
		});

		resumeCard.addEventListener('click', () => {
			this.ctx.view.navigateTo('session');
		});
	}

	private async renderActiveProgram(parent: HTMLElement, hasResumeCard: boolean): Promise<void> {
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

		// Section header with program name and view all link
		const header = section.createDiv({ cls: 'fit-section-header' });
		const titleArea = header.createDiv({ cls: 'fit-section-title-area' });
		titleArea.createEl('h2', { text: program.name, cls: 'fit-section-title' });
		if (program.description) {
			titleArea.createDiv({ cls: 'fit-program-description', text: program.description });
		}
		const viewAllLink = header.createEl('a', { cls: 'fit-section-link', text: 'view all' });
		viewAllLink.addEventListener('click', () => this.ctx.view.navigateTo('workout-picker'));

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

	}

	private async renderQuickStart(parent: HTMLElement): Promise<void> {
		const workouts = await this.ctx.workoutRepo.list();
		if (workouts.length === 0) return;

		const section = parent.createDiv({ cls: 'fit-section' });

		// Section header with view all link
		const header = section.createDiv({ cls: 'fit-section-header' });
		header.createEl('h2', { text: 'Quick start', cls: 'fit-section-title' });
		if (workouts.length > 3) {
			const viewAllLink = header.createEl('a', { cls: 'fit-section-link', text: 'view all' });
			viewAllLink.addEventListener('click', () => this.ctx.view.navigateTo('workout-picker'));
		}

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
	}

	private async renderRecentSessions(parent: HTMLElement): Promise<void> {
		const sessions = await this.ctx.sessionRepo.getRecent(5);
		if (sessions.length === 0) return;

		// Build workout lookup map to get actual names
		const workouts = await this.ctx.workoutRepo.list();
		const workoutById = new Map(workouts.map(w => [w.id, w]));

		const section = parent.createDiv({ cls: 'fit-section' });

		// Section header with view all link
		const header = section.createDiv({ cls: 'fit-section-header' });
		header.createEl('h2', { text: 'Recent workouts', cls: 'fit-section-title' });
		const viewAllLink = header.createEl('a', { cls: 'fit-section-link', text: 'view all' });
		viewAllLink.addEventListener('click', () => this.ctx.view.navigateTo('history'));

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
