import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExerciseFormState } from './exercise-form-state';
import type { Session } from '../../types';
import type { SessionRepository } from '../../data/session-repository';

function createMockSessionRepo(sessions: Session[]): SessionRepository {
	return {
		list: vi.fn().mockResolvedValue(sessions),
		get: vi.fn(),
		getActive: vi.fn(),
		saveActive: vi.fn(),
		finalizeActive: vi.fn(),
		deleteActive: vi.fn(),
		delete: vi.fn(),
		getRecent: vi.fn(),
		getByDateRange: vi.fn(),
		getByWorkout: vi.fn(),
		getPreviousSession: vi.fn(),
		ensureFolder: vi.fn(),
		setBasePath: vi.fn(),
		addReview: vi.fn(),
		setCoachFeedback: vi.fn()
	} as unknown as SessionRepository;
}

describe('ExerciseFormState', () => {
	describe('loadFromHistory', () => {
		it('should prefill weight from the correct exercise by name, not the first exercise', async () => {
			// This test verifies the bug: weight should come from the same exercise name,
			// not from the first exercise in the session

			// Previous session has two exercises:
			// - Bench Press at 80kg
			// - Squat at 100kg
			const previousSession: Session = {
				id: 'prev-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				endTime: '2025-01-01T11:00:00Z',
				workout: 'Full Body',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' },
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:10:00Z' },
							{ weight: 80, reps: 7, completed: true, timestamp: '2025-01-01T10:15:00Z' }
						]
					},
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 100, reps: 6, completed: true, timestamp: '2025-01-01T10:25:00Z' },
							{ weight: 100, reps: 6, completed: true, timestamp: '2025-01-01T10:30:00Z' },
							{ weight: 100, reps: 5, completed: true, timestamp: '2025-01-01T10:35:00Z' }
						]
					}
				]
			};

			const sessionRepo = createMockSessionRepo([previousSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			// When loading history for "Squat", the weight should be 100kg (from Squat)
			// NOT 80kg (from Bench Press which is the first exercise)
			const result = await formState.loadFromHistory('Squat', sessionRepo, controller.signal, 1);

			expect(result).toBe(true);
			expect(formState.weight).toBe(100); // Should be 100 from Squat, not 80 from Bench Press
			expect(formState.reps).toBe(6);
		});

		it('should prefill weight from the last set of the matching exercise', async () => {
			// The last set of Squat has weight 100 and reps 5
			const previousSession: Session = {
				id: 'prev-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				endTime: '2025-01-01T11:00:00Z',
				workout: 'Full Body',
				status: 'completed',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 90, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' },
							{ weight: 95, reps: 7, completed: true, timestamp: '2025-01-01T10:10:00Z' },
							{ weight: 100, reps: 5, completed: true, timestamp: '2025-01-01T10:15:00Z' }
						]
					}
				]
			};

			const sessionRepo = createMockSessionRepo([previousSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			// When loading set 4 (doesn't exist in history), should fall back to last set (100kg)
			const result = await formState.loadFromHistory('Squat', sessionRepo, controller.signal, 4);

			expect(result).toBe(true);
			expect(formState.weight).toBe(100); // Last set weight
			expect(formState.reps).toBe(5); // Last set reps
		});

		it('should prefill from matching set number when available', async () => {
			const previousSession: Session = {
				id: 'prev-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				endTime: '2025-01-01T11:00:00Z',
				workout: 'Full Body',
				status: 'completed',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 90, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' },
							{ weight: 95, reps: 7, completed: true, timestamp: '2025-01-01T10:10:00Z' },
							{ weight: 100, reps: 5, completed: true, timestamp: '2025-01-01T10:15:00Z' }
						]
					}
				]
			};

			const sessionRepo = createMockSessionRepo([previousSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			// When loading set 2, should get set 2 from history (95kg, 7 reps)
			const result = await formState.loadFromHistory('Squat', sessionRepo, controller.signal, 2);

			expect(result).toBe(true);
			expect(formState.weight).toBe(95); // Set 2 weight
			expect(formState.reps).toBe(7); // Set 2 reps
		});

		it('should be case insensitive when matching exercise names', async () => {
			const previousSession: Session = {
				id: 'prev-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				workout: 'Full Body',
				status: 'completed',
				exercises: [
					{
						exercise: 'BENCH PRESS',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' }
						]
					}
				]
			};

			const sessionRepo = createMockSessionRepo([previousSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			// Search with lowercase should still match
			const result = await formState.loadFromHistory('bench press', sessionRepo, controller.signal, 1);

			expect(result).toBe(true);
			expect(formState.weight).toBe(80);
		});

		it('should return false when no matching exercise found', async () => {
			const previousSession: Session = {
				id: 'prev-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				workout: 'Push Day',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' }
						]
					}
				]
			};

			const sessionRepo = createMockSessionRepo([previousSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			// Squat doesn't exist in the previous session
			const result = await formState.loadFromHistory('Squat', sessionRepo, controller.signal, 1);

			expect(result).toBe(false);
			expect(formState.weight).toBe(20); // Default weight
		});

		it('should only use the most recent session with the matching exercise', async () => {
			// Older session has Squat at 80kg
			const olderSession: Session = {
				id: 'older-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				workout: 'Full Body',
				status: 'completed',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' }
						]
					}
				]
			};

			// Newer session has Squat at 100kg
			const newerSession: Session = {
				id: 'newer-session',
				date: '2025-01-02',
				startTime: '2025-01-02T10:00:00Z',
				workout: 'Full Body',
				status: 'completed',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 100, reps: 6, completed: true, timestamp: '2025-01-02T10:05:00Z' }
						]
					}
				]
			};

			// Sessions are returned newest first
			const sessionRepo = createMockSessionRepo([newerSession, olderSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			const result = await formState.loadFromHistory('Squat', sessionRepo, controller.signal, 1);

			expect(result).toBe(true);
			expect(formState.weight).toBe(100); // Should use newer session's weight
		});

		it('should skip sessions without the matching exercise and find it in older sessions', async () => {
			// Newer session doesn't have Squat
			const newerSession: Session = {
				id: 'newer-session',
				date: '2025-01-02',
				startTime: '2025-01-02T10:00:00Z',
				workout: 'Push Day',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-02T10:05:00Z' }
						]
					}
				]
			};

			// Older session has Squat at 100kg
			const olderSession: Session = {
				id: 'older-session',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				workout: 'Leg Day',
				status: 'completed',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 100, reps: 6, completed: true, timestamp: '2025-01-01T10:05:00Z' }
						]
					}
				]
			};

			// Sessions are returned newest first
			const sessionRepo = createMockSessionRepo([newerSession, olderSession]);
			const formState = new ExerciseFormState();
			const controller = new AbortController();

			const result = await formState.loadFromHistory('Squat', sessionRepo, controller.signal, 1);

			expect(result).toBe(true);
			expect(formState.weight).toBe(100); // Should find Squat in the older session
		});
	});
});
