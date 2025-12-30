import type { ScreenContext } from '../../views/fit-view';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton } from '../components/button';
import { createWorkoutCard } from '../components/card';
import type { Workout } from '../../types';

/**
 * Workout picker screen for starting a workout
 */
export class WorkoutPickerScreen extends BaseScreen {
	private workouts: Workout[] = [];
	private searchQuery = '';
	private resultsEl: HTMLElement | null = null;

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext
	) {
		super(parentEl, ctx, 'fit-workout-picker-screen');
	}

	render(): void {
		this.prepareRender();

		// Header with consistent screen-header component
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			fallbackWorkoutName: 'Start workout',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: () => this.ctx.view.goBack()
		});

		// Search bar
		const searchContainer = this.containerEl.createDiv({ cls: 'fit-search-container' });
		const searchInput = searchContainer.createEl('input', {
			cls: 'fit-search-input',
			attr: {
				type: 'text',
				placeholder: 'Search workouts...'
			}
		});

		searchInput.addEventListener('input', (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			this.renderResults();
		});

		// Load workouts
		void this.ctx.workoutRepo.list().then(workouts => {
			this.workouts = workouts;
			this.renderResults();
		});

		// Results container
		this.resultsEl = this.containerEl.createDiv({ cls: 'fit-workout-list' });

		// Empty workout option
		const emptyOption = this.containerEl.createDiv({ cls: 'fit-empty-workout-option' });
		createButton(emptyOption, {
			text: 'Start empty workout',
			variant: 'ghost',
			fullWidth: true,
			onClick: () => { void this.startEmptyWorkout(); }
		});

		// Create workout link
		const createLink = this.containerEl.createDiv({ cls: 'fit-create-workout-link' });
		createButton(createLink, {
			text: 'Create new workout',
			variant: 'ghost',
			onClick: () => this.ctx.view.navigateTo('workout-editor', { isNew: true })
		});
	}

	private renderResults(): void {
		if (!this.resultsEl) return;
		this.resultsEl.empty();

		// Filter workouts by search query
		let filtered = this.workouts;
		if (this.searchQuery) {
			const query = this.searchQuery.toLowerCase();
			filtered = this.workouts.filter(w =>
				w.name.toLowerCase().includes(query) ||
				w.description?.toLowerCase().includes(query)
			);
		}

		if (filtered.length === 0) {
			if (this.searchQuery) {
				this.resultsEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No workouts found'
				});
			} else {
				this.resultsEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No workouts yet. Create your first workout!'
				});
			}
			return;
		}

		for (const workout of filtered) {
			createWorkoutCard(this.resultsEl, {
				name: workout.name,
				description: workout.description,
				exerciseCount: workout.exercises.length,
				onClick: () => { void this.selectWorkout(workout); }
			});
		}
	}

	private async selectWorkout(workout: Workout): Promise<void> {
		// Check for active session with completed sets
		if (this.ctx.sessionState.hasActiveSession()) {
			const session = this.ctx.sessionState.getSession();
			const hasCompletedSets = session?.exercises.some(ex =>
				ex.sets.some(s => s.completed)
			) ?? false;

			if (hasCompletedSets) {
				// Has real progress - don't override
				this.ctx.view.navigateTo('session');
				return;
			}

			// No completed sets - discard empty session (must await to avoid race condition)
			await this.ctx.sessionState.discardSession();
		}

		// Start session from workout
		this.ctx.sessionState.startFromWorkout(workout);
		this.ctx.view.navigateTo('session');
	}

	private async startEmptyWorkout(): Promise<void> {
		// Check for active session with completed sets
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

		// Start empty session
		this.ctx.sessionState.startEmpty();
		this.ctx.view.navigateTo('session');
	}

	destroy(): void {
		super.destroy();
	}
}
