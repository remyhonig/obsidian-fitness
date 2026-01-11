import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { App } from 'obsidian';
import { FitnessDomainAdapter } from './fitness-domain-adapter';

// Minimal mock of Obsidian App - just enough for the adapter to initialize
function createMockApp(): App {
	return {
		vault: {
			adapter: {
				exists: vi.fn().mockResolvedValue(false),
				read: vi.fn().mockResolvedValue(''),
				write: vi.fn().mockResolvedValue(undefined),
			},
			getAbstractFileByPath: vi.fn().mockReturnValue(null),
			create: vi.fn().mockResolvedValue(null),
			modify: vi.fn().mockResolvedValue(undefined),
			read: vi.fn().mockResolvedValue(''),
			cachedRead: vi.fn().mockResolvedValue(''),
			createFolder: vi.fn().mockResolvedValue(undefined),
			getFolderByPath: vi.fn().mockReturnValue(null),
			getFileByPath: vi.fn().mockReturnValue(null),
		},
		workspace: {},
		fileManager: {},
	} as unknown as App;
}

// Simple program with explicit RPE values
const PROGRAM_WITH_RPE_8 = `# Test Hypertrophy Program

A simple program for testing RPE handling.

---

# Progression

## Training Maxes

- Side Lateral Raise TM: 10kg
- Face Pull TM: 15kg

---

# Schedule

## Cycle Pattern

- Hypertrophy A, recovery 36h

---

# Workouts

## Hypertrophy A

Upper body hypertrophy day.

- Side Lateral Raise: 4x12-15 @ 100% TM RPE 8, rest 60s "Slight forward lean"
- Face Pull: 4x15-20 @ 100% TM RPE 8, rest 60s "Pull to forehead"
`;

// Program with different RPE values for comparison
const PROGRAM_WITH_MIXED_RPE = `# Test Program with Mixed RPE

A program with different RPE targets.

---

# Progression

## Training Maxes

- Side Lateral Raise TM: 8kg
- Face Pull TM: 6kg

---

# Schedule

## Cycle Pattern

- Support Day, recovery 24h

---

# Workouts

## Support Day

Light volume day.

- Side Lateral Raise: 3x15 @ 80% TM RPE 7, rest 45s "Light weight"
- Face Pull: 3x15 @ 75% TM RPE 7, rest 45s "Blood flow"
`;

describe('FitnessDomainAdapter', () => {
	let adapter: FitnessDomainAdapter;
	let mockApp: App;

	beforeEach(() => {
		mockApp = createMockApp();
		adapter = new FitnessDomainAdapter(mockApp, 'Fitness');
	});

	describe('RPE handling', () => {
		it('should preserve RPE 8 from program when starting workout', async () => {
			// Load a program with RPE 8 exercises
			await adapter.loadProgramFromString(PROGRAM_WITH_RPE_8);

			// Start the workout
			const state = adapter.dispatch({ type: 'start_workout', workoutName: 'Hypertrophy A' });

			// Verify RPE is 8 for the first exercise (Side Lateral Raise)
			expect(state.exercises[0].exercise).toBe('Side Lateral Raise');
			expect(state.exercises[0].targetRPE).toBe(8);

			// Verify RPE is 8 for the second exercise (Face Pull)
			expect(state.exercises[1].exercise).toBe('Face Pull');
			expect(state.exercises[1].targetRPE).toBe(8);
		});

		it('should preserve RPE 7 from program when starting workout', async () => {
			// Load a program with RPE 7 exercises
			await adapter.loadProgramFromString(PROGRAM_WITH_MIXED_RPE);

			// Start the workout
			const state = adapter.dispatch({ type: 'start_workout', workoutName: 'Support Day' });

			// Verify RPE is 7 for the first exercise
			expect(state.exercises[0].exercise).toBe('Side Lateral Raise');
			expect(state.exercises[0].targetRPE).toBe(7);

			// Verify RPE is 7 for the second exercise
			expect(state.exercises[1].exercise).toBe('Face Pull');
			expect(state.exercises[1].targetRPE).toBe(7);
		});

		it('should never fall back to hardcoded RPE 7', async () => {
			// Load a program with RPE 8
			await adapter.loadProgramFromString(PROGRAM_WITH_RPE_8);

			// Start the workout
			const state = adapter.dispatch({ type: 'start_workout', workoutName: 'Hypertrophy A' });

			// Check that none of the exercises have RPE 7 (would indicate fallback)
			for (const exercise of state.exercises) {
				// RPE should be exactly what's defined in the program (8), not the fallback (7)
				expect(exercise.targetRPE).not.toBe(7);
				expect(exercise.targetRPE).toBe(8);
			}
		});
	});

	describe('error handling', () => {
		it('should throw error when starting workout without loading program', () => {
			// Don't load any program

			// Trying to start a workout should throw
			expect(() => {
				adapter.dispatch({ type: 'start_workout', workoutName: 'Nonexistent Workout' });
			}).toThrow();
		});

		it('should throw error when starting nonexistent workout', async () => {
			// Load a valid program
			await adapter.loadProgramFromString(PROGRAM_WITH_RPE_8);

			// Trying to start a workout that doesn't exist should throw
			expect(() => {
				adapter.dispatch({ type: 'start_workout', workoutName: 'Nonexistent Workout' });
			}).toThrow();
		});
	});
});
