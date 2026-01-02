import { describe, it, expect, beforeEach } from 'vitest';
import { HomeScreen } from './home-screen';
import type { Program, Workout } from '../../types';
import {
	createMockScreenContext,
	createSampleSession,
	flushPromises,
	click
} from '../../test/mocks';

describe('HomeScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('resume card', () => {
		it('should show resume card when active session exists', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day'
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			// Resume card has class fit-program-workout-current
			const resumeCard = container.querySelector('.fit-program-workout-current');
			expect(resumeCard).not.toBeNull();

			// Should show workout name
			const workoutName = resumeCard?.querySelector('.fit-program-workout-name');
			expect(workoutName?.textContent).toBe('Push Day');
		});

		it('should navigate to session when resume card is clicked', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day'
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const resumeCard = container.querySelector('.fit-program-workout-current') as HTMLElement;
			click(resumeCard);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		});
	});

	describe('program section', () => {
		it('should show message when no active program', async () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			// Should show message to select a program
			const message = container.querySelector('.fit-empty-message');
			expect(message).not.toBeNull();
			expect(message?.textContent).toContain('Select a training program');
		});

		it('should show program workouts when active program exists', async () => {
			// Create a program with inline workouts
			const program: Program = {
				id: 'full-body',
				name: 'Full Body Program',
				workouts: ['workout-a', 'workout-b']
			};

			const workout: Workout = {
				id: 'workout-a',
				name: 'Full Body A',
				exercises: [
					{ exercise: 'Squat', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 }
				]
			};

			const ctx = createMockScreenContext({
				programs: [program],
				settings: { activeProgram: 'full-body' }
			});

			// Mock getInlineWorkout to return the workout
			ctx.programRepo.getInlineWorkout = () => workout;

			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			// Should show program section
			const programSection = container.querySelector('.fit-program-section');
			expect(programSection).not.toBeNull();
		});

		it('should show "view all" link in program section', async () => {
			const program: Program = {
				id: 'full-body',
				name: 'Full Body Program',
				workouts: ['workout-a', 'workout-b']
			};

			const ctx = createMockScreenContext({
				programs: [program],
				settings: { activeProgram: 'full-body' }
			});

			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const viewAllLink = container.querySelector('.fit-section-footer-link');
			expect(viewAllLink).not.toBeNull();
			expect(viewAllLink?.textContent).toBe('View all workouts');
		});

		it('should navigate to workout-picker when view all is clicked', async () => {
			const program: Program = {
				id: 'full-body',
				name: 'Full Body Program',
				workouts: ['workout-a']
			};

			const ctx = createMockScreenContext({
				programs: [program],
				settings: { activeProgram: 'full-body' }
			});

			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const viewAllLink = container.querySelector('.fit-section-footer-link') as HTMLElement;
			click(viewAllLink);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('workout-picker');
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

		it('should show "view all" link in recent sessions section', async () => {
			const sessions = [createSampleSession({ id: 'session-1' })];
			const ctx = createMockScreenContext({ sessions });
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			const links = container.querySelectorAll('.fit-section-footer-link');
			// Look for the "view all history" link in Recent workouts section
			const viewAllLinks = Array.from(links).filter(link => link.textContent === 'View all history');
			expect(viewAllLinks.length).toBeGreaterThan(0);
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', async () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			expect(container.querySelector('.fit-home-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-home-screen')).toBeNull();
		});

		it('should subscribe to session events for re-render', async () => {
			const ctx = createMockScreenContext();
			const screen = new HomeScreen(container, ctx);
			screen.render();
			await flushPromises();

			// Home screen uses on() to subscribe to session lifecycle events
			expect(ctx.sessionState.on).toHaveBeenCalledWith('session.started', expect.any(Function));
			expect(ctx.sessionState.on).toHaveBeenCalledWith('session.finished', expect.any(Function));
			expect(ctx.sessionState.on).toHaveBeenCalledWith('session.discarded', expect.any(Function));
		});
	});
});
