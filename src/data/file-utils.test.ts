import { describe, it, expect } from 'vitest';
import { parseFrontmatter, toFrontmatter, createFileContent, toFilename, getIdFromPath } from './file-utils';

describe('file-utils', () => {
	describe('toFilename', () => {
		it('should convert name to lowercase', () => {
			expect(toFilename('Push Day')).toBe('push-day');
		});

		it('should replace spaces with hyphens', () => {
			expect(toFilename('My Workout Template')).toBe('my-workout-template');
		});

		it('should remove special characters', () => {
			expect(toFilename('Push Day #1!')).toBe('push-day-1');
		});

		it('should remove leading and trailing hyphens', () => {
			expect(toFilename('---test---')).toBe('test');
		});
	});

	describe('getIdFromPath', () => {
		it('should extract filename without extension', () => {
			expect(getIdFromPath('Fitness/Workouts/push-day.md')).toBe('push-day');
		});

		it('should handle nested paths', () => {
			expect(getIdFromPath('a/b/c/d/file.md')).toBe('file');
		});

		it('should handle filename only', () => {
			expect(getIdFromPath('filename.md')).toBe('filename');
		});
	});

	describe('toFrontmatter', () => {
		it('should create frontmatter for simple key-value pairs', () => {
			const result = toFrontmatter({ name: 'Test', value: 42 });
			expect(result).toContain('---');
			expect(result).toContain('name: Test');
			expect(result).toContain('value: 42');
		});

		it('should handle boolean values', () => {
			const result = toFrontmatter({ active: true, disabled: false });
			expect(result).toContain('active: true');
			expect(result).toContain('disabled: false');
		});

		it('should handle array of primitives as inline', () => {
			const result = toFrontmatter({ tags: ['a', 'b', 'c'] });
			expect(result).toContain('tags: [a, b, c]');
		});

		it('should handle array of objects', () => {
			const result = toFrontmatter({
				exercises: [
					{ exercise: 'Bench Press', targetSets: 3 },
					{ exercise: 'Squat', targetSets: 4 }
				]
			});
			expect(result).toContain('exercises:');
			expect(result).toContain('  - exercise: Bench Press');
			expect(result).toContain('    targetSets: 3');
			expect(result).toContain('  - exercise: Squat');
			expect(result).toContain('    targetSets: 4');
		});

		it('should quote strings with colons', () => {
			const result = toFrontmatter({ time: '10:30:00' });
			expect(result).toContain('time: "10:30:00"');
		});

		it('should skip null and undefined values', () => {
			const result = toFrontmatter({ name: 'Test', empty: null, missing: undefined });
			expect(result).not.toContain('empty');
			expect(result).not.toContain('missing');
		});

		it('should skip empty arrays', () => {
			const result = toFrontmatter({ name: 'Test', items: [] });
			expect(result).not.toContain('items');
		});
	});

	describe('parseFrontmatter', () => {
		it('should parse simple key-value pairs', () => {
			const content = `---
name: Test
value: 42
---
Body content`;
			const { frontmatter, body } = parseFrontmatter<{ name: string; value: number }>(content);
			expect(frontmatter?.name).toBe('Test');
			expect(frontmatter?.value).toBe(42);
			expect(body).toBe('Body content');
		});

		it('should parse boolean values', () => {
			const content = `---
active: true
disabled: false
---`;
			const { frontmatter } = parseFrontmatter<{ active: boolean; disabled: boolean }>(content);
			expect(frontmatter?.active).toBe(true);
			expect(frontmatter?.disabled).toBe(false);
		});

		it('should parse inline arrays', () => {
			const content = `---
tags: [a, b, c]
---`;
			const { frontmatter } = parseFrontmatter<{ tags: string[] }>(content);
			expect(frontmatter?.tags).toEqual(['a', 'b', 'c']);
		});

		it('should parse array of objects', () => {
			const content = `---
exercises:
  - exercise: Bench Press
    targetSets: 3
    targetRepsMin: 8
    targetRepsMax: 12
  - exercise: Squat
    targetSets: 4
    targetRepsMin: 5
    targetRepsMax: 5
---`;
			const { frontmatter } = parseFrontmatter<{
				exercises: Array<{
					exercise: string;
					targetSets: number;
					targetRepsMin: number;
					targetRepsMax: number;
				}>;
			}>(content);
			expect(frontmatter?.exercises).toHaveLength(2);
			expect(frontmatter?.exercises[0]).toEqual({
				exercise: 'Bench Press',
				targetSets: 3,
				targetRepsMin: 8,
				targetRepsMax: 12
			});
			expect(frontmatter?.exercises[1]).toEqual({
				exercise: 'Squat',
				targetSets: 4,
				targetRepsMin: 5,
				targetRepsMax: 5
			});
		});

		it('should return null frontmatter for content without frontmatter', () => {
			const content = 'Just plain text content';
			const { frontmatter, body } = parseFrontmatter(content);
			expect(frontmatter).toBeNull();
			expect(body).toBe(content);
		});

		it('should handle empty body', () => {
			const content = `---
name: Test
---`;
			const { frontmatter, body } = parseFrontmatter<{ name: string }>(content);
			expect(frontmatter?.name).toBe('Test');
			expect(body).toBe('');
		});
	});

	describe('createFileContent', () => {
		it('should create content with frontmatter only', () => {
			const content = createFileContent({ name: 'Test' });
			expect(content).toContain('---');
			expect(content).toContain('name: Test');
		});

		it('should create content with frontmatter and body', () => {
			const content = createFileContent({ name: 'Test' }, 'Body text');
			expect(content).toContain('name: Test');
			expect(content).toContain('Body text');
		});
	});

	describe('roundtrip: workout exercises', () => {
		it('should serialize and deserialize workout exercises correctly', () => {
			const original = {
				name: 'Push Day',
				description: 'Chest, shoulders, triceps',
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
					},
					{
						exercise: 'Tricep Pushdown',
						targetSets: 3,
						targetRepsMin: 10,
						targetRepsMax: 15,
						restSeconds: 60
					}
				]
			};

			// Serialize to frontmatter
			const yaml = toFrontmatter(original);

			// Parse back
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter).not.toBeNull();
			expect(frontmatter?.name).toBe(original.name);
			expect(frontmatter?.description).toBe(original.description);
			expect(frontmatter?.exercises).toHaveLength(3);
			expect(frontmatter?.exercises[0]).toEqual(original.exercises[0]);
			expect(frontmatter?.exercises[1]).toEqual(original.exercises[1]);
			expect(frontmatter?.exercises[2]).toEqual(original.exercises[2]);
		});

		it('should handle empty exercises array', () => {
			const original = {
				name: 'Empty Workout',
				exercises: []
			};

			const yaml = toFrontmatter(original);
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter?.name).toBe('Empty Workout');
			// Empty arrays are skipped in toFrontmatter, so exercises will be undefined
			expect(frontmatter?.exercises).toBeUndefined();
		});

		it('should handle workout with single exercise', () => {
			const original = {
				name: 'Single Exercise',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 5,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 180
					}
				]
			};

			const yaml = toFrontmatter(original);
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter?.exercises).toHaveLength(1);
			expect(frontmatter?.exercises[0]).toEqual(original.exercises[0]);
		});
	});

	describe('roundtrip: session data', () => {
		it('should serialize and deserialize session with sets', () => {
			const original = {
				date: '2025-12-26',
				startTime: '2025-12-26T10:00:00Z',
				endTime: '2025-12-26T11:00:00Z',
				workout: 'Push Day',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120,
						sets: [
							{
								weight: 80,
								reps: 10,
								completed: true,
								timestamp: '2025-12-26T10:05:00Z'
							},
							{
								weight: 80,
								reps: 8,
								completed: true,
								timestamp: '2025-12-26T10:10:00Z'
							}
						]
					}
				]
			};

			const yaml = toFrontmatter(original);
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter?.date).toBe(original.date);
			expect(frontmatter?.workout).toBe(original.workout);
			expect(frontmatter?.status).toBe(original.status);
			expect(frontmatter?.exercises).toHaveLength(1);
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in exercise names', () => {
			const original = {
				name: 'Test',
				exercises: [
					{
						exercise: 'Dumbbell Fly (Incline)',
						targetSets: 3,
						targetRepsMin: 10,
						targetRepsMax: 12,
						restSeconds: 60
					}
				]
			};

			const yaml = toFrontmatter(original);
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter?.exercises[0].exercise).toBe('Dumbbell Fly (Incline)');
		});

		it('should handle decimal weights', () => {
			const original = {
				exercises: [
					{
						exercise: 'Test',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120
					}
				],
				sets: [
					{
						weight: 82.5,
						reps: 10,
						completed: true
					}
				]
			};

			const yaml = toFrontmatter(original);
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter?.sets?.[0].weight).toBe(82.5);
		});

		it('should handle number arrays', () => {
			const original = {
				muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
				weights: [60, 62.5, 65]
			};

			const yaml = toFrontmatter(original);
			const { frontmatter } = parseFrontmatter<typeof original>(`${yaml}\n`);

			expect(frontmatter?.muscleGroups).toEqual(['Chest', 'Triceps', 'Shoulders']);
			expect(frontmatter?.weights).toEqual([60, 62.5, 65]);
		});
	});
});
