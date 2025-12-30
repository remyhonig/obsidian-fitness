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

			const title = container.querySelector('.fit-program-workout-name');
			expect(title?.textContent).toBe('Push Day');
		});

		it('should render session header with "Workout" when no workout name', () => {
			const activeSession = createSampleSession({ status: 'active', workout: undefined });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const title = container.querySelector('.fit-program-workout-name');
			expect(title?.textContent).toBe('Workout');
		});

		it('should render exercise cards', async () => {
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
			await flushPromises();

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

		it('should render "Add exercise this session" button', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Add exercise this session');
			expect(button).not.toBeNull();
		});

		it('should render "Finish workout" button when session is in progress', () => {
			// Session with completed sets (in progress)
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Finish workout');
			expect(button).not.toBeNull();
		});

		it('should NOT render "Finish workout" button when session is NOT in progress', () => {
			// Session with no completed sets (not in progress)
			const activeSession = createSampleSession({
				status: 'active',
				exercises: [createSampleSessionExercise({ sets: [] })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Finish workout');
			expect(button).toBeNull();
		});

		it('should render "Edit workout" button when session is NOT in progress', () => {
			// Session with no completed sets (not in progress)
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ sets: [] })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Edit workout');
			expect(button).not.toBeNull();
		});

		it('should render "Edit exercises" button when session IS in progress', () => {
			// Session with completed sets (in progress)
			const activeSession = createSampleSession({ status: 'active', workout: 'Push Day' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			// Should show "Edit exercises" instead of "Edit workout"
			const editWorkoutButton = findButton(container, 'Edit workout');
			expect(editWorkoutButton).toBeNull();

			const editExercisesButton = findButton(container, 'Edit exercises');
			expect(editExercisesButton).not.toBeNull();
		});

		it('should navigate to workout-editor with editSession=true when "Edit exercises" is clicked', () => {
			// Session with completed sets (in progress)
			const activeSession = createSampleSession({ status: 'active', workout: 'Push Day' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Edit exercises');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('workout-editor', {
				workoutId: 'Push Day',
				isNew: false,
				editSession: true
			});
		});

		it('should navigate to workout-editor when "Edit workout" is clicked', () => {
			// Session with no completed sets (not in progress)
			const activeSession = createSampleSession({
				status: 'active',
				workout: 'Push Day',
				exercises: [createSampleSessionExercise({ sets: [] })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Edit workout');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('workout-editor', {
				workoutId: 'Push Day',
				isNew: false,
				editSession: false
			});
		});
	});

	describe('navigation', () => {
		it('should navigate to home when back button is clicked', () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const backButton = container.querySelector('.fit-back-button') as HTMLElement;
			expect(backButton).not.toBeNull();
			click(backButton);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		});

		it('should navigate to exercise screen when exercise card is clicked', async () => {
			const activeSession = createSampleSession({
				status: 'active',
				exercises: [createSampleSessionExercise({ exercise: 'Bench Press' })]
			});
			const ctx = createMockScreenContext({ activeSession });
			const screen = new SessionScreen(container, ctx);
			screen.render();
			await flushPromises();

			const exerciseCard = container.querySelector('.fit-exercise-card') as HTMLElement;
			expect(exerciseCard).not.toBeNull();
			click(exerciseCard);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('exercise', { exerciseIndex: 0 });
		});
	});

	describe('add exercise', () => {
		it('should show inline form when Add exercise button is clicked', async () => {
			const activeSession = createSampleSession({ status: 'active' });
			const ctx = createMockScreenContext({ activeSession, exercises: [] });
			const screen = new SessionScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Add exercise this session');
			click(button!);
			await flushPromises();

			// Should show inline form
			const form = container.querySelector('.fit-add-exercise-form');
			expect(form).not.toBeNull();
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
	});
});
