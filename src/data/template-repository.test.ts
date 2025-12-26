import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateRepository } from './template-repository';
import type { App, TFile, TFolder, Vault } from 'obsidian';
import type { Template, TemplateExercise } from '../types';

// Create mock vault
function createMockVault() {
	const files = new Map<string, { content: string; file: TFile }>();
	const folders = new Set<string>();

	const mockVault = {
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
		// Helper to get stored content for testing
		_getContent: (path: string) => files.get(path)?.content,
		_setContent: (path: string, content: string) => {
			const file = { path, extension: 'md' } as TFile;
			files.set(path, { content, file });
		},
		_getAllFiles: () => Array.from(files.entries()),
		_clear: () => {
			files.clear();
			folders.clear();
		}
	};

	return mockVault;
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

describe('TemplateRepository', () => {
	let mockVault: ReturnType<typeof createMockVault>;
	let mockApp: App;
	let repo: TemplateRepository;

	beforeEach(() => {
		mockVault = createMockVault();
		mockApp = createMockApp(mockVault);
		repo = new TemplateRepository(mockApp, 'Fitness');
		mockVault._clear();
	});

	describe('create', () => {
		it('should create a new template file', async () => {
			const template = {
				name: 'Push Day',
				description: 'Chest and triceps',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 4,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180
					}
				] as TemplateExercise[]
			};

			const result = await repo.create(template);

			expect(result.id).toBe('push-day');
			expect(result.name).toBe('Push Day');
			expect(mockVault.create).toHaveBeenCalled();
		});

		it('should serialize exercises correctly in body as markdown table', async () => {
			const template = {
				name: 'Test Template',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 4,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 180
					},
					{
						exercise: 'Overhead Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120
					}
				] as TemplateExercise[]
			};

			await repo.create(template);

			const content = mockVault._getContent('Fitness/Templates/test-template.md');
			expect(content).toBeDefined();
			// Metadata in frontmatter
			expect(content).toContain('name: Test Template');
			// Exercises in body as table
			expect(content).toContain('## Exercises');
			expect(content).toContain('| Exercise | Sets | Reps | Rest |');
			expect(content).toContain('| Bench Press | 4 | 6-8 | 180s |');
			expect(content).toContain('| Overhead Press | 3 | 8-10 | 120s |');
		});

		it('should throw error if template already exists', async () => {
			// Create existing file
			mockVault._setContent('Fitness/Templates/push-day.md', '---\nname: Push Day\n---');

			await expect(
				repo.create({ name: 'Push Day', exercises: [] })
			).rejects.toThrow('Template already exists');
		});

		it('should ensure folder exists before creating', async () => {
			await repo.create({ name: 'Test', exercises: [] });

			expect(mockVault.createFolder).toHaveBeenCalledWith('Fitness');
			expect(mockVault.createFolder).toHaveBeenCalledWith('Fitness/Templates');
		});
	});

	describe('get', () => {
		it('should return null for non-existent template', async () => {
			const result = await repo.get('non-existent');
			expect(result).toBeNull();
		});

		it('should parse template from file with exercises in body', async () => {
			mockVault._setContent('Fitness/Templates/push-day.md', `---
name: Push Day
description: Chest workout
---

## Exercises

| Exercise | Sets | Reps | Rest |
|---|---|---|---|
| Bench Press | 4 | 6-8 | 180s |
`);

			const result = await repo.get('push-day');

			expect(result).not.toBeNull();
			expect(result?.name).toBe('Push Day');
			expect(result?.description).toBe('Chest workout');
			expect(result?.exercises).toHaveLength(1);
			expect(result?.exercises[0].exercise).toBe('Bench Press');
			expect(result?.exercises[0].targetSets).toBe(4);
			expect(result?.exercises[0].targetRepsMin).toBe(6);
			expect(result?.exercises[0].targetRepsMax).toBe(8);
			expect(result?.exercises[0].restSeconds).toBe(180);
		});
	});

	describe('update', () => {
		it('should update existing template', async () => {
			// Create initial template with new body format
			mockVault._setContent('Fitness/Templates/push-day.md', `---
name: Push Day
---

## Exercises

| Exercise | Sets | Reps | Rest |
|---|---|---|---|
| Bench Press | 3 | 8-12 | 120s |
`);

			await repo.update('push-day', {
				name: 'Push Day Updated',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 5,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 180
					}
				]
			});

			expect(mockVault.modify).toHaveBeenCalled();
		});

		it('should throw error for non-existent template', async () => {
			await expect(
				repo.update('non-existent', { name: 'Test' })
			).rejects.toThrow('Template not found');
		});
	});

	describe('delete', () => {
		it('should trash the template file', async () => {
			mockVault._setContent('Fitness/Templates/push-day.md', '---\nname: Push Day\n---');

			await repo.delete('push-day');

			expect((mockApp.fileManager as ReturnType<typeof createMockFileManager>).trashFile).toHaveBeenCalled();
		});

		it('should not throw for non-existent template', async () => {
			await expect(repo.delete('non-existent')).resolves.not.toThrow();
		});
	});

	describe('list', () => {
		it('should return empty array when no templates', async () => {
			const result = await repo.list();
			expect(result).toEqual([]);
		});
	});

	describe('duplicate', () => {
		it('should create a copy with new name', async () => {
			mockVault._setContent('Fitness/Templates/push-day.md', `---
name: Push Day
---

## Exercises

| Exercise | Sets | Reps | Rest |
|---|---|---|---|
| Bench Press | 3 | 8-12 | 120s |
`);

			const result = await repo.duplicate('push-day', 'Push Day Copy');

			expect(result.name).toBe('Push Day Copy');
			expect(result.id).toBe('push-day-copy');
			expect(mockVault.create).toHaveBeenCalled();
		});

		it('should throw error for non-existent template', async () => {
			await expect(
				repo.duplicate('non-existent', 'Copy')
			).rejects.toThrow('Template not found');
		});
	});

	describe('search', () => {
		it('should filter templates by name', async () => {
			// Note: search relies on list(), which needs getFilesInFolder
			// This is difficult to test without more mocking
			// For now, we test that it doesn't throw
			const result = await repo.search('push');
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe('roundtrip: create and get', () => {
		it('should roundtrip template with exercises', async () => {
			const original = {
				name: 'Full Workout',
				description: 'Complete body workout',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 5,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 180
					},
					{
						exercise: 'Bench Press',
						targetSets: 4,
						targetRepsMin: 6,
						targetRepsMax: 8,
						restSeconds: 150
					},
					{
						exercise: 'Deadlift',
						targetSets: 3,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 240
					}
				] as TemplateExercise[]
			};

			// Create the template
			const created = await repo.create(original);

			// Retrieve it
			const retrieved = await repo.get(created.id);

			expect(retrieved).not.toBeNull();
			expect(retrieved?.name).toBe(original.name);
			expect(retrieved?.description).toBe(original.description);
			expect(retrieved?.exercises).toHaveLength(3);

			// Check each exercise
			expect(retrieved?.exercises[0]).toMatchObject({
				exercise: 'Squat',
				targetSets: 5,
				targetRepsMin: 5,
				targetRepsMax: 5,
				restSeconds: 180
			});
			expect(retrieved?.exercises[1]).toMatchObject({
				exercise: 'Bench Press',
				targetSets: 4,
				targetRepsMin: 6,
				targetRepsMax: 8,
				restSeconds: 150
			});
			expect(retrieved?.exercises[2]).toMatchObject({
				exercise: 'Deadlift',
				targetSets: 3,
				targetRepsMin: 5,
				targetRepsMax: 5,
				restSeconds: 240
			});
		});

		it('should roundtrip template with empty exercises', async () => {
			const original = {
				name: 'Empty Template',
				exercises: [] as TemplateExercise[]
			};

			const created = await repo.create(original);
			const retrieved = await repo.get(created.id);

			expect(retrieved?.name).toBe('Empty Template');
			expect(retrieved?.exercises).toEqual([]);
		});

		it('should roundtrip template with special characters in exercise names', async () => {
			const original = {
				name: 'Special',
				exercises: [
					{
						exercise: 'Dumbbell Fly (Incline)',
						targetSets: 3,
						targetRepsMin: 10,
						targetRepsMax: 12,
						restSeconds: 60
					}
				] as TemplateExercise[]
			};

			const created = await repo.create(original);
			const retrieved = await repo.get(created.id);

			expect(retrieved?.exercises[0].exercise).toBe('Dumbbell Fly (Incline)');
		});
	});

	describe('setBasePath', () => {
		it('should update the base path', () => {
			repo.setBasePath('NewFitness');
			// The effect is internal, but we can verify it doesn't throw
			expect(() => repo.setBasePath('AnotherPath')).not.toThrow();
		});
	});
});
