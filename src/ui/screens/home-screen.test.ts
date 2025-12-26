import { describe, it, expect, beforeEach } from 'vitest';
import { HomeScreen } from './home-screen';
import {
	createMockScreenContext,
	createSampleWorkout,
	createSampleSession,
	flushPromises,
	click,
	findButton
} from '../../test/mocks';

describe('HomeScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering', () => {
		it('should render the workout header', () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const header = container.querySelector('.fit-title');
			expect(header).not.toBeNull();
			expect(header?.textContent).toBe('Workout');
		});

		it('should show "Start workout" button when no active session', () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Start workout');
			expect(button).not.toBeNull();
		});

		it('should show "Continue workout" button when active session exists', () => {
			const activeSession = createSampleSession({ status: 'active', id: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Continue workout');
			expect(button).not.toBeNull();
		});

		it('should show active session card when session is in progress', () => {
			const activeSession = createSampleSession({
				status: 'active',
				id: 'active',
				workout: 'Push Day'
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const badge = container.querySelector('.fit-active-session-badge');
			expect(badge).not.toBeNull();
			expect(badge?.textContent).toBe('In progress');

			const workoutName = container.querySelector('.fit-active-session-workout');
			expect(workoutName?.textContent).toBe('Push Day');
		});
	});

	describe('navigation', () => {
		it('should navigate to workout-picker when "Start workout" is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Start workout');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('workout-picker');
		});

		it('should navigate to session when "Continue workout" is clicked', () => {
			const activeSession = createSampleSession({ status: 'active', id: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Continue workout');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		});

		it('should navigate to session when active session card is clicked', () => {
			const activeSession = createSampleSession({ status: 'active', id: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const card = container.querySelector('.fit-active-session-card') as HTMLElement;
			expect(card).not.toBeNull();
			click(card);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		});

		it('should navigate to history when "View history" is clicked', async () => {
			const ctx = createMockScreenContext({
				sessions: [createSampleSession()]
			});
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const button = findButton(container, 'View history');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('history');
		});

		it('should navigate to exercise-library when "Exercises" quick link is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Exercises');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('exercise-library');
		});

		it('should navigate to history when "History" quick link is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();

			const buttons = container.querySelectorAll('button');
			const historyButton = Array.from(buttons).find(b => b.textContent === 'History');
			expect(historyButton).not.toBeUndefined();
			click(historyButton!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('history');
		});
	});

	describe('workout quick start', () => {
		it('should render recent workouts', async () => {
			const workouts = [
				createSampleWorkout({ id: 'push', name: 'Push Day' }),
				createSampleWorkout({ id: 'pull', name: 'Pull Day' }),
				createSampleWorkout({ id: 'legs', name: 'Leg Day' })
			];
			const ctx = createMockScreenContext({ workouts });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const workoutCards = container.querySelectorAll('.fit-workout-card');
			expect(workoutCards.length).toBe(3);
		});

		it('should start session from workout when workout card is clicked', async () => {
			const workout = createSampleWorkout({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ workouts: [workout] });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const workoutCard = container.querySelector('.fit-workout-card') as HTMLElement;
			expect(workoutCard).not.toBeNull();
			click(workoutCard);

			expect(ctx.sessionState.startFromWorkout).toHaveBeenCalledWith(workout);
			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		});

		it('should show "View all workouts" link when more than 3 workouts exist', async () => {
			const workouts = [
				createSampleWorkout({ id: 'push', name: 'Push Day' }),
				createSampleWorkout({ id: 'pull', name: 'Pull Day' }),
				createSampleWorkout({ id: 'legs', name: 'Leg Day' }),
				createSampleWorkout({ id: 'upper', name: 'Upper Body' })
			];
			const ctx = createMockScreenContext({ workouts });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const viewAllButton = findButton(container, 'View all workouts');
			expect(viewAllButton).not.toBeNull();
		});
	});

	describe('recent sessions', () => {
		it('should render recent sessions', async () => {
			const sessions = [
				createSampleSession({ id: 'session-1', date: '2025-01-01' }),
				createSampleSession({ id: 'session-2', date: '2025-01-02' })
			];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sessionCards = container.querySelectorAll('.fit-session-card');
			expect(sessionCards.length).toBe(2);
		});

		it('should navigate to session detail when session card is clicked', async () => {
			const session = createSampleSession({ id: 'session-1' });
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const sessionCard = container.querySelector('.fit-session-card') as HTMLElement;
			expect(sessionCard).not.toBeNull();
			click(sessionCard);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session-detail', { sessionId: 'session-1' });
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();

			expect(container.querySelector('.fit-home-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-home-screen')).toBeNull();
		});
	});
});
