import { describe, it, expect } from 'vitest';
import { parseSessionBody, createSessionBody, type SessionExerciseBlock } from './session-body';

describe('session-body', () => {
	describe('parseSessionBody', () => {
		it('should parse basic session body', () => {
			const body = `# Exercises

## Bench Press
Target: 4 × 6-8 | Rest: 180s

| # | kg | reps | rpe | time |
|---|---|---|---|---|
| 1 | 80 | 8 | 7 | 10:05:00 |
| 2 | 80 | 7 | 8 | 10:10:00 |
`;

			const result = parseSessionBody(body);

			expect(result).toHaveLength(1);
			expect(result[0].exercise).toBe('Bench Press');
			expect(result[0].targetSets).toBe(4);
			expect(result[0].targetRepsMin).toBe(6);
			expect(result[0].targetRepsMax).toBe(8);
			expect(result[0].restSeconds).toBe(180);
			expect(result[0].sets).toHaveLength(2);
			expect(result[0].sets[0].weight).toBe(80);
			expect(result[0].sets[0].reps).toBe(8);
			expect(result[0].sets[0].rpe).toBe(7);
		});

		it('should parse session body with rest tracking columns', () => {
			const body = `# Exercises

## Bench Press
Target: 4 × 6-8 | Rest: 180s

| # | kg | reps | rpe | time | rest | +rest | s/rep |
|---|---|---|---|---|---|---|---|
| 1 | 80 | 8 | 7 | 10:05:00 | 120s | +30s | 2.5s |
| 2 | 80 | 7 | 8 | 10:10:00 | 90s | - | 3.0s |
| 3 | 80 | 6 | 9 | 10:15:00 | - | - | 2.8s |
`;

			const result = parseSessionBody(body);

			expect(result).toHaveLength(1);
			expect(result[0].sets).toHaveLength(3);

			// First set with rest extension
			expect(result[0].sets[0].actualRestSeconds).toBe(120);
			expect(result[0].sets[0].extraRestSeconds).toBe(30);
			expect(result[0].sets[0].avgRepDuration).toBe(2.5);

			// Second set without extension
			expect(result[0].sets[1].actualRestSeconds).toBe(90);
			expect(result[0].sets[1].extraRestSeconds).toBeUndefined();
			expect(result[0].sets[1].avgRepDuration).toBe(3.0);

			// Third set with no rest data
			expect(result[0].sets[2].actualRestSeconds).toBeUndefined();
			expect(result[0].sets[2].extraRestSeconds).toBeUndefined();
			expect(result[0].sets[2].avgRepDuration).toBe(2.8);
		});

		it('should handle missing rest columns gracefully (backward compatibility)', () => {
			const body = `# Exercises

## Squat
Target: 3 × 5-5 | Rest: 180s

| # | kg | reps | rpe | time |
|---|---|---|---|---|
| 1 | 100 | 5 | - | 10:00:00 |
`;

			const result = parseSessionBody(body);

			expect(result).toHaveLength(1);
			expect(result[0].sets[0].actualRestSeconds).toBeUndefined();
			expect(result[0].sets[0].extraRestSeconds).toBeUndefined();
			expect(result[0].sets[0].avgRepDuration).toBeUndefined();
		});
	});

	describe('createSessionBody', () => {
		it('should create session body with rest tracking columns', () => {
			const exercises: SessionExerciseBlock[] = [
				{
					exercise: 'Bench Press',
					targetSets: 4,
					targetRepsMin: 6,
					targetRepsMax: 8,
					restSeconds: 180,
					sets: [
						{
							setNumber: 1,
							weight: 80,
							reps: 8,
							rpe: 7,
							timestamp: '2025-12-26T10:05:00Z',
							completed: true,
							actualRestSeconds: 120,
							extraRestSeconds: 30,
							avgRepDuration: 2.5
						},
						{
							setNumber: 2,
							weight: 80,
							reps: 7,
							rpe: 8,
							timestamp: '2025-12-26T10:10:00Z',
							completed: true,
							actualRestSeconds: 95,
							avgRepDuration: 3.0
						}
					]
				}
			];

			const result = createSessionBody(exercises);

			// Check headers
			expect(result).toContain('| # | kg | reps | rpe | time | rest | +rest | s/rep |');

			// Check first row with all values
			expect(result).toContain('| 1 | 80 | 8 | 7 |');
			expect(result).toContain('120s');
			expect(result).toContain('+30s');
			expect(result).toContain('2.5s');

			// Check second row without extra rest
			expect(result).toContain('| 2 | 80 | 7 | 8 |');
			expect(result).toContain('95s');
			// Note: 3.0 becomes "3s" in output (JavaScript drops trailing .0)
			expect(result).toMatch(/3s\s*\|/);
		});

		it('should output dashes for undefined rest values', () => {
			const exercises: SessionExerciseBlock[] = [
				{
					exercise: 'Squat',
					targetSets: 3,
					targetRepsMin: 5,
					targetRepsMax: 5,
					restSeconds: 180,
					sets: [
						{
							setNumber: 1,
							weight: 100,
							reps: 5,
							timestamp: '2025-12-26T10:00:00Z',
							completed: true
							// No rest tracking data
						}
					]
				}
			];

			const result = createSessionBody(exercises);

			// Should contain dashes for missing values
			expect(result).toMatch(/\| 1 \| 100 \| 5 \| - \|.*\| - \| - \| - \|/);
		});
	});

	describe('roundtrip', () => {
		it('should preserve rest tracking data through parse/create cycle', () => {
			const original: SessionExerciseBlock[] = [
				{
					exercise: 'Deadlift',
					targetSets: 3,
					targetRepsMin: 5,
					targetRepsMax: 5,
					restSeconds: 240,
					sets: [
						{
							setNumber: 1,
							weight: 140,
							reps: 5,
							rpe: 7,
							timestamp: '10:00:00',
							completed: true,
							actualRestSeconds: 250,
							extraRestSeconds: 15,
							avgRepDuration: 4.2
						},
						{
							setNumber: 2,
							weight: 140,
							reps: 5,
							rpe: 8,
							timestamp: '10:05:00',
							completed: true,
							actualRestSeconds: 240,
							avgRepDuration: 4.5
						},
						{
							setNumber: 3,
							weight: 140,
							reps: 4,
							rpe: 9,
							timestamp: '10:10:00',
							completed: true,
							avgRepDuration: 5.0
						}
					]
				}
			];

			const body = createSessionBody(original);
			const parsed = parseSessionBody(body);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].sets).toHaveLength(3);

			// First set
			expect(parsed[0].sets[0].actualRestSeconds).toBe(250);
			expect(parsed[0].sets[0].extraRestSeconds).toBe(15);
			expect(parsed[0].sets[0].avgRepDuration).toBe(4.2);

			// Second set (no extra rest)
			expect(parsed[0].sets[1].actualRestSeconds).toBe(240);
			expect(parsed[0].sets[1].extraRestSeconds).toBeUndefined();
			expect(parsed[0].sets[1].avgRepDuration).toBe(4.5);

			// Third set (no rest data, last set)
			expect(parsed[0].sets[2].actualRestSeconds).toBeUndefined();
			expect(parsed[0].sets[2].extraRestSeconds).toBeUndefined();
			expect(parsed[0].sets[2].avgRepDuration).toBe(5.0);
		});
	});
});
