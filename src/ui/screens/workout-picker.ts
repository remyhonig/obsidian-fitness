import type { ScreenContext } from '../../views/fit-view';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { createButton } from '../components/button';
import { createWorkoutCard } from '../components/card';
import type { Workout } from '../../types';

/**
 * Workout picker screen for starting a workout from the active program
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

		// Check for active program
		const activeProgram = this.ctx.settings.activeProgram;
		if (!activeProgram) {
			// No active program - show message
			const message = this.containerEl.createDiv({ cls: 'fit-empty-message' });
			message.createEl('p', { text: 'Select a training program in settings to see available workouts.' });
			return;
		}

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

		// Load workouts from active program
		void this.loadWorkoutsFromProgram(activeProgram);

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
	}

	private async loadWorkoutsFromProgram(programId: string): Promise<void> {
		// Get program to get workout IDs
		const program = await this.ctx.programRepo.get(programId);
		if (!program) return;

		// Get inline workouts
		this.workouts = program.workouts
			.map(id => this.ctx.programRepo.getInlineWorkout(programId, id))
			.filter((w): w is Workout => w !== null);

		this.renderResults();
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
					text: 'No workouts defined in this program.'
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
			if (this.ctx.sessionState.isInProgress()) {
				// Has real progress - don't override
				this.ctx.view.navigateTo('session');
				return;
			}

			// No completed sets - discard empty session (must await to avoid race condition)
			await this.ctx.viewModel.discardWorkout();
		}

		// Start session from workout
		this.ctx.viewModel.startWorkout(workout);
		this.ctx.view.navigateTo('session');
	}

	private async startEmptyWorkout(): Promise<void> {
		// Check for active session with completed sets
		if (this.ctx.sessionState.hasActiveSession()) {
			if (this.ctx.sessionState.isInProgress()) {
				// Has real progress - navigate to it
				this.ctx.view.navigateTo('session');
				return;
			}

			// No completed sets - discard empty session (must await to avoid race condition)
			await this.ctx.viewModel.discardWorkout();
		}

		// Start empty session
		this.ctx.viewModel.startEmptyWorkout();
		this.ctx.view.navigateTo('session');
	}

	destroy(): void {
		super.destroy();
	}
}
