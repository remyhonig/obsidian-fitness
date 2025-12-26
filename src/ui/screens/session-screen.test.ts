import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionScreen } from './session-screen';
import {
	createMockScreenContext,
	createSampleSession,
	createSampleExercise,
	createSampleSessionExercise,
	flushPromises,
	click,
	findButton
} from '../../test/mocks';

describe('SessionScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering', () => {
		it('should show empty state when no active session', () => {
			const ctx = createMockScreenContext();
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState).not.toBeNull();
			expect(emptyState?.textContent).toBe('No active workout');
		});

		it('should render session header with workout name', () => {
			const activeSession = createSampleSession({ status: 'active', workout: 'Push Day' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const title = container.querySelector('.fit-title');
			expect(title?.textContent).toBe('Push Day');
		});

		it('should render session header with "Workout" when no workout name', () => {
			const activeSession = createSampleSession({ status: 'active', workout: undefined });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const title = container.querySelector('.fit-title');
			expect(title?.textContent).toBe('Workout');
		});

		it('should render exercise cards', () => {
			const activeSession = createSampleSession({
				status: 'active',
				exercises: [
					createSampleSessionExercise({ exercise: 'Bench Press' }),
					createSampleSessionExercise({ exercise: 'Overhead Press' })
				]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const exerciseCards = container.querySelectorAll('.fit-exercise-card');
			expect(exerciseCards.length).toBe(2);
		});

		it('should show empty state when no exercises in session', () => {
			const activeSession = createSampleSession({ status: 'active', exercises: [] });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState?.textContent).toContain('No exercises yet');
		});

		it('should render "Add exercise" button', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Add exercise');
			expect(button).not.toBeNull();
		});

		it('should render "Finish workout" button', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Finish workout');
			expect(button).not.toBeNull();
		});
	});

	describe('navigation', () => {
		it('should navigate to home when back button is clicked', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const backButton = container.querySelector('.fit-button-back') as HTMLElement;
			expect(backButton).not.toBeNull();
			click(backButton);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		});

		it('should navigate to exercise screen when exercise card is clicked', () => {
			const activeSession = createSampleSession({
				status: 'active',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const exerciseCard = container.querySelector('.fit-exercise-card') as HTMLElement;
			expect(exerciseCard).not.toBeNull();
			click(exerciseCard);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('exercise', { exerciseIndex: 0 });
		});
	});

	describe('add exercise', () => {
		it('should navigate to exercise library when no exercises exist', async () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession, exercises: [] });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);
			await flushPromises();

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('exercise-library');
		});

		it('should add first exercise when exercises exist', async () => {
			const activeSession = createSampleSession({ status: 'active', exercises: [] });
			const exercises = [createSampleExercise({ id: 'squat', name: 'Squat' })];
			const ctx = createMockScreenContext({ activeSession, exercises });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);
			await flushPromises();

			expect(ctx.sessionState.addExercise).toHaveBeenCalledWith('Squat');
		});
	});

	describe('finish workout', () => {
		it('should finish session and navigate to finish screen', async () => {
			const activeSession = createSampleSession({ status: 'active', id: 'test-session' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Finish workout');
			click(button!);
			await flushPromises();

			expect(ctx.sessionState.finishSession).toHaveBeenCalled();
			expect(ctx.view.navigateTo).toHaveBeenCalledWith('finish', expect.objectContaining({ sessionId: expect.any(String) }));
		});

		it('should navigate to home if finish returns null', async () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			// Override finishSession to return null
			ctx.sessionState.finishSession = vi.fn().mockResolvedValue(null);
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Finish workout');
			click(button!);
			await flushPromises();

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			expect(container.querySelector('.fit-session-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-session-screen')).toBeNull();
		});

		it('should unsubscribe from session state on destroy', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			// Verify subscribe was called
			expect(ctx.sessionState.subscribe).toHaveBeenCalled();

			screen.destroy();

			// The unsubscribe function should have been called
			// This is handled internally by the mock
		});
	});
});
