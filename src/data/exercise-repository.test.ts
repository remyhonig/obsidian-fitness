import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExerciseRepository } from './exercise-repository';
import type { App, TFile, TFolder } from 'obsidian';
import type { Exercise } from '../types';

// Create mock vault
function createMockVault() {
	const files = new Map<string, { content: string; file: TFile }>();
	const folders = new Set<string>();

	return {
		getFileByPath: vi.fn((path: string) => files.get(path)?.file ?? null),
		getFolderByPath: vi.fn((path: string) => {
			if (folders.has(path)) {
				return { path, children: [] } as unknown as TFolder;
			}
			return null;
		}),
		create: vi.fn(async (path: string, content: string) => {
			const file = { path, extension: 'md' } as TFile;
			files.set(path, { content, file });
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
			const file = { path, extension: 'md' } as TFile;
			files.set(path, { content, file });
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

describe('ExerciseRepository', () => {
	let mockVault: ReturnType<typeof createMockVault>;
	let mockApp: App;
	let repo: ExerciseRepository;

	beforeEach(() => {
		mockVault = createMockVault();
		mockApp = createMockApp(mockVault);
		repo = new ExerciseRepository(mockApp, 'Fitness');
		mockVault._clear();
	});

	describe('create', () => {
		it('should create a new exercise file', async () => {
			const exercise: Omit<Exercise, 'id'> = {
				name: 'Bench Press',
				category: 'Chest',
				equipment: 'Barbell',
				muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
				defaultWeight: 60,
				weightIncrement: 2.5
			};

			const result = await repo.create(exercise);

			expect(result.id).toBe('bench-press');
			expect(result.name).toBe('Bench Press');
			expect(mockVault.create).toHaveBeenCalled();
		});

		it('should serialize muscle groups correctly', async () => {
			const exercise: Omit<Exercise, 'id'> = {
				name: 'Squat',
				category: 'Legs',
				equipment: 'Barbell',
				muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings']
			};

			await repo.create(exercise);

			const content = mockVault._getContent('Fitness/Exercises/squat.md');
			expect(content).toContain('name: Squat');
			expect(content).toContain('muscleGroups: [Quadriceps, Glutes, Hamstrings]');
		});

		it('should include notes in body', async () => {
			const exercise: Omit<Exercise, 'id'> = {
				name: 'Deadlift',
				notes: 'Keep back straight. Drive through heels.'
			};

			await repo.create(exercise);

			const content = mockVault._getContent('Fitness/Exercises/deadlift.md');
			expect(content).toContain('Keep back straight');
		});

		it('should throw error if exercise already exists', async () => {
			mockVault._setContent('Fitness/Exercises/bench-press.md', '---\nname: Bench Press\n---');

			await expect(
				repo.create({ name: 'Bench Press' })
			).rejects.toThrow('Exercise already exists');
		});
	});

	describe('get', () => {
		it('should return null for non-existent exercise', async () => {
			const result = await repo.get('non-existent');
			expect(result).toBeNull();
		});

		it('should parse exercise from file', async () => {
			mockVault._setContent('Fitness/Exercises/bench-press.md', `---
name: Bench Press
category: Chest
equipment: Barbell
muscleGroups: [Chest, Triceps, Shoulders]
defaultWeight: 60
weightIncrement: 2.5
---
Focus on controlled movement.`);

			const result = await repo.get('bench-press');

			expect(result).not.toBeNull();
			expect(result?.name).toBe('Bench Press');
			expect(result?.category).toBe('Chest');
			expect(result?.equipment).toBe('Barbell');
			expect(result?.muscleGroups).toEqual(['Chest', 'Triceps', 'Shoulders']);
			expect(result?.defaultWeight).toBe(60);
			expect(result?.weightIncrement).toBe(2.5);
			expect(result?.notes).toBe('Focus on controlled movement.');
		});
	});

	describe('update', () => {
		it('should update existing exercise', async () => {
			mockVault._setContent('Fitness/Exercises/bench-press.md', `---
name: Bench Press
category: Chest
defaultWeight: 60
---`);

			await repo.update('bench-press', {
				defaultWeight: 80,
				weightIncrement: 5
			});

			expect(mockVault.modify).toHaveBeenCalled();
		});

		it('should throw error for non-existent exercise', async () => {
			await expect(
				repo.update('non-existent', { name: 'Test' })
			).rejects.toThrow('Exercise not found');
		});
	});

	describe('delete', () => {
		it('should trash the exercise file', async () => {
			mockVault._setContent('Fitness/Exercises/bench-press.md', '---\nname: Bench Press\n---');

			await repo.delete('bench-press');

			expect((mockApp.fileManager as ReturnType<typeof createMockFileManager>).trashFile).toHaveBeenCalled();
		});

		it('should not throw for non-existent exercise', async () => {
			await expect(repo.delete('non-existent')).resolves.not.toThrow();
		});
	});

	describe('roundtrip: create and get', () => {
		it('should roundtrip exercise with all fields', async () => {
			const original: Omit<Exercise, 'id'> = {
				name: 'Romanian Deadlift',
				category: 'Legs',
				equipment: 'Barbell',
				muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'],
				defaultWeight: 40,
				weightIncrement: 5,
				notes: 'Keep knees slightly bent. Hinge at hips.'
			};

			const created = await repo.create(original);
			const retrieved = await repo.get(created.id);

			expect(retrieved).not.toBeNull();
			expect(retrieved?.name).toBe(original.name);
			expect(retrieved?.category).toBe(original.category);
			expect(retrieved?.equipment).toBe(original.equipment);
			expect(retrieved?.muscleGroups).toEqual(original.muscleGroups);
			expect(retrieved?.defaultWeight).toBe(original.defaultWeight);
			expect(retrieved?.weightIncrement).toBe(original.weightIncrement);
			expect(retrieved?.notes).toBe(original.notes);
		});

		it('should roundtrip exercise with minimal fields', async () => {
			const original: Omit<Exercise, 'id'> = {
				name: 'Push-up'
			};

			const created = await repo.create(original);
			const retrieved = await repo.get(created.id);

			expect(retrieved?.name).toBe('Push-up');
		});

		it('should handle special characters in name', async () => {
			const original: Omit<Exercise, 'id'> = {
				name: 'Dumbbell Fly (Incline, 30°)'
			};

			const created = await repo.create(original);
			const retrieved = await repo.get(created.id);

			expect(retrieved?.name).toBe('Dumbbell Fly (Incline, 30°)');
		});
	});

	describe('setBasePath', () => {
		it('should update the base path', () => {
			expect(() => repo.setBasePath('NewFitness')).not.toThrow();
		});
	});
});
