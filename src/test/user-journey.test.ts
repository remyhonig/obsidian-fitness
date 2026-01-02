import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import { SessionRepository } from '../data/session-repository';
import { SessionStateManager } from '../state/session-state';
import { FitViewModel } from '../viewmodel/fit-viewmodel';
import { ProgramRepository } from '../data/program-repository';
import type { Workout, Question, SessionReview, QuestionAnswer } from '../types';
import { createMockSettings } from './mocks';
import { countTotalCompletedSets, calculateTotalVolume } from '../domain/metrics';

/**
 * End-to-end user journey test
 *
 * Tests the complete workflow:
 * 1. Creating a workout
 * 2. Editing the workout
 * 3. Executing the workout (starting session, logging sets)
 * 4. Answering post-set questionnaires (RPE and muscle engagement)
 * 5. Answering post-workout questionnaire
 * 6. Verifying the session note file contents
 */
describe('User Journey - Complete Workflow', () => {
	let mockVault: ReturnType<typeof createMockVault>;
	let mockApp: App;
	let sessionRepo: SessionRepository;
	let sessionState: SessionStateManager;
	let viewModel: FitViewModel;
	let programRepo: ProgramRepository;
	let settings: ReturnType<typeof createMockSettings>;
	const basePath = 'Fitness';

	// Create comprehensive mock vault with full file system simulation
	function createMockVault() {
		const files = new Map<string, { content: string; file: TFile }>();
		const folders = new Set<string>();

		const getFolderPath = (filePath: string) => {
			const parts = filePath.split('/');
			parts.pop();
			return parts.join('/');
		};

		const getFilesInFolder = (folderPath: string): TFile[] => {
			const result: TFile[] = [];
			for (const [path, { file }] of files.entries()) {
				if (getFolderPath(path) === folderPath) {
					result.push(file);
				}
			}
			return result;
		};

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
			getFileByPath: (path: string) => files.get(path)?.file ?? null,
			getFolderByPath: (path: string) => {
				if (folders.has(path)) {
					const children = getFilesInFolder(path);
					return new TFolder(path, children);
				}
				return null;
			},
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
				} else {
					files.set(file.path, { content, file });
				}
			}),
			read: vi.fn(async (file: TFile) => {
				return files.get(file.path)?.content ?? '';
			}),
			cachedRead: vi.fn(async (file: TFile) => {
				return files.get(file.path)?.content ?? '';
			}),
			createFolder: vi.fn(async (path: string) => {
				folders.add(path);
			}),
			_getContent: (path: string) => files.get(path)?.content,
			_getAllFiles: () => Array.from(files.values()).map(f => f.file),
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

	beforeEach(() => {
		mockVault = createMockVault();
		mockApp = createMockApp(mockVault);
		settings = createMockSettings();
		sessionState = new SessionStateManager(mockApp, settings);
		// Access the internal session repository for verification purposes
		sessionRepo = (sessionState as unknown as { sessionRepo: SessionRepository }).sessionRepo;
		// Create program repository and viewmodel
		programRepo = new ProgramRepository(mockApp, basePath);
		viewModel = new FitViewModel(
			sessionState,
			settings,
			programRepo,
			async () => { /* saveSettings mock */ }
		);
		mockVault._clear();
	});

	describe('Complete user journey', () => {
		it('should handle the full workflow from workout to session completion with questionnaires', async () => {
			// ===== STEP 1: Define a workout (inline in program, defined directly for test) =====
			const workout: Workout = {
				id: 'upper-body-strength',
				name: 'Upper Body Strength',
				description: 'Focus on compound movements',
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
						exercise: 'Barbell Row',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120
					}
				]
			};

			// ===== STEP 2: Start workout session via ViewModel =====
			viewModel.startWorkout(workout);

			// Verify session was created
			let state = viewModel.getState();
			expect(state.session).toBeDefined();
			expect(state.session?.workout).toBe('Upper Body Strength');
			expect(state.session?.exercises).toHaveLength(3);
			expect(state.session?.status).toBe('active');

			// ===== STEP 3: Execute workout - Exercise 1 (Bench Press) =====
			// Exercise 0 is already selected by default
			// Log all 4 sets for Bench Press via ViewModel
			await viewModel.logSet(80, 8);  // Set 1: 80kg x 8 reps
			await viewModel.logSet(80, 7);  // Set 2: 80kg x 7 reps
			await viewModel.logSet(82.5, 6); // Set 3: 82.5kg x 6 reps
			await viewModel.logSet(82.5, 6); // Set 4: 82.5kg x 6 reps

			// Verify sets were logged
			state = viewModel.getState();
			expect(state.session?.exercises[0]?.sets).toHaveLength(4);
			expect(state.session?.exercises[0]?.sets[0]?.weight).toBe(80);
			expect(state.session?.exercises[0]?.sets[0]?.reps).toBe(8);
			expect(state.session?.exercises[0]?.sets[2]?.weight).toBe(82.5);

			// ===== STEP 4: Post-set questionnaire for Bench Press =====
			// Answer RPE (Rate of Perceived Exertion) via ViewModel
			await viewModel.setExerciseRpe(8);

			// Answer muscle engagement via ViewModel
			await viewModel.setMuscleEngagement('yes-clearly');

			// Verify post-set data
			state = viewModel.getState();
			expect(state.session?.exercises[0]?.rpe).toBe(8);
			expect(state.session?.exercises[0]?.muscleEngagement).toBe('yes-clearly');

			// ===== STEP 5: Execute workout - Exercise 2 (Overhead Press) =====
			viewModel.selectExercise(1);
			await viewModel.logSet(50, 10); // Set 1: 50kg x 10 reps
			await viewModel.logSet(50, 9);  // Set 2: 50kg x 9 reps
			await viewModel.logSet(50, 8);  // Set 3: 50kg x 8 reps

			// Post-set questionnaire via ViewModel
			await viewModel.setExerciseRpe(7);
			await viewModel.setMuscleEngagement('moderately');

			// ===== STEP 6: Execute workout - Exercise 3 (Barbell Row) =====
			viewModel.selectExercise(2);
			await viewModel.logSet(70, 12); // Set 1: 70kg x 12 reps
			await viewModel.logSet(70, 10); // Set 2: 70kg x 10 reps
			await viewModel.logSet(70, 9);  // Set 3: 70kg x 9 reps

			// Post-set questionnaire via ViewModel
			await viewModel.setExerciseRpe(6);
			await viewModel.setMuscleEngagement('yes-clearly');

			// ===== STEP 7: Finish the workout via ViewModel =====
			const finishedSession = await viewModel.finishWorkout();

			expect(finishedSession).toBeDefined();
			expect(finishedSession?.status).toBe('completed');
			expect(finishedSession?.endTime).toBeDefined();

			// Verify no more active session
			expect(viewModel.getState().hasActiveSession).toBe(false);

			// ===== STEP 8: Add post-workout questionnaire =====
			const postWorkoutQuestions: Question[] = [
				{
					id: 'energy-level',
					text: 'How was your energy level during this workout?',
					options: [
						{ id: 'high', label: 'High - felt great' },
						{ id: 'normal', label: 'Normal' },
						{ id: 'low', label: 'Low - struggled' }
					]
				},
				{
					id: 'recovery',
					text: 'How well recovered did you feel?',
					options: [
						{ id: 'fully', label: 'Fully recovered' },
						{ id: 'mostly', label: 'Mostly recovered' },
						{ id: 'tired', label: 'Still tired from last session' }
					],
					allowFreeText: true,
					freeTextTrigger: 'tired',
					freeTextMaxLength: 200
				}
			];

			// Simulate answering the questionnaire
			const answers: QuestionAnswer[] = [
				{
					questionId: 'energy-level',
					questionText: 'How was your energy level during this workout?',
					selectedOptionId: 'high',
					selectedOptionLabel: 'High - felt great'
				},
				{
					questionId: 'recovery',
					questionText: 'How well recovered did you feel?',
					selectedOptionId: 'tired',
					selectedOptionLabel: 'Still tired from last session',
					freeText: 'Had trouble sleeping last night'
				}
			];

			const review: SessionReview = {
				programId: 'strength-program',
				completedAt: new Date().toISOString(),
				answers,
				skipped: false
			};

			await sessionRepo.addReview(finishedSession!.id, review);

			// ===== STEP 9: Verify session file contents =====
			const sessionFilePath = `${basePath}/Sessions/${finishedSession!.id}.md`;
			const sessionContent = mockVault._getContent(sessionFilePath);

			expect(sessionContent).toBeDefined();

			// Verify frontmatter
			expect(sessionContent).toContain('status: completed');
			expect(sessionContent).toContain('workout: Upper Body Strength');
			expect(sessionContent).toMatch(/startTime: "\d{4}-\d{2}-\d{2}T/);
			expect(sessionContent).toMatch(/endTime: "\d{4}-\d{2}-\d{2}T/);
			expect(sessionContent).toMatch(/startTimeFormatted: "\d{2}:\d{2}:\d{2}"/);
			expect(sessionContent).toMatch(/endTimeFormatted: "\d{2}:\d{2}:\d{2}"/);

			// Verify Exercise 1: Bench Press
			expect(sessionContent).toContain('## Bench Press');
			expect(sessionContent).toContain('Target: 4 × 6-8 | Rest: 180s');
			expect(sessionContent).toContain('| # | kg | reps | rpe | time |');
			expect(sessionContent).toContain('| 1 | 80 | 8 |');
			expect(sessionContent).toContain('| 2 | 80 | 7 |');
			expect(sessionContent).toContain('| 3 | 82.5 | 6 |');
			expect(sessionContent).toContain('| 4 | 82.5 | 6 |');

			// Verify Exercise 2: Overhead Press
			expect(sessionContent).toContain('## Overhead Press');
			expect(sessionContent).toContain('Target: 3 × 8-10 | Rest: 120s');
			expect(sessionContent).toContain('| 1 | 50 | 10 |');
			expect(sessionContent).toContain('| 2 | 50 | 9 |');
			expect(sessionContent).toContain('| 3 | 50 | 8 |');

			// Verify Exercise 3: Barbell Row
			expect(sessionContent).toContain('## Barbell Row');
			expect(sessionContent).toContain('Target: 3 × 8-12 | Rest: 120s');
			expect(sessionContent).toContain('| 1 | 70 | 12 |');
			expect(sessionContent).toContain('| 2 | 70 | 10 |');
			expect(sessionContent).toContain('| 3 | 70 | 9 |');

			// Verify muscle engagement for all exercises
			// Count occurrences - should have 3 total (one per exercise)
			const muscleEngagementMatches = sessionContent.match(/\*\*Did you feel the correct muscle working\?\*\*/g);
			expect(muscleEngagementMatches).toHaveLength(3);

			// Verify post-workout review section
			expect(sessionContent).toContain('# Review');
			expect(sessionContent).toContain('Program: [[Programs/strength-program]]');
			expect(sessionContent).toMatch(/Completed: \d{4}-\d{2}-\d{2}T/);

			// Verify questionnaire answers
			expect(sessionContent).toContain('**How was your energy level during this workout?** High - felt great');
			expect(sessionContent).toContain('**How well recovered did you feel?** Still tired from last session (Had trouble sleeping last night)');

			// ===== STEP 10: Verify session can be retrieved and parsed correctly =====
			const retrievedSession = await sessionRepo.get(finishedSession!.id);

			expect(retrievedSession).toBeDefined();
			expect(retrievedSession?.status).toBe('completed');
			expect(retrievedSession?.workout).toBe('Upper Body Strength');
			expect(retrievedSession?.exercises).toHaveLength(3);

			// Verify all sets are preserved
			expect(retrievedSession?.exercises[0]?.sets).toHaveLength(4);
			expect(retrievedSession?.exercises[1]?.sets).toHaveLength(3);
			expect(retrievedSession?.exercises[2]?.sets).toHaveLength(3);

			// Verify post-set data is preserved
			// Note: RPE is stored per-set in the file format, not per-exercise,
			// so exercise-level RPE isn't persisted when reading back from file.
			// Muscle engagement is stored as human-readable labels when persisted
			expect(retrievedSession?.exercises[0]?.muscleEngagement).toBe('Yes, clearly');
			expect(retrievedSession?.exercises[1]?.muscleEngagement).toBe('Moderately');
			expect(retrievedSession?.exercises[2]?.muscleEngagement).toBe('Yes, clearly');

			// Verify review is preserved
			expect(retrievedSession?.review).toBeDefined();
			expect(retrievedSession?.review?.programId).toBe('strength-program');
			expect(retrievedSession?.review?.answers).toHaveLength(2);
			expect(retrievedSession?.review?.answers[0]?.selectedOptionLabel).toBe('High - felt great');
			expect(retrievedSession?.review?.answers[1]?.freeText).toBe('Had trouble sleeping last night');

			// ===== STEP 11: Verify session statistics =====
			const totalSets = countTotalCompletedSets(retrievedSession!);
			expect(totalSets).toBe(10); // 4 + 3 + 3

			const totalVolume = calculateTotalVolume(retrievedSession!);
			// Bench: (80*8 + 80*7 + 82.5*6 + 82.5*6) = 640 + 560 + 495 + 495 = 2190
			// OHP: (50*10 + 50*9 + 50*8) = 500 + 450 + 400 = 1350
			// Row: (70*12 + 70*10 + 70*9) = 840 + 700 + 630 = 2170
			// Total: 2190 + 1350 + 2170 = 5710
			expect(totalVolume).toBe(5710);
		});

		it('should handle skipped post-workout questionnaire', async () => {
			// Define a simple workout
			const workout: Workout = {
				id: 'quick-workout',
				name: 'Quick Workout',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 180
					}
				]
			};

			// Start workout via ViewModel
			viewModel.startWorkout(workout);

			// Log sets via ViewModel
			await viewModel.logSet(100, 5);
			await viewModel.logSet(100, 5);
			await viewModel.logSet(100, 5);

			// Finish session via ViewModel
			const finishedSession = await viewModel.finishWorkout();

			// Skip questionnaire (still uses sessionRepo as this is repository-level)
			const review: SessionReview = {
				programId: 'test-program',
				completedAt: new Date().toISOString(),
				answers: [],
				skipped: true
			};

			await sessionRepo.addReview(finishedSession!.id, review);

			// Verify session file
			const sessionContent = mockVault._getContent(`${basePath}/Sessions/${finishedSession!.id}.md`);
			expect(sessionContent).toContain('# Review');
			expect(sessionContent).toContain('Program: [[Programs/test-program]]');
			expect(sessionContent).toContain('Skipped: yes');
		});

		it('should handle workout without post-workout questionnaire', async () => {
			// Define workout
			const workout: Workout = {
				id: 'no-questions-workout',
				name: 'No Questions Workout',
				exercises: [
					{
						exercise: 'Deadlift',
						targetSets: 1,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 300
					}
				]
			};

			// Start workout via ViewModel
			viewModel.startWorkout(workout);

			// Log set via ViewModel
			await viewModel.logSet(140, 5);

			// Add post-set data via ViewModel
			await viewModel.setExerciseRpe(9);
			await viewModel.setMuscleEngagement('yes-clearly');

			// Finish session without review via ViewModel
			const finishedSession = await viewModel.finishWorkout();

			// Verify session file doesn't have review section
			const sessionContent = mockVault._getContent(`${basePath}/Sessions/${finishedSession!.id}.md`);
			expect(sessionContent).toBeDefined();
			expect(sessionContent).toContain('## Deadlift');
			expect(sessionContent).toContain('| 1 | 140 | 5 |');
			expect(sessionContent).toContain('**Did you feel the correct muscle working?** Yes, clearly');

			// Should not have review section
			expect(sessionContent).not.toContain('# Review');
		});

		it('should track rest times and extensions between sets via ViewModel', async () => {
			// Use fake timers for this test since we need to control time for countdown
			vi.useFakeTimers();

			// Define workout with specific rest times
			const workout: Workout = {
				id: 'rest-tracking-workout',
				name: 'Rest Tracking Workout',
				exercises: [
					{
						exercise: 'Squat',
						targetSets: 3,
						targetRepsMin: 5,
						targetRepsMax: 5,
						restSeconds: 180
					}
				]
			};

			// ===== Start workout via ViewModel =====
			viewModel.startWorkout(workout);
			expect(viewModel.getState().hasActiveSession).toBe(true);

			// ===== Set 1: Log first set via ViewModel =====
			// Mark set as started (this starts a 5-second countdown for first set)
			viewModel.markSetStart();
			// Advance past the 5-second countdown so set timer starts
			vi.advanceTimersByTime(6000);
			// Simulate some set duration
			vi.advanceTimersByTime(2000);
			// Set weight and reps, then log the set
			viewModel.setWeight(100);
			viewModel.setReps(5);
			await viewModel.logSet();

			// Rest timer should auto-start after logging
			expect(viewModel.getState().restTimer).not.toBeNull();

			// Add extra rest time via ViewModel (simulates user pressing +15s button)
			viewModel.addRestTime(15);
			viewModel.addRestTime(15); // Total +30s extra

			// ===== Set 2: Log second set (records rest on first set) =====
			// Second set doesn't have countdown (since there's already a completed set)
			viewModel.markSetStart();
			vi.advanceTimersByTime(2000);
			await viewModel.logSet(100, 5);

			// Verify first set now has rest data recorded
			let state = viewModel.getState();
			const set0 = state.session?.exercises[0]?.sets[0];
			expect(set0?.actualRestSeconds).toBeDefined();
			expect(set0?.extraRestSeconds).toBe(30);
			expect(set0?.avgRepDuration).toBeDefined();

			// Add some extra rest for second set
			viewModel.addRestTime(15);

			// ===== Set 3: Log third set (records rest on second set) =====
			viewModel.markSetStart();
			vi.advanceTimersByTime(2000);
			await viewModel.logSet(100, 5);

			// Verify second set has rest data
			state = viewModel.getState();
			const set1 = state.session?.exercises[0]?.sets[1];
			expect(set1?.actualRestSeconds).toBeDefined();
			expect(set1?.extraRestSeconds).toBe(15);
			expect(set1?.avgRepDuration).toBeDefined();

			// Third set has no rest after it (last set)
			const set2 = state.session?.exercises[0]?.sets[2];
			expect(set2?.actualRestSeconds).toBeUndefined();
			expect(set2?.extraRestSeconds).toBeUndefined();
			// But should still have avg rep duration
			expect(set2?.avgRepDuration).toBeDefined();

			// ===== Finish and verify persistence via ViewModel =====
			const finishedSession = await viewModel.finishWorkout();
			expect(finishedSession).not.toBeNull();
			const sessionContent = mockVault._getContent(`${basePath}/Sessions/${finishedSession!.id}.md`);

			// Verify new columns in table header
			expect(sessionContent).toContain('| # | kg | reps | rpe | time | rest | +rest | s/rep |');

			// Verify first set has rest extension recorded
			expect(sessionContent).toContain('+30s');

			// Verify second set has rest extension recorded
			expect(sessionContent).toContain('+15s');

			// ===== Verify data survives roundtrip =====
			const retrievedSession = await sessionRepo.get(finishedSession!.id);

			expect(retrievedSession?.exercises[0]?.sets[0]?.extraRestSeconds).toBe(30);
			expect(retrievedSession?.exercises[0]?.sets[0]?.avgRepDuration).toBeDefined();
			expect(retrievedSession?.exercises[0]?.sets[1]?.extraRestSeconds).toBe(15);
			expect(retrievedSession?.exercises[0]?.sets[2]?.avgRepDuration).toBeDefined();

			// Restore real timers
			vi.useRealTimers();
		});

		it('should handle editing sets during workout', async () => {
			// Define workout
			const workout: Workout = {
				id: 'edit-test-workout',
				name: 'Edit Test Workout',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 120
					}
				]
			};

			// Start workout via ViewModel
			viewModel.startWorkout(workout);

			// Log sets via ViewModel
			await viewModel.logSet(60, 10);
			await viewModel.logSet(60, 9);
			await viewModel.logSet(60, 8);

			// Edit the second set via ViewModel
			await viewModel.editSet(1, { reps: 10 }); // Change from 9 to 10 reps

			// Verify edit
			let state = viewModel.getState();
			expect(state.session?.exercises[0]?.sets[1]?.reps).toBe(10);

			// Delete the last set via ViewModel
			await viewModel.deleteSet(2);

			// Verify deletion
			state = viewModel.getState();
			expect(state.session?.exercises[0]?.sets).toHaveLength(2);

			// Log a new set to replace the deleted one via ViewModel
			await viewModel.logSet(62.5, 8);

			// Finish and verify via ViewModel
			const finishedSession = await viewModel.finishWorkout();
			const sessionContent = mockVault._getContent(`${basePath}/Sessions/${finishedSession!.id}.md`);

			expect(sessionContent).toContain('| 1 | 60 | 10 |');
			expect(sessionContent).toContain('| 2 | 60 | 10 |'); // Edited set
			expect(sessionContent).toContain('| 3 | 62.5 | 8 |'); // Replacement set
		});
	});
});
