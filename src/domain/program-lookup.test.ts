import { describe, it, expect, vi } from 'vitest';
import { findProgramForSession } from './program-lookup';
import type { Session, Program } from '../types';
import type { ProgramRepository } from '../data/program-repository';

function createMockProgramRepo(programs: Program[]): ProgramRepository {
	return {
		list: vi.fn().mockResolvedValue(programs),
		get: vi.fn().mockImplementation((id: string) =>
			Promise.resolve(programs.find(p => p.id === id) ?? null)
		),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		ensureFolder: vi.fn(),
		setBasePath: vi.fn(),
		getByName: vi.fn(),
		getInlineWorkout: vi.fn(),
		hasInlineWorkouts: vi.fn()
	} as unknown as ProgramRepository;
}

describe('findProgramForSession', () => {
	describe('when session has programId', () => {
		it('should use programId directly instead of searching by workout name', async () => {
			// BUG: Previously the code ignored session.programId and searched all programs
			// by workout name, which could return wrong program if names collide

			const programA: Program = {
				id: 'program-a',
				name: 'Program A',
				workouts: ['hypertrophy-a']  // Same workout name as Program B
			};

			const programB: Program = {
				id: 'program-b',
				name: 'Program B',
				workouts: ['hypertrophy-a']  // Same workout name as Program A
			};

			const repo = createMockProgramRepo([programA, programB]);

			// Session explicitly references program-b via wikilink
			const session: Session = {
				id: 'session-1',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				status: 'completed',
				workout: 'Hypertrophy A',
				programId: 'program-b',  // This should be used!
				exercises: []
			};

			const result = await findProgramForSession(session, repo);

			// Should use programId directly, not search by workout name
			expect(repo.get).toHaveBeenCalledWith('program-b');
			expect(repo.list).not.toHaveBeenCalled();  // Should NOT search all programs
			expect(result).toBe(programB);
		});

		it('should return null if programId does not exist', async () => {
			const repo = createMockProgramRepo([]);

			const session: Session = {
				id: 'session-1',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				status: 'completed',
				workout: 'Some Workout',
				programId: 'non-existent-program',
				exercises: []
			};

			const result = await findProgramForSession(session, repo);

			expect(repo.get).toHaveBeenCalledWith('non-existent-program');
			expect(result).toBeNull();
		});
	});

	describe('when session has no programId (legacy)', () => {
		it('should fall back to searching by workout name', async () => {
			const program: Program = {
				id: 'full-body',
				name: 'Full Body Program',
				workouts: ['push-day', 'pull-day']
			};

			const repo = createMockProgramRepo([program]);

			// Legacy session without programId
			const session: Session = {
				id: 'session-1',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				status: 'completed',
				workout: 'Push Day',  // Will be converted to 'push-day' slug
				exercises: []
			};

			const result = await findProgramForSession(session, repo);

			expect(repo.list).toHaveBeenCalled();
			expect(result).toBe(program);
		});

		it('should return null if no matching workout found', async () => {
			const program: Program = {
				id: 'full-body',
				name: 'Full Body Program',
				workouts: ['push-day']
			};

			const repo = createMockProgramRepo([program]);

			const session: Session = {
				id: 'session-1',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				status: 'completed',
				workout: 'Unknown Workout',
				exercises: []
			};

			const result = await findProgramForSession(session, repo);

			expect(result).toBeNull();
		});

		it('should return null if session has no workout', async () => {
			const repo = createMockProgramRepo([]);

			const session: Session = {
				id: 'session-1',
				date: '2025-01-01',
				startTime: '2025-01-01T10:00:00Z',
				status: 'completed',
				exercises: []
			};

			const result = await findProgramForSession(session, repo);

			expect(result).toBeNull();
		});
	});
});
