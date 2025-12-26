import { describe, it, expect, beforeEach } from 'vitest';
import { FinishScreen } from './finish-screen';
import {
	createMockScreenContext,
	createSampleSession,
	createSampleSessionExercise,
	flushPromises,
	click,
	findButton
} from '../../test/mocks';

describe('FinishScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering', () => {
		it('should render celebration header', () => {
			const ctx = createMockScreenContext();
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();

			const icon = container.querySelector('.fit-finish-icon');
			expect(icon?.textContent).toBe('🎉');

			const title = container.querySelector('.fit-finish-title');
			expect(title?.textContent).toBe('Workout complete!');
		});

		it('should render "Done" button', () => {
			const ctx = createMockScreenContext();
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();

			const button = findButton(container, 'Done');
			expect(button).not.toBeNull();
		});

		it('should render session stats', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				startTime: '2025-01-01T10:00:00Z',
				endTime: '2025-01-01T11:00:00Z',
				exercises: [
					createSampleSessionExercise({
						exercise: 'Bench Press',
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' },
							{ weight: 80, reps: 7, completed: true, timestamp: '2025-01-01T10:10:00Z' }
						]
					})
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const stats = container.querySelector('.fit-finish-stats');
			expect(stats).not.toBeNull();
		});

		it('should render duration stat', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				startTime: '2025-01-01T10:00:00Z',
				endTime: '2025-01-01T11:00:00Z'
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const statLabels = container.querySelectorAll('.fit-finish-stat-label');
			const labels = Array.from(statLabels).map(el => el.textContent);
			expect(labels).toContain('Duration');
		});

		it('should render sets count stat', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				exercises: [
					createSampleSessionExercise({
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '' },
							{ weight: 80, reps: 7, completed: true, timestamp: '' }
						]
					})
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const statLabels = container.querySelectorAll('.fit-finish-stat-label');
			const labels = Array.from(statLabels).map(el => el.textContent);
			expect(labels).toContain('Sets');
		});

		it('should render volume stat', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				exercises: [
					createSampleSessionExercise({
						sets: [{ weight: 80, reps: 10, completed: true, timestamp: '' }]
					})
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const statLabels = container.querySelectorAll('.fit-finish-stat-label');
			const labels = Array.from(statLabels).map(el => el.textContent);
			expect(labels).toContain('Volume');
		});

		it('should render exercises count stat', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				exercises: [
					createSampleSessionExercise({ exercise: 'Bench Press' }),
					createSampleSessionExercise({ exercise: 'Overhead Press' })
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const statLabels = container.querySelectorAll('.fit-finish-stat-label');
			const labels = Array.from(statLabels).map(el => el.textContent);
			expect(labels).toContain('Exercises');
		});

		it('should render exercise summary section', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				exercises: [
					createSampleSessionExercise({
						exercise: 'Bench Press',
						sets: [{ weight: 80, reps: 8, completed: true, timestamp: '' }]
					})
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const section = container.querySelector('.fit-finish-exercises');
			expect(section).not.toBeNull();

			const sectionTitle = section?.querySelector('.fit-section-title');
			expect(sectionTitle?.textContent).toBe('Exercise summary');
		});

		it('should render exercise rows with best set', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				exercises: [
					createSampleSessionExercise({
						exercise: 'Bench Press',
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '' },
							{ weight: 85, reps: 6, completed: true, timestamp: '' }
						]
					})
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const exerciseRow = container.querySelector('.fit-finish-exercise-row');
			expect(exerciseRow).not.toBeNull();

			const exerciseName = exerciseRow?.querySelector('.fit-finish-exercise-name');
			expect(exerciseName?.textContent).toBe('Bench Press');

			const bestSet = exerciseRow?.querySelector('.fit-finish-exercise-best');
			expect(bestSet?.textContent).toContain('85');
		});

		it('should not render exercises with no completed sets', async () => {
			const session = createSampleSession({
				id: 'test-session',
				status: 'completed',
				exercises: [
					createSampleSessionExercise({
						exercise: 'Bench Press',
						sets: []
					})
				]
			});
			const ctx = createMockScreenContext({ sessions: [session] });
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();
			await flushPromises();

			const exerciseRows = container.querySelectorAll('.fit-finish-exercise-row');
			expect(exerciseRows.length).toBe(0);
		});
	});

	describe('navigation', () => {
		it('should navigate to home when "Done" is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();

			const button = findButton(container, 'Done');
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', () => {
			const ctx = createMockScreenContext();
			const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
			screen.render();

			expect(container.querySelector('.fit-finish-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-finish-screen')).toBeNull();
		});
	});
});
