import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HomeScreen } from './screens/home-screen';
import { TemplatePickerScreen } from './screens/template-picker';
import { SessionScreen } from './screens/session-screen';
import { ExerciseScreen } from './screens/exercise-screen';
import { FinishScreen } from './screens/finish-screen';
import { HistoryScreen } from './screens/history-screen';
import { TemplateEditorScreen } from './screens/template-editor';
import { ExerciseLibraryScreen } from './screens/exercise-library';
import type { ScreenContext, Screen } from '../views/fit-view';
import type { Session, Template, Exercise, SessionExercise } from '../types';
import { click, findButton, flushPromises } from '../test/mocks';

/**
 * Integration tests for complete user journeys
 */

// Helper to create a realistic mock context with shared state
function createIntegrationContext(): {
	ctx: ScreenContext;
	state: {
		session: Session | null;
		templates: Template[];
		exercises: Exercise[];
		completedSessions: Session[];
	};
} {
	const state = {
		session: null as Session | null,
		templates: [
			{
				id: 'push-day',
				name: 'Push Day',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120
					},
					{
						exercise: 'Overhead Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 10,
						restSeconds: 90
					}
				]
			}
		] as Template[],
		exercises: [
			{
				id: 'bench-press',
				name: 'Bench Press',
				category: 'Chest',
				equipment: 'Barbell',
				muscleGroups: ['Chest', 'Triceps'],
				defaultWeight: 60,
				weightIncrement: 2.5
			},
			{
				id: 'overhead-press',
				name: 'Overhead Press',
				category: 'Shoulders',
				equipment: 'Barbell',
				muscleGroups: ['Shoulders', 'Triceps'],
				defaultWeight: 40,
				weightIncrement: 2.5
			},
			{
				id: 'squat',
				name: 'Squat',
				category: 'Legs',
				equipment: 'Barbell',
				muscleGroups: ['Quadriceps', 'Glutes'],
				defaultWeight: 80,
				weightIncrement: 5
			}
		] as Exercise[],
		completedSessions: [] as Session[]
	};

	// Track subscriptions
	const listeners = new Set<() => void>();

	const notifyListeners = () => {
		const listenersCopy = [...listeners];
		for (const listener of listenersCopy) {
			listener();
		}
	};

	const ctx: ScreenContext = {
		view: {
			app: {} as never,
			navigateTo: vi.fn(),
			goBack: vi.fn(),
			refresh: vi.fn()
		} as never,
		plugin: {
			settings: {
				basePath: 'Fitness',
				weightUnit: 'kg',
				defaultRestSeconds: 120,
				autoStartRestTimer: true,
				weightIncrementsKg: [10, 2.5, 0.5, 0.25],
				weightIncrementsLbs: [45, 10, 5, 2.5]
			}
		} as never,
		sessionState: {
			hasActiveSession: vi.fn(() => state.session !== null),
			getSession: vi.fn(() => state.session),
			getCurrentExercise: vi.fn(() => {
				if (!state.session || state.session.exercises.length === 0) return null;
				return state.session.exercises[0] ?? null;
			}),
			getCurrentExerciseIndex: vi.fn(() => 0),
			setCurrentExerciseIndex: vi.fn(),
			getExercise: vi.fn((index: number) => state.session?.exercises[index] ?? null),
			startFromTemplate: vi.fn((template: Template) => {
				const now = new Date();
				state.session = {
					id: 'active',
					date: now.toISOString().split('T')[0] ?? '',
					startTime: now.toISOString(),
					template: template.name,
					status: 'active',
					exercises: template.exercises.map(te => ({
						exercise: te.exercise,
						targetSets: te.targetSets,
						targetRepsMin: te.targetRepsMin,
						targetRepsMax: te.targetRepsMax,
						restSeconds: te.restSeconds,
						sets: []
					}))
				};
				notifyListeners();
			}),
			startEmpty: vi.fn(() => {
				const now = new Date();
				state.session = {
					id: 'active',
					date: now.toISOString().split('T')[0] ?? '',
					startTime: now.toISOString(),
					status: 'active',
					exercises: []
				};
				notifyListeners();
			}),
			addExercise: vi.fn((name: string) => {
				if (!state.session) return;
				state.session.exercises.push({
					exercise: name,
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 12,
					restSeconds: 120,
					sets: []
				});
				notifyListeners();
			}),
			logSet: vi.fn((exerciseIndex: number, weight: number, reps: number) => {
				if (!state.session) return;
				const exercise = state.session.exercises[exerciseIndex];
				if (!exercise) return;
				exercise.sets.push({
					weight,
					reps,
					completed: true,
					timestamp: new Date().toISOString()
				});
				notifyListeners();
			}),
			editSet: vi.fn(),
			deleteSet: vi.fn(),
			getLastSet: vi.fn((exerciseIndex: number) => {
				if (!state.session) return null;
				const exercise = state.session.exercises[exerciseIndex];
				if (!exercise || exercise.sets.length === 0) return null;
				return exercise.sets[exercise.sets.length - 1] ?? null;
			}),
			finishSession: vi.fn(async () => {
				if (!state.session) return null;
				const finishedSession: Session = {
					...state.session,
					id: `${state.session.date}-${state.session.template?.toLowerCase().replace(/\s+/g, '-') ?? 'workout'}`,
					status: 'completed',
					endTime: new Date().toISOString()
				};
				state.completedSessions.unshift(finishedSession);
				state.session = null;
				notifyListeners();
				return finishedSession;
			}),
			discardSession: vi.fn(async () => {
				state.session = null;
				notifyListeners();
			}),
			subscribe: vi.fn((listener: () => void) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			}),
			isRestTimerActive: vi.fn(() => false),
			getRestTimeRemaining: vi.fn(() => 0),
			getRestTimer: vi.fn(() => null),
			startRestTimer: vi.fn(),
			cancelRestTimer: vi.fn(),
			addRestTime: vi.fn(),
			removeExercise: vi.fn(),
			reorderExercises: vi.fn()
		} as never,
		exerciseRepo: {
			list: vi.fn(async () => state.exercises),
			get: vi.fn(async (id: string) => state.exercises.find(e => e.id === id) ?? null),
			getByName: vi.fn(async (name: string) => state.exercises.find(e => e.name.toLowerCase() === name.toLowerCase()) ?? null),
			save: vi.fn(async (exercise: Exercise) => {
				const index = state.exercises.findIndex(e => e.id === exercise.id);
				if (index >= 0) {
					state.exercises[index] = exercise;
				} else {
					state.exercises.push(exercise);
				}
			}),
			create: vi.fn(async (exercise: Omit<Exercise, 'id'>) => {
				const newExercise: Exercise = {
					...exercise,
					id: exercise.name.toLowerCase().replace(/\s+/g, '-')
				} as Exercise;
				state.exercises.push(newExercise);
				return newExercise;
			}),
			delete: vi.fn(async (id: string) => {
				state.exercises = state.exercises.filter(e => e.id !== id);
			})
		} as never,
		templateRepo: {
			list: vi.fn(async () => state.templates),
			get: vi.fn(async (id: string) => state.templates.find(t => t.id === id) ?? null),
			getByName: vi.fn(async (name: string) => state.templates.find(t => t.name === name) ?? null),
			create: vi.fn(async (template: Omit<Template, 'id'>) => {
				const newTemplate: Template = {
					...template,
					id: template.name.toLowerCase().replace(/\s+/g, '-')
				};
				state.templates.push(newTemplate);
				return newTemplate;
			}),
			update: vi.fn(async (id: string, updates: Partial<Template>) => {
				const index = state.templates.findIndex(t => t.id === id);
				if (index >= 0) {
					state.templates[index] = { ...state.templates[index]!, ...updates };
				}
			}),
			delete: vi.fn(async (id: string) => {
				state.templates = state.templates.filter(t => t.id !== id);
			}),
			duplicate: vi.fn(async (id: string, newName: string) => {
				const existing = state.templates.find(t => t.id === id);
				if (!existing) throw new Error('Template not found');
				const newTemplate: Template = {
					...existing,
					id: newName.toLowerCase().replace(/\s+/g, '-'),
					name: newName
				};
				state.templates.push(newTemplate);
				return newTemplate;
			}),
			search: vi.fn(async (query: string) => {
				const lowerQuery = query.toLowerCase();
				return state.templates.filter(t =>
					t.name.toLowerCase().includes(lowerQuery) ||
					t.description?.toLowerCase().includes(lowerQuery)
				);
			})
		} as never,
		sessionRepo: {
			list: vi.fn(async () => state.completedSessions),
			get: vi.fn(async (id: string) => state.completedSessions.find(s => s.id === id) ?? null),
			getRecent: vi.fn(async (limit: number) => state.completedSessions.slice(0, limit)),
			countCompletedSets: vi.fn((session: Session) => {
				return session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
			}),
			calculateVolume: vi.fn((session: Session) => {
				return session.exercises.reduce((sum, ex) =>
					sum + ex.sets.reduce((setSum, s) => setSum + (s.completed ? s.weight * s.reps : 0), 0), 0);
			})
		} as never
	};

	return { ctx, state };
}

describe('User Journey: Complete Workout Flow', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should complete a full workout from template selection to finish', async () => {
		const { ctx, state } = createIntegrationContext();
		let currentScreen: Screen;

		// Step 1: Start on Home Screen with no active session
		currentScreen = new HomeScreen(container, ctx);
		currentScreen.render();
		await flushPromises();

		// Verify no active session indicator
		expect(state.session).toBeNull();
		expect(container.querySelector('.fit-active-session-card')).toBeNull();

		// Find and click "Start workout"
		const startButton = findButton(container, 'Start workout');
		expect(startButton).not.toBeNull();
		click(startButton!);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('template-picker');
		currentScreen.destroy();
		container.innerHTML = '';

		// Step 2: Template Picker - select a template
		currentScreen = new TemplatePickerScreen(container, ctx);
		currentScreen.render();
		await flushPromises();

		// Find and click the Push Day template
		const templateCard = container.querySelector('.fit-template-card');
		expect(templateCard).not.toBeNull();
		click(templateCard as HTMLElement);
		await flushPromises();

		// Verify session was started
		expect(state.session).not.toBeNull();
		expect(state.session?.template).toBe('Push Day');
		expect(state.session?.exercises.length).toBe(2);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		currentScreen.destroy();
		container.innerHTML = '';

		// Step 3: Session Screen - view exercises
		currentScreen = new SessionScreen(container, ctx);
		currentScreen.render();
		await flushPromises();

		// Verify exercises are shown
		const exerciseCards = container.querySelectorAll('.fit-exercise-card');
		expect(exerciseCards.length).toBe(2);

		// Click first exercise to log sets
		click(exerciseCards[0] as HTMLElement);
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('exercise', { exerciseIndex: 0 });
		currentScreen.destroy();
		container.innerHTML = '';

		// Step 4: Exercise Screen - log a set
		currentScreen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		currentScreen.render();
		await flushPromises();

		// Find and click "Complete set"
		const completeButton = findButton(container, 'Complete set');
		expect(completeButton).not.toBeNull();
		click(completeButton!);

		// Verify set was logged
		expect(ctx.sessionState.logSet).toHaveBeenCalled();
		expect(state.session?.exercises[0]?.sets.length).toBe(1);

		// Go back to session screen
		const backButton = container.querySelector('.fit-button-back');
		expect(backButton).not.toBeNull();
		click(backButton as HTMLElement);
		currentScreen.destroy();
		container.innerHTML = '';

		// Step 5: Session Screen - finish workout
		currentScreen = new SessionScreen(container, ctx);
		currentScreen.render();
		await flushPromises();

		const finishButton = findButton(container, 'Finish workout');
		expect(finishButton).not.toBeNull();
		click(finishButton!);
		await flushPromises();

		// Verify session was finished
		expect(state.session).toBeNull();
		expect(state.completedSessions.length).toBe(1);
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('finish', expect.any(Object));
		currentScreen.destroy();
		container.innerHTML = '';

		// Step 6: Finish Screen - view summary
		const finishedSession = state.completedSessions[0]!;
		currentScreen = new FinishScreen(container, ctx, { sessionId: finishedSession.id });
		currentScreen.render();
		await flushPromises();

		// Verify finish screen shows summary
		expect(container.querySelector('.fit-finish-title')?.textContent).toBe('Workout complete!');

		// Click Done to go home
		const doneButton = findButton(container, 'Done');
		expect(doneButton).not.toBeNull();
		click(doneButton!);
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		currentScreen.destroy();
		container.innerHTML = '';

		// Step 7: Home Screen - verify no active session
		currentScreen = new HomeScreen(container, ctx);
		currentScreen.render();
		await flushPromises();

		// Should show "Start workout" not "Continue workout"
		expect(ctx.sessionState.hasActiveSession()).toBe(false);
		const startNewButton = findButton(container, 'Start workout');
		expect(startNewButton).not.toBeNull();
		expect(findButton(container, 'Continue workout')).toBeNull();

		// Verify completed session appears in recent workouts
		expect(container.querySelector('.fit-session-list')).not.toBeNull();

		currentScreen.destroy();
	});

	it('should allow continuing an in-progress workout', async () => {
		const { ctx, state } = createIntegrationContext();

		// Start a session first
		ctx.sessionState.startFromTemplate(state.templates[0]!);
		expect(state.session).not.toBeNull();

		// Home screen should show "Continue workout"
		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Verify active session card is shown
		const activeCard = container.querySelector('.fit-active-session-card');
		expect(activeCard).not.toBeNull();
		expect(activeCard?.textContent).toContain('In progress');

		// Should show "Continue workout" button
		const continueButton = findButton(container, 'Continue workout');
		expect(continueButton).not.toBeNull();

		click(continueButton!);
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');

		screen.destroy();
	});

	it('should allow discarding a workout', async () => {
		const { ctx, state } = createIntegrationContext();

		// Start a session
		ctx.sessionState.startFromTemplate(state.templates[0]!);
		expect(state.session).not.toBeNull();

		// Go to session screen and click back (which might discard)
		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Click back button
		const backButton = container.querySelector('.fit-button-back');
		click(backButton as HTMLElement);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');

		screen.destroy();
	});

	it('should log multiple sets correctly', async () => {
		const { ctx, state } = createIntegrationContext();

		// Start a session
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		// Go to exercise screen
		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		const completeButton = findButton(container, 'Complete set');

		// Log 3 sets
		click(completeButton!);
		screen.render();
		await flushPromises();

		click(completeButton!);
		screen.render();
		await flushPromises();

		click(completeButton!);
		screen.render();
		await flushPromises();

		// Verify 3 sets logged
		expect(state.session?.exercises[0]?.sets.length).toBe(3);

		screen.destroy();
	});
});

describe('User Journey: Exercise Library Management', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display exercises in the library', async () => {
		const { ctx, state } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Should show all exercises
		const exerciseCards = container.querySelectorAll('.fit-library-exercise-row');
		expect(exerciseCards.length).toBe(3);

		screen.destroy();
	});

	it('should allow creating a new exercise', async () => {
		const { ctx, state } = createIntegrationContext();
		const initialCount = state.exercises.length;

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Click add button
		const addButton = findButton(container, 'Add exercise');
		expect(addButton).not.toBeNull();
		click(addButton!);
		await flushPromises();

		// Form should be visible
		const form = container.querySelector('.fit-form');
		expect(form).not.toBeNull();

		// Fill in the form
		const nameInput = container.querySelector('.fit-form-input') as HTMLInputElement;
		expect(nameInput).not.toBeNull();
		nameInput.value = 'Deadlift';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Save the exercise
		const saveButton = findButton(container, 'Save');
		expect(saveButton).not.toBeNull();
		click(saveButton!);
		await flushPromises();

		// Should have created the exercise
		expect(ctx.exerciseRepo.create).toHaveBeenCalled();

		screen.destroy();
	});
});

describe('User Journey: Template Management', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display templates in the picker', async () => {
		const { ctx, state } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Should show templates
		const templateCards = container.querySelectorAll('.fit-template-card');
		expect(templateCards.length).toBe(1); // Only one template in our test data

		// Template card should show name
		expect(templateCards[0]?.textContent).toContain('Push Day');

		screen.destroy();
	});

	it('should allow starting an empty workout', async () => {
		const { ctx, state } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Click "Start empty workout"
		const emptyButton = findButton(container, 'Start empty workout');
		if (emptyButton) {
			click(emptyButton);
			await flushPromises();

			expect(ctx.sessionState.startEmpty).toHaveBeenCalled();
		}

		screen.destroy();
	});
});

describe('User Journey: History Browsing', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display completed sessions in history', async () => {
		const { ctx, state } = createIntegrationContext();

		// Add some completed sessions
		state.completedSessions = [
			{
				id: '2025-12-25-push-day',
				date: '2025-12-25',
				startTime: '2025-12-25T10:00:00Z',
				endTime: '2025-12-25T11:00:00Z',
				template: 'Push Day',
				status: 'completed',
				exercises: [
					{
						exercise: 'Bench Press',
						targetSets: 3,
						targetRepsMin: 8,
						targetRepsMax: 12,
						restSeconds: 120,
						sets: [
							{ weight: 80, reps: 8, completed: true, timestamp: '2025-12-25T10:05:00Z' },
							{ weight: 80, reps: 7, completed: true, timestamp: '2025-12-25T10:10:00Z' }
						]
					}
				]
			},
			{
				id: '2025-12-24-pull-day',
				date: '2025-12-24',
				startTime: '2025-12-24T10:00:00Z',
				endTime: '2025-12-24T10:45:00Z',
				template: 'Pull Day',
				status: 'completed',
				exercises: []
			}
		];

		const screen = new HistoryScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Should show session cards
		const sessionCards = container.querySelectorAll('.fit-session-card');
		expect(sessionCards.length).toBe(2);

		screen.destroy();
	});

	it('should show empty state when no history', async () => {
		const { ctx, state } = createIntegrationContext();
		state.completedSessions = [];

		const screen = new HistoryScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Should show empty state
		const emptyState = container.querySelector('.fit-empty-state');
		expect(emptyState).not.toBeNull();

		screen.destroy();
	});
});

describe('UI Elements: Template Editor', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should create a new template with name and exercises', async () => {
		const { ctx, state } = createIntegrationContext();
		const initialCount = state.templates.length;

		const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		// Fill in template name
		const nameInput = container.querySelector('.fit-form-input') as HTMLInputElement;
		expect(nameInput).not.toBeNull();
		nameInput.value = 'Pull Day';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Add an exercise
		const addExerciseBtn = findButton(container, 'Add exercise');
		expect(addExerciseBtn).not.toBeNull();
		click(addExerciseBtn!);
		await flushPromises();

		// Fill in exercise name (now in autocomplete)
		const autocomplete = container.querySelector('.fit-autocomplete');
		expect(autocomplete).not.toBeNull();
		const exerciseNameInput = autocomplete?.querySelector('input') as HTMLInputElement;
		expect(exerciseNameInput).not.toBeNull();
		exerciseNameInput.value = 'Pull-ups';
		exerciseNameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Save template
		const saveBtn = findButton(container, 'Save template');
		expect(saveBtn).not.toBeNull();
		click(saveBtn!);
		await flushPromises();

		// Verify template was created
		expect(ctx.templateRepo.create).toHaveBeenCalled();
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');

		screen.destroy();
	});

	it('should not save template without name', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		// Try to save without entering a name
		const saveBtn = findButton(container, 'Save template');
		click(saveBtn!);
		await flushPromises();

		// Should not have created template
		expect(ctx.templateRepo.create).not.toHaveBeenCalled();
		expect(ctx.view.navigateTo).not.toHaveBeenCalledWith('home');

		screen.destroy();
	});

	it('should add multiple exercises', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		// Add 3 exercises
		const addExerciseBtn = findButton(container, 'Add exercise');
		click(addExerciseBtn!);
		await flushPromises();
		click(addExerciseBtn!);
		await flushPromises();
		click(addExerciseBtn!);
		await flushPromises();

		// Should have 3 exercise rows
		const exerciseRows = container.querySelectorAll('.fit-template-exercise-row');
		expect(exerciseRows.length).toBe(3);

		screen.destroy();
	});

	it('should remove an exercise', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		// Add 2 exercises
		const addExerciseBtn = findButton(container, 'Add exercise');
		click(addExerciseBtn!);
		await flushPromises();
		click(addExerciseBtn!);
		await flushPromises();

		expect(container.querySelectorAll('.fit-template-exercise-row').length).toBe(2);

		// Delete one exercise
		const deleteBtn = container.querySelector('.fit-exercise-delete');
		expect(deleteBtn).not.toBeNull();
		click(deleteBtn as HTMLElement);
		await flushPromises();

		// Should have 1 exercise row
		expect(container.querySelectorAll('.fit-template-exercise-row').length).toBe(1);

		screen.destroy();
	});

	it('should edit exercise sets input', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		// Add exercise
		const addExerciseBtn = findButton(container, 'Add exercise');
		click(addExerciseBtn!);
		await flushPromises();

		// Fill in exercise name first (exercises without names are filtered out)
		const autocomplete = container.querySelector('.fit-autocomplete');
		expect(autocomplete).not.toBeNull();
		const exerciseNameInput = autocomplete?.querySelector('input') as HTMLInputElement;
		expect(exerciseNameInput).not.toBeNull();
		exerciseNameInput.value = 'Test Exercise';
		exerciseNameInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Find and modify sets input
		const setsInput = container.querySelector('.fit-small-input[type="number"]') as HTMLInputElement;
		expect(setsInput).not.toBeNull();
		setsInput.value = '5';
		setsInput.dispatchEvent(new Event('input', { bubbles: true }));

		// Enter template name and save
		const nameInput = container.querySelector('.fit-form-input') as HTMLInputElement;
		nameInput.value = 'Test Template';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		const saveBtn = findButton(container, 'Save template');
		click(saveBtn!);
		await flushPromises();

		// Verify the exercise was saved with 5 sets
		expect(ctx.templateRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				exercises: expect.arrayContaining([
					expect.objectContaining({ targetSets: 5 })
				])
			})
		);

		screen.destroy();
	});

	it('should show delete button only when editing existing template', async () => {
		const { ctx, state } = createIntegrationContext();

		// New template - no delete button
		let screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Delete')).toBeNull();
		screen.destroy();
		container.innerHTML = '';

		// Existing template - has delete button
		screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push-day' });
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Delete')).not.toBeNull();
		screen.destroy();
	});

	it('should delete template when delete button clicked', async () => {
		const { ctx, state } = createIntegrationContext();
		const initialCount = state.templates.length;

		const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push-day' });
		screen.render();
		await flushPromises();

		const deleteBtn = findButton(container, 'Delete');
		expect(deleteBtn).not.toBeNull();
		click(deleteBtn!);
		await flushPromises();

		expect(ctx.templateRepo.delete).toHaveBeenCalledWith('push-day');
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');

		screen.destroy();
	});

	it('should go back when back button clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
		screen.render();
		await flushPromises();

		const backBtn = container.querySelector('.fit-button-back');
		expect(backBtn).not.toBeNull();
		click(backBtn as HTMLElement);

		expect(ctx.view.goBack).toHaveBeenCalled();

		screen.destroy();
	});
});

describe('UI Elements: Exercise Screen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display current exercise name', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		const title = container.querySelector('.fit-title');
		expect(title?.textContent).toBe('Bench Press');

		screen.destroy();
	});

	it('should display set counter', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		const progressCard = container.querySelector('.fit-progress-card-wide');
		expect(progressCard).not.toBeNull();
		const values = progressCard?.querySelectorAll('.fit-stat-value-large');
		expect(values?.[0]?.textContent).toContain('0 /');

		screen.destroy();
	});

	it('should update weight with stepper buttons', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		// Check weight input exists
		const weightInput = container.querySelector('.fit-weight-input') as HTMLInputElement;
		expect(weightInput).not.toBeNull();

		// Click a plus button and verify it updates
		const plusButtons = container.querySelectorAll('.fit-weight-btn.fit-plus');
		expect(plusButtons.length).toBeGreaterThan(0);

		const initialValue = weightInput.value;
		click(plusButtons[0] as HTMLElement);
		await flushPromises();

		// The value should have changed
		const newValue = (container.querySelector('.fit-weight-input') as HTMLInputElement).value;
		expect(newValue).not.toBe(initialValue);

		screen.destroy();
	});

	it('should show reps grid and allow selection', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		// Find reps buttons (horizontal pill selector)
		const repsButtons = container.querySelectorAll('.fit-reps-pill');
		expect(repsButtons.length).toBeGreaterThan(0);

		// Click a reps button
		const rep8Button = Array.from(repsButtons).find(b => b.textContent === '8');
		if (rep8Button) {
			click(rep8Button as HTMLElement);
			await flushPromises();

			// Button should be selected (active class)
			expect(rep8Button.classList.contains('fit-reps-pill-active')).toBe(true);
		}

		screen.destroy();
	});

	it('should log set when complete set clicked', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		const completeBtn = findButton(container, 'Complete set');
		click(completeBtn!);
		await flushPromises();

		expect(ctx.sessionState.logSet).toHaveBeenCalled();

		screen.destroy();
	});

	it('should show previous sets after logging', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		// Log a set first
		ctx.sessionState.logSet(0, 80, 8);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		// Should show the logged set in integrated sets row
		const integratedSets = container.querySelector('.fit-sets-integrated');
		expect(integratedSets).not.toBeNull();

		screen.destroy();
	});

	it('should navigate back when back button clicked', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		const backBtn = container.querySelector('.fit-button-back');
		click(backBtn as HTMLElement);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');

		screen.destroy();
	});
});

describe('UI Elements: Session Screen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display all exercise cards', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		const cards = container.querySelectorAll('.fit-exercise-card');
		expect(cards.length).toBe(2); // Push Day has 2 exercises

		screen.destroy();
	});

	it('should show template name in header', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		const title = container.querySelector('.fit-title');
		expect(title?.textContent).toBe('Push Day');

		screen.destroy();
	});

	it('should navigate to exercise when card clicked', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		const firstCard = container.querySelector('.fit-exercise-card');
		click(firstCard as HTMLElement);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('exercise', { exerciseIndex: 0 });

		screen.destroy();
	});

	it('should show add exercise button', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		const addBtn = findButton(container, 'Add exercise');
		expect(addBtn).not.toBeNull();

		screen.destroy();
	});

	it('should show cancel button when no sets logged', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		// No sets logged, should show Cancel
		expect(findButton(container, 'Cancel')).not.toBeNull();
		expect(findButton(container, 'Finish workout')).toBeNull();

		screen.destroy();
	});

	it('should show finish workout button when sets are logged', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);
		ctx.sessionState.logSet(0, 80, 8); // Log a set

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Sets logged, should show Finish workout
		expect(findButton(container, 'Finish workout')).not.toBeNull();
		expect(findButton(container, 'Cancel')).toBeNull();

		screen.destroy();
	});

	it('should display set progress on exercise cards', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);
		ctx.sessionState.logSet(0, 80, 8);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		const progress = container.querySelector('.fit-exercise-card-progress');
		expect(progress?.textContent).toContain('1');

		screen.destroy();
	});
});

describe('UI Elements: Home Screen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should show start workout button when no active session', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Start workout')).not.toBeNull();
		expect(findButton(container, 'Continue workout')).toBeNull();

		screen.destroy();
	});

	it('should show continue workout button when session active', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Continue workout')).not.toBeNull();
		expect(findButton(container, 'Start workout')).toBeNull();

		screen.destroy();
	});

	it('should show active session card when workout in progress', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		const activeCard = container.querySelector('.fit-active-session-card');
		expect(activeCard).not.toBeNull();
		expect(activeCard?.textContent).toContain('In progress');

		screen.destroy();
	});

	it('should show quick links', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Templates')).not.toBeNull();
		expect(findButton(container, 'Exercises')).not.toBeNull();
		expect(findButton(container, 'History')).not.toBeNull();

		screen.destroy();
	});

	it('should navigate to template picker when start workout clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		const startBtn = findButton(container, 'Start workout');
		click(startBtn!);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('template-picker');

		screen.destroy();
	});

	it('should navigate to session when continue workout clicked', async () => {
		const { ctx, state } = createIntegrationContext();
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		const continueBtn = findButton(container, 'Continue workout');
		click(continueBtn!);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');

		screen.destroy();
	});

	it('should show recent templates', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new HomeScreen(container, ctx);
		screen.render();
		await flushPromises();

		const templateGrid = container.querySelector('.fit-template-grid');
		expect(templateGrid).not.toBeNull();

		screen.destroy();
	});
});

describe('UI Elements: Exercise Library', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display search input', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const searchInput = container.querySelector('.fit-search-input');
		expect(searchInput).not.toBeNull();

		screen.destroy();
	});

	it('should filter exercises when searching', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Initially 3 exercises
		expect(container.querySelectorAll('.fit-library-exercise-row').length).toBe(3);

		// Search for "bench"
		const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
		searchInput.value = 'bench';
		searchInput.dispatchEvent(new Event('input', { bubbles: true }));
		await flushPromises();

		// Should filter to 1 exercise
		expect(container.querySelectorAll('.fit-library-exercise-row').length).toBe(1);

		screen.destroy();
	});

	it('should show add exercise button', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Add exercise')).not.toBeNull();

		screen.destroy();
	});

	it('should show edit button on each exercise', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const editButtons = container.querySelectorAll('.fit-library-exercise-row .fit-button');
		expect(editButtons.length).toBe(3); // One per exercise

		screen.destroy();
	});

	it('should show form when add exercise clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const addBtn = findButton(container, 'Add exercise');
		click(addBtn!);
		await flushPromises();

		const form = container.querySelector('.fit-form');
		expect(form).not.toBeNull();

		screen.destroy();
	});

	it('should show form when edit clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new ExerciseLibraryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const editBtn = container.querySelector('.fit-library-exercise-row .fit-button');
		click(editBtn as HTMLElement);
		await flushPromises();

		const form = container.querySelector('.fit-form');
		expect(form).not.toBeNull();

		// Title should say "Edit exercise"
		const title = container.querySelector('.fit-title');
		expect(title?.textContent).toBe('Edit exercise');

		screen.destroy();
	});
});

describe('UI Elements: Finish Screen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display workout complete message', async () => {
		const { ctx, state } = createIntegrationContext();
		state.completedSessions = [{
			id: 'test-session',
			date: '2025-12-26',
			startTime: '2025-12-26T10:00:00Z',
			endTime: '2025-12-26T11:00:00Z',
			template: 'Push Day',
			status: 'completed',
			exercises: []
		}];

		const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
		screen.render();
		await flushPromises();

		expect(container.querySelector('.fit-finish-title')?.textContent).toBe('Workout complete!');

		screen.destroy();
	});

	it('should show done button', async () => {
		const { ctx, state } = createIntegrationContext();
		state.completedSessions = [{
			id: 'test-session',
			date: '2025-12-26',
			startTime: '2025-12-26T10:00:00Z',
			endTime: '2025-12-26T11:00:00Z',
			status: 'completed',
			exercises: []
		}];

		const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
		screen.render();
		await flushPromises();

		expect(findButton(container, 'Done')).not.toBeNull();

		screen.destroy();
	});

	it('should navigate to home when done clicked', async () => {
		const { ctx, state } = createIntegrationContext();
		state.completedSessions = [{
			id: 'test-session',
			date: '2025-12-26',
			startTime: '2025-12-26T10:00:00Z',
			endTime: '2025-12-26T11:00:00Z',
			status: 'completed',
			exercises: []
		}];

		const screen = new FinishScreen(container, ctx, { sessionId: 'test-session' });
		screen.render();
		await flushPromises();

		const doneBtn = findButton(container, 'Done');
		click(doneBtn!);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');

		screen.destroy();
	});
});

describe('UI Elements: History Screen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display header with back button', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new HistoryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const backBtn = container.querySelector('.fit-button-back');
		expect(backBtn).not.toBeNull();

		const title = container.querySelector('.fit-title');
		expect(title?.textContent).toBe('History');

		screen.destroy();
	});

	it('should navigate back when back button clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new HistoryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const backBtn = container.querySelector('.fit-button-back');
		click(backBtn as HTMLElement);

		expect(ctx.view.goBack).toHaveBeenCalled();

		screen.destroy();
	});

	it('should show session cards with details', async () => {
		const { ctx, state } = createIntegrationContext();
		state.completedSessions = [{
			id: 'test-session',
			date: '2025-12-26',
			startTime: '2025-12-26T10:00:00Z',
			endTime: '2025-12-26T11:00:00Z',
			template: 'Push Day',
			status: 'completed',
			exercises: [{
				exercise: 'Bench Press',
				targetSets: 3,
				targetRepsMin: 8,
				targetRepsMax: 12,
				restSeconds: 120,
				sets: [
					{ weight: 80, reps: 8, completed: true, timestamp: '2025-12-26T10:05:00Z' }
				]
			}]
		}];

		const screen = new HistoryScreen(container, ctx);
		screen.render();
		await flushPromises();

		const sessionCard = container.querySelector('.fit-session-card');
		expect(sessionCard).not.toBeNull();
		expect(sessionCard?.textContent).toContain('Push Day');

		screen.destroy();
	});
});

describe('UI Elements: Template Picker', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should display template cards', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		const cards = container.querySelectorAll('.fit-template-card');
		expect(cards.length).toBe(1);

		screen.destroy();
	});

	it('should start session when template clicked', async () => {
		const { ctx, state } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		const card = container.querySelector('.fit-template-card');
		click(card as HTMLElement);
		await flushPromises();

		expect(ctx.sessionState.startFromTemplate).toHaveBeenCalled();
		expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');

		screen.destroy();
	});

	it('should show start empty workout option', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		const emptyBtn = findButton(container, 'Start empty workout');
		expect(emptyBtn).not.toBeNull();

		screen.destroy();
	});

	it('should show create template button', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		const createBtn = findButton(container, 'Create new template');
		expect(createBtn).not.toBeNull();

		screen.destroy();
	});

	it('should navigate to template editor when create clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		const createBtn = findButton(container, 'Create new template');
		click(createBtn!);

		expect(ctx.view.navigateTo).toHaveBeenCalledWith('template-editor', { isNew: true });

		screen.destroy();
	});

	it('should navigate back when back button clicked', async () => {
		const { ctx } = createIntegrationContext();

		const screen = new TemplatePickerScreen(container, ctx);
		screen.render();
		await flushPromises();

		const backBtn = container.querySelector('.fit-button-back');
		click(backBtn as HTMLElement);

		expect(ctx.view.goBack).toHaveBeenCalled();

		screen.destroy();
	});
});

describe('User Journey: Edge Cases', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	it('should cancel workout without saving when no sets logged', async () => {
		const { ctx, state } = createIntegrationContext();

		// Start a session but don't log any sets
		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		// Cancel workout (no sets logged, so Cancel button is shown)
		const cancelButton = findButton(container, 'Cancel');
		click(cancelButton!);
		await flushPromises();

		// Session should be discarded, not saved
		expect(state.session).toBeNull();
		expect(state.completedSessions.length).toBe(0);

		screen.destroy();
	});

	it('should handle session with single exercise', async () => {
		const { ctx, state } = createIntegrationContext();

		// Create template with single exercise
		state.templates = [{
			id: 'single',
			name: 'Single Exercise',
			exercises: [{
				exercise: 'Squat',
				targetSets: 5,
				targetRepsMin: 5,
				targetRepsMax: 5,
				restSeconds: 180
			}]
		}];

		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new SessionScreen(container, ctx);
		screen.render();
		await flushPromises();

		const exerciseCards = container.querySelectorAll('.fit-exercise-card');
		expect(exerciseCards.length).toBe(1);

		screen.destroy();
	});

	it('should handle rapid button clicks gracefully', async () => {
		const { ctx, state } = createIntegrationContext();

		ctx.sessionState.startFromTemplate(state.templates[0]!);

		const screen = new ExerciseScreen(container, ctx, { exerciseIndex: 0 });
		screen.render();
		await flushPromises();

		const completeButton = findButton(container, 'Complete set');

		// Rapid clicks
		click(completeButton!);
		click(completeButton!);
		click(completeButton!);
		await flushPromises();

		// Should have logged 3 sets (one per click)
		expect(state.session?.exercises[0]?.sets.length).toBe(3);

		screen.destroy();
	});
});
