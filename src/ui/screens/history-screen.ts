import type { Screen, ScreenContext } from '../../views/fit-view';
import { createBackButton } from '../components/button';
import { createSessionCard } from '../components/card';
import type { Session } from '../../types';

/**
 * History screen - shows past workout sessions
 */
export class HistoryScreen implements Screen {
	private containerEl: HTMLElement;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-history-screen' });
	}

	render(): void {
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.ctx.view.goBack());
		header.createEl('h1', { text: 'History', cls: 'fit-title' });

		// Load sessions and render
		void this.ctx.sessionRepo.list().then(sessions => {
			if (sessions.length === 0) {
				this.containerEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No workout history yet. Complete your first workout!'
				});
				return;
			}

			// Group by week/month
			const grouped = this.groupByWeek(sessions);

			for (const [weekLabel, weekSessions] of grouped) {
				const section = this.containerEl.createDiv({ cls: 'fit-history-section' });
				section.createEl('h2', { text: weekLabel, cls: 'fit-section-title' });

				const list = section.createDiv({ cls: 'fit-session-list' });

				for (const session of weekSessions) {
					createSessionCard(list, {
						date: session.date,
						workoutName: session.workout,
						onClick: () => this.viewSession(session)
					});
				}
			}
		});
	}

	private groupByWeek(sessions: Session[]): Map<string, Session[]> {
		const groups = new Map<string, Session[]>();
		const today = new Date();
		const startOfWeek = this.getStartOfWeek(today);
		const startOfLastWeek = new Date(startOfWeek);
		startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

		for (const session of sessions) {
			const sessionDate = new Date(session.date);
			let label: string;

			if (sessionDate >= startOfWeek) {
				label = 'This week';
			} else if (sessionDate >= startOfLastWeek) {
				label = 'Last week';
			} else {
				// Group by month
				label = sessionDate.toLocaleDateString(undefined, {
					month: 'long',
					year: 'numeric'
				});
			}

			if (!groups.has(label)) {
				groups.set(label, []);
			}
			groups.get(label)!.push(session);
		}

		return groups;
	}

	private getStartOfWeek(date: Date): Date {
		const d = new Date(date);
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
		d.setDate(diff);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	private viewSession(session: Session): void {
		// Navigate to session detail view
		this.ctx.view.navigateTo('session-detail', { sessionId: session.id });
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
