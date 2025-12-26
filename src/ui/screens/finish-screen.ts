import type { Screen, ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Session } from '../../types';
import { createPrimaryAction } from '../components/button';
import { formatDuration } from '../components/timer';

/**
 * Finish screen - workout summary after completing a session
 */
export class FinishScreen implements Screen {
	private containerEl: HTMLElement;
	private sessionId: string;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext,
		params: ScreenParams
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-finish-screen' });
		this.sessionId = params.sessionId ?? '';
	}

	render(): void {
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-finish-header' });
		header.createDiv({ cls: 'fit-finish-icon', text: '🎉' });
		header.createEl('h1', { text: 'Workout complete!', cls: 'fit-finish-title' });

		// Load session data and render
		void this.ctx.sessionRepo.get(this.sessionId).then(session => {
			if (session) {
				this.renderStats(session);
				this.renderExerciseSummary(session);
			}
		});

		// Actions
		const actions = this.containerEl.createDiv({ cls: 'fit-bottom-actions' });
		createPrimaryAction(actions, 'Done', () => {
			this.ctx.view.navigateTo('home');
		});
	}

	private renderStats(session: Session): void {
		const stats = this.containerEl.createDiv({ cls: 'fit-finish-stats' });

		// Duration
		if (session.endTime) {
			const duration = formatDuration(session.startTime, session.endTime);
			this.renderStat(stats, 'Duration', duration);
		}

		// Total sets
		const totalSets = this.ctx.sessionRepo.countCompletedSets(session);
		this.renderStat(stats, 'Sets', String(totalSets));

		// Total volume
		const volume = this.ctx.sessionRepo.calculateVolume(session);
		const unit = this.ctx.plugin.settings.weightUnit;
		this.renderStat(stats, 'Volume', `${volume.toLocaleString()} ${unit}`);

		// Exercises
		this.renderStat(stats, 'Exercises', String(session.exercises.length));
	}

	private renderStat(parent: HTMLElement, label: string, value: string): void {
		const stat = parent.createDiv({ cls: 'fit-finish-stat' });
		stat.createDiv({ cls: 'fit-finish-stat-value', text: value });
		stat.createDiv({ cls: 'fit-finish-stat-label', text: label });
	}

	private renderExerciseSummary(session: Session): void {
		const section = this.containerEl.createDiv({ cls: 'fit-finish-exercises' });
		section.createEl('h2', { text: 'Exercise summary', cls: 'fit-section-title' });

		const list = section.createDiv({ cls: 'fit-finish-exercise-list' });
		const unit = this.ctx.plugin.settings.weightUnit;

		for (const exercise of session.exercises) {
			const completedSets = exercise.sets.filter(s => s.completed);
			if (completedSets.length === 0) continue;

			const row = list.createDiv({ cls: 'fit-finish-exercise-row' });
			row.createDiv({ cls: 'fit-finish-exercise-name', text: exercise.exercise });

			const stats = row.createDiv({ cls: 'fit-finish-exercise-stats' });
			stats.createSpan({ text: `${completedSets.length} sets` });

			// Best set (highest weight)
			const bestSet = completedSets.reduce((best, set) =>
				set.weight > best.weight ? set : best
			);
			stats.createSpan({
				cls: 'fit-finish-exercise-best',
				text: `Best: ${bestSet.weight} ${unit} × ${bestSet.reps}`
			});
		}
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
