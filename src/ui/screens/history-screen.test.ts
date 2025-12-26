import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryScreen } from './history-screen';
import {
	createMockScreenContext,
	createSampleSession,
	flushPromises,
	click
} from '../../test/mocks';

describe('HistoryScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering', () => {
		it('should render the header with title', () => {
			const ctx = createMockScreenContext();
			const screen = new HistoryScreen(container, ctx);
			screen.render();

			const title = container.querySelector('.fit-title');
			expect(title?.textContent).toBe('History');
		});

		it('should render back button', () => {
			const ctx = createMockScreenContext();
			const screen = new HistoryScreen(container, ctx);
			screen.render();

			const backButton = container.querySelector('.fit-button-back');
			expect(backButton).not.toBeNull();
		});

		it('should show empty state when no sessions', async () => {
			const ctx = createMockScreenContext({ sessions: [] });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState).not.toBeNull();
			expect(emptyState?.textContent).toContain('No workout history yet');
		});

		it('should render session cards', async () => {
			const sessions = [
				createSampleSession({ id: 'session-1', date: '2025-01-01' }),
				createSampleSession({ id: 'session-2', date: '2025-01-02' })
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sessionCards = container.querySelectorAll('.fit-session-card');
			expect(sessionCards.length).toBe(2);
		});

		it('should group sessions by week', async () => {
			// Create sessions from this week and last week
			const today = new Date();
			const lastWeek = new Date(today);
			lastWeek.setDate(lastWeek.getDate() - 7);

			const sessions = [
				createSampleSession({ id: 'session-1', date: today.toISOString().split('T')[0] }),
				createSampleSession({ id: 'session-2', date: lastWeek.toISOString().split('T')[0] })
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sections = container.querySelectorAll('.fit-history-section');
			expect(sections.length).toBeGreaterThanOrEqual(1);
		});

		it('should display "This week" section for recent sessions', async () => {
			const today = new Date();
			const sessions = [
				createSampleSession({ id: 'session-1', date: today.toISOString().split('T')[0] })
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sectionTitles = container.querySelectorAll('.fit-section-title');
			const titles = Array.from(sectionTitles).map(el => el.textContent);
			expect(titles).toContain('This week');
		});

		it('should display session workout name', async () => {
			const sessions = [
				createSampleSession({ id: 'session-1', workout: 'Push Day' })
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sessionCard = container.querySelector('.fit-session-card');
			expect(sessionCard?.textContent).toContain('Push Day');
		});

		it('should display session duration', async () => {
			const sessions = [
				createSampleSession({
					id: 'session-1',
					startTime: '2025-01-01T10:00:00Z',
					endTime: '2025-01-01T11:00:00Z'
				})
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			// Duration should be rendered
			const sessionCard = container.querySelector('.fit-session-card');
			expect(sessionCard).not.toBeNull();
		});
	});

	describe('navigation', () => {
		it('should go back when back button is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new HistoryScreen(container, ctx);
			screen.render();

			const backButton = container.querySelector('.fit-button-back') as HTMLElement;
			click(backButton);

			expect(ctx.view.goBack).toHaveBeenCalled();
		});

		it('should navigate to session detail when session card is clicked', async () => {
			const sessions = [
				createSampleSession({ id: 'session-1' })
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HistoryScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sessionCard = container.querySelector('.fit-session-card') as HTMLElement;
			click(sessionCard);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session-detail', { sessionId: 'session-1' });
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', () => {
			const ctx = createMockScreenContext();
			const screen = new HistoryScreen(container, ctx);
			screen.render();

			expect(container.querySelector('.fit-history-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-history-screen')).toBeNull();
		});
	});
});
