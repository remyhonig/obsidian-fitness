import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionRepository } from './session-repository';
import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import type { Session, SessionExercise, LoggedSet } from '../types';
import { calculateTotalVolume, countTotalCompletedSets } from '../domain/metrics';

// Create mock vault
function createMockVault() {
	const files = new Map<string, { content: string; file: TFile }>();
	const folders = new Set<string>();

	// Helper to get folder path from file path
	const getFolderPath = (filePath: string) => {
		const parts = filePath.split('/');
		parts.pop();
		return parts.join('/');
	};

	// Helper to get files in a folder
	const getFilesInFolder = (folderPath: string): TFile[] => {
		const result: TFile[] = [];
		for (const [path, { file }] of files.entries()) {
			if (getFolderPath(path) === folderPath) {
				result.push(file);
			}
		}
		return result;
	};

	// Helper to create a TFile instance
	const createFile = (path: string): TFile => {
		return new TFile(path);
	};

	const adapter = {
		exists: vi.fn(async (path: string) => files.has(path)),
		write: vi.fn(async (path: string, content: string) => {
			const file = createFile(path);
			files.set(path, { content, file });
			folders.add(getFolderPath(path));
		})
	};

	return {
		adapter,
		getFileByPath: vi.fn((path: string) => files.get(path)?.file ?? null),
		getFolderByPath: vi.fn((path: string) => {
			if (folders.has(path)) {
				const children = getFilesInFolder(path);
				return new TFolder(path, children);
			}
			return null;
		}),
		create: vi.fn(async (path: string, content: string) => {
			const file = createFile(path);
			files.set(path, { content, file });
			folders.add(getFolderPath(path));
			return file;
		}),
		modify: vi.fn(async (file: TFile, content: string) => {
			const existing = files.get(file.path);
			if (existing) {
				existing.content = content;
			}
		}),
		cachedRead: vi.fn(async (file: TFile) => {
			return files.get(file.path)?.content ?? '';
		}),
		createFolder: vi.fn(async (path: string) => {
			folders.add(path);
		}),
		_getContent: (path: string) => files.get(path)?.content,
		_setContent: (path: string, content: string) => {
			const file = createFile(path);
			files.set(path, { content, file });
			folders.add(getFolderPath(path));
		},
		_clear: () => {
			files.clear();
			folders.clear();
		}
	};
}

function createMockFileManager() {
	return {
		trashFile: vi.fn()
	};
}

function createMockApp(vault: ReturnType<typeof createMockVault>) {
	return {
		vault,
		fileManager: createMockFileManager()
	} as unknown as App;
}

describe('SessionRepository', () => {
	let mockVault: ReturnType<typeof createMockVault>;
	let mockApp: App;
	let repo: SessionRepository;

	beforeEach(() => {
		mockVault = createMockVault();
		mockApp = createMockApp(mockVault);
		repo = new SessionRepository(mockApp, 'Fitness');
		mockVault._clear();
	});

	describe('saveActive', () => {
		it('should create active session file', async () => {
			const session: Session = {
				id: '2025-12-26-10-00-00-workout',
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				status: 'active',
				exercises: []
			};

			await repo.saveActive(session);

			expect(mockVault.create).toHaveBeenCalledWith(
				'Fitness/Sessions/2025-12-26-10-00-00-workout.md',
				expect.any(String)
			);
		});

		it('should update existing active session file', async () => {
			// Create initial active session
			const sessionId = '2025-12-26-10-00-00-workout';
			mockVault._setContent(`Fitness/Sessions/${sessionId}.md`, '---\nstatus: active\n---');

			const session: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				status: 'active',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120,
						sets: [{ weight: 80, reps: 10, completed: true, timestamp: '2025-12-26T10:05:00Z' }]
					}
				]
			};

			await repo.saveActive(session);

			expect(mockVault.modify).toHaveBeenCalled();
		});

		it('should serialize session with sets correctly in body', async () => {
			const sessionId = '2025-12-26-10-00-00-push-day';
			const session: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				workout: 'Push Day',
				status: 'active',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 4,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-12-26T10:05:00Z' },
							{ weight: 80, reps: 7, completed: true, timestamp: '2025-12-26T10:10:00Z' }
						]
					}
				]
			};

			await repo.saveActive(session);

			const content = mockVault._getContent(`Fitness/Sessions/${sessionId}.md`);
			// Metadata in frontmatter - workout is stored as an internal link
			expect(content).toContain('workout: "[[Workouts/push-day]]"');
			// Exercises in body as markdown blocks
			expect(content).toContain('## Bench Press');
			expect(content).toContain('Target: 4 × 6-8 | Rest: 180s');
			expect(content).toContain('| # | kg | reps | rpe | time |');
			expect(content).toContain('| 1 | 80 | 8 |');
			expect(content).toContain('| 2 | 80 | 7 |');
		});

		it('should include formatted time (HH:MM:SS) in saved sessions', async () => {
			const sessionId = '2025-12-26-14-30-45-workout';
			const session: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T14:30:45Z',
				endTime: '2025-12-26T15:45:30Z',
				status: 'active',
				exercises: []
			};

			await repo.saveActive(session);

			const content = mockVault._getContent(`Fitness/Sessions/${sessionId}.md`);
			// The formatted time should be in local timezone, so we check the pattern
			expect(content).toContain('startTimeFormatted:');
			expect(content).toContain('endTimeFormatted:');
			// Verify HH:MM:SS pattern exists (exact time depends on timezone, YAML quotes strings)
			expect(content).toMatch(/startTimeFormatted: "\d{2}:\d{2}:\d{2}"/);
			expect(content).toMatch(/endTimeFormatted: "\d{2}:\d{2}:\d{2}"/);
		});
	});

	describe('getActive', () => {
		it('should return null when no active session', async () => {
			const result = await repo.getActive();
			expect(result).toBeNull();
		});

		it('should return active session when exists', async () => {
			mockVault._setContent('Fitness/Sessions/.active-session.md', `---
date: 2025-12-26
startTime: 2025-12-26T10:00:00Z
status: active
workout: Push Day
---

## Bench Press
Target: 3 × 8-12 | Rest: 120s

| # | kg | reps | rpe | time |
|---|---|---|---|---|
| 1 | 80 | 10 | - | 10:05:00 |
`);

			const result = await repo.getActive();

			expect(result).not.toBeNull();
			expect(result?.status).toBe('active');
			expect(result?.workout).toBe('Push Day');
			expect(result?.exercises).toHaveLength(1);
			expect(result?.exercises[0].sets).toHaveLength(1);
		});

		it('should return null for completed session in active file', async () => {
			mockVault._setContent('Fitness/Sessions/.active-session.md', `---
startTime: 2025-12-26T10:00:00Z
status: completed
---`);

			const result = await repo.getActive();
			expect(result).toBeNull();
		});
	});

	describe('finalizeActive', () => {
		it('should update session status to completed', async () => {
			const sessionId = '2025-12-26-10-00-00-push-day';
			const session: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				workout: 'Push Day',
				status: 'active',
				exercises: []
			};

			const result = await repo.finalizeActive(session);

			expect(result.status).toBe('completed');
			expect(result.endTime).toBeDefined();
			expect(result.id).toBe(sessionId); // ID remains the same
		});

		it('should save to the same file with updated status', async () => {
			const sessionId = '2025-12-26-14-30-45-push-day';
			mockVault._setContent(`Fitness/Sessions/${sessionId}.md`, '---\nstatus: active\n---');

			const session: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T14:30:45Z',
				workout: 'Push Day',
				status: 'active',
				exercises: []
			};

			await repo.finalizeActive(session);

			// Should modify existing file
			expect(mockVault.modify).toHaveBeenCalled();
			const content = mockVault._getContent(`Fitness/Sessions/${sessionId}.md`);
			expect(content).toContain('status: completed');
		});

		it('should delete legacy active session file after finalizing', async () => {
			// Create legacy active session file
			mockVault._setContent('Fitness/Sessions/.active-session.md', '---\nstatus: active\n---');

			const sessionId = '2025-12-26-10-00-00-workout';
			const session: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				status: 'active',
				exercises: []
			};

			await repo.finalizeActive(session);

			expect((mockApp.fileManager as ReturnType<typeof createMockFileManager>).trashFile).toHaveBeenCalled();
		});
	});

	describe('get', () => {
		it('should return null for non-existent session', async () => {
			const result = await repo.get('non-existent');
			expect(result).toBeNull();
		});

		it('should parse session from file with exercises in body', async () => {
			mockVault._setContent('Fitness/Sessions/2025-12-25-push-day.md', `---
date: 2025-12-25
startTime: 2025-12-25T10:00:00Z
endTime: 2025-12-25T11:00:00Z
workout: Push Day
status: completed
---

## Bench Press
Target: 4 × 6-8 | Rest: 180s

| # | kg | reps | rpe | time |
|---|---|---|---|---|
| 1 | 80 | 8 | - | 10:05:00 |
| 2 | 80 | 7 | - | 10:10:00 |
`);

			const result = await repo.get('2025-12-25-push-day');

			expect(result).not.toBeNull();
			expect(result?.date).toBe('2025-12-25');
			expect(result?.workout).toBe('Push Day');
			expect(result?.status).toBe('completed');
			expect(result?.exercises).toHaveLength(1);
			expect(result?.exercises[0].sets).toHaveLength(2);
		});
	});

	describe('deleteActive', () => {
		it('should trash active session file', async () => {
			mockVault._setContent('Fitness/Sessions/.active-session.md', '---\nstatus: active\n---');

			await repo.deleteActive();

			expect((mockApp.fileManager as ReturnType<typeof createMockFileManager>).trashFile).toHaveBeenCalled();
		});

		it('should not throw if no active session', async () => {
			await expect(repo.deleteActive()).resolves.not.toThrow();
		});
	});

	describe('delete', () => {
		it('should trash session file', async () => {
			mockVault._setContent('Fitness/Sessions/2025-12-25-push-day.md', '---\nstatus: completed\n---');

			await repo.delete('2025-12-25-push-day');

			expect((mockApp.fileManager as ReturnType<typeof createMockFileManager>).trashFile).toHaveBeenCalled();
		});
	});

	describe('calculateTotalVolume (domain function)', () => {
		it('should calculate total volume correctly', () => {
			const session: Session = {
				id: 'test',
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 10, completed: true, timestamp: '' }, // 800
							{ weight: 80, reps: 8, completed: true, timestamp: '' }, // 640
							{ weight: 80, reps: 6, completed: true, timestamp: '' } // 480
						]
					},
					{
						exercise: 'OHP',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120,
						sets: [
							{ weight: 40, reps: 10, completed: true, timestamp: '' } // 400
						]
					}
				]
			};

			const volume = calculateTotalVolume(session);
			expect(volume).toBe(800 + 640 + 480 + 400); // 2320
		});

		it('should exclude incomplete sets', () => {
			const session: Session = {
				id: 'test',
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 10, completed: true, timestamp: '' },
							{ weight: 80, reps: 0, completed: false, timestamp: '' } // Skipped
						]
					}
				]
			};

			const volume = calculateTotalVolume(session);
			expect(volume).toBe(800);
		});
	});

	describe('countTotalCompletedSets (domain function)', () => {
		it('should count completed sets correctly', () => {
			const session: Session = {
				id: 'test',
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 4,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '' },
							{ weight: 80, reps: 7, completed: true, timestamp: '' },
							{ weight: 80, reps: 6, completed: true, timestamp: '' },
							{ weight: 80, reps: 5, completed: false, timestamp: '' }
						]
					},
					{
						exercise: 'OHP',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120,
						sets: [
							{ weight: 40, reps: 10, completed: true, timestamp: '' }
						]
					}
				]
			};

			const count = countTotalCompletedSets(session);
			expect(count).toBe(4); // 3 from bench + 1 from OHP
		});
	});

	describe('roundtrip: saveActive and getActive', () => {
		it('should roundtrip session with exercises and sets', async () => {
			const sessionId = '2025-12-26-10-00-00-full-body';
			const original: Session = {
				id: sessionId,
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				workout: 'Full Body',
				status: 'active',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 5,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 180,
						sets: [
							{ weight: 100, reps: 5, completed: true, timestamp: '2025-12-26T10:05:00Z' },
							{ weight: 100, reps: 5, completed: true, timestamp: '2025-12-26T10:10:00Z', rpe: 7 },
							{ weight: 100, reps: 4, completed: true, timestamp: '2025-12-26T10:15:00Z', rpe: 8 }
						]
					},
					{
						exercise: 'Bench Press',
						targetSets: 4,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 150,
						sets: []
					}
				]
			};

			await repo.saveActive(original);
			const retrieved = await repo.getActive();

			expect(retrieved).not.toBeNull();
			expect(retrieved?.workout).toBe('Full Body');
			expect(retrieved?.exercises).toHaveLength(2);
			expect(retrieved?.exercises[0].sets).toHaveLength(3);
			expect(retrieved?.exercises[0].sets[0].weight).toBe(100);
			expect(retrieved?.exercises[0].sets[0].reps).toBe(5);
			expect(retrieved?.exercises[1].sets).toHaveLength(0);
		});
	});

	describe('setBasePath', () => {
		it('should update the base path', () => {
			expect(() => repo.setBasePath('NewFitness')).not.toThrow();
		});
	});
});
