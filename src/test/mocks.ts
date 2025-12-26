import { vi } from 'vitest';
import type { ScreenContext } from '../views/fit-view';
import type { Exercise, Template, Session, SessionExercise } from '../types';
import type { PluginSettings } from '../settings';

// Mock plugin settings
export function createMockSettings(): PluginSettings {
	return {
		basePath: 'Fitness',
		weightUnit: 'kg',
		defaultRestSeconds: 120,
		autoStartRestTimer: true,
		weightIncrementsKg: [10, 2.5, 0.5, 0.25],
		weightIncrementsLbs: [45, 10, 5, 2.5]
	};
}

// Mock plugin
export function createMockPlugin() {
	return {
		settings: createMockSettings(),
		saveSettings: vi.fn().mockResolvedValue(undefined),
		loadSettings: vi.fn().mockResolvedValue(undefined)
	};
}

// Mock exercise repository
export function createMockExerciseRepo(exercises: Exercise[] = []) {
	return {
		list: vi.fn().mockResolvedValue(exercises),
		get: vi.fn().mockImplementation((id: string) =>
			Promise.resolve(exercises.find(e => e.id === id) ?? null)
		),
		getByName: vi.fn().mockImplementation((name: string) =>
			Promise.resolve(exercises.find(e => e.name.toLowerCase() === name.toLowerCase()) ?? null)
		),
		create: vi.fn().mockImplementation((exercise: Omit<Exercise, 'id'>) =>
			Promise.resolve({ id: exercise.name.toLowerCase().replace(/\s+/g, '-'), ...exercise })
		),
		update: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		search: vi.fn().mockImplementation((query: string) =>
			Promise.resolve(exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase())))
		),
		ensureFolder: vi.fn().mockResolvedValue(undefined),
		setBasePath: vi.fn()
	};
}

// Mock template repository
export function createMockTemplateRepo(templates: Template[] = []) {
	return {
		list: vi.fn().mockResolvedValue(templates),
		get: vi.fn().mockImplementation((id: string) =>
			Promise.resolve(templates.find(t => t.id === id) ?? null)
		),
		getByName: vi.fn().mockImplementation((name: string) =>
			Promise.resolve(templates.find(t => t.name.toLowerCase() === name.toLowerCase()) ?? null)
		),
		create: vi.fn().mockImplementation((template: Omit<Template, 'id'>) =>
			Promise.resolve({ id: template.name.toLowerCase().replace(/\s+/g, '-'), ...template })
		),
		update: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		duplicate: vi.fn().mockResolvedValue(undefined),
		search: vi.fn().mockImplementation((query: string) =>
			Promise.resolve(templates.filter(t => t.name.toLowerCase().includes(query.toLowerCase())))
		),
		ensureFolder: vi.fn().mockResolvedValue(undefined),
		setBasePath: vi.fn()
	};
}

// Mock session repository
export function createMockSessionRepo(sessions: Session[] = []) {
	return {
		list: vi.fn().mockResolvedValue(sessions),
		get: vi.fn().mockImplementation((id: string) =>
			Promise.resolve(sessions.find(s => s.id === id) ?? null)
		),
		getActive: vi.fn().mockResolvedValue(null),
		saveActive: vi.fn().mockResolvedValue(undefined),
		finalizeActive: vi.fn().mockImplementation((session: Session) =>
			Promise.resolve({ ...session, status: 'completed' as const, endTime: new Date().toISOString() })
		),
		deleteActive: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		getRecent: vi.fn().mockImplementation((limit = 5) =>
			Promise.resolve(sessions.slice(0, limit))
		),
		getByDateRange: vi.fn().mockResolvedValue(sessions),
		getByTemplate: vi.fn().mockResolvedValue(sessions),
		calculateVolume: vi.fn().mockImplementation((session: Session) => {
			let total = 0;
			for (const ex of session.exercises) {
				for (const set of ex.sets) {
					if (set.completed) total += set.weight * set.reps;
				}
			}
			return total;
		}),
		countCompletedSets: vi.fn().mockImplementation((session: Session) => {
			let count = 0;
			for (const ex of session.exercises) {
				for (const set of ex.sets) {
					if (set.completed) count++;
				}
			}
			return count;
		}),
		ensureFolder: vi.fn().mockResolvedValue(undefined),
		setBasePath: vi.fn()
	};
}

// Mock session state manager
export function createMockSessionState(activeSession: Session | null = null) {
	let session = activeSession;
	const listeners = new Set<() => void>();

	const notifyListeners = () => {
		// Copy listeners to avoid issues when listeners modify the Set during iteration
		const listenersCopy = [...listeners];
		for (const listener of listenersCopy) {
			listener();
		}
	};

	return {
		hasActiveSession: vi.fn().mockImplementation(() => session !== null),
		getSession: vi.fn().mockImplementation(() => session),
		getExercise: vi.fn().mockImplementation((index: number) =>
			session?.exercises[index] ?? null
		),
		getCurrentExercise: vi.fn().mockImplementation(() =>
			session?.exercises[0] ?? null
		),
		getCurrentExerciseIndex: vi.fn().mockReturnValue(0),
		setCurrentExerciseIndex: vi.fn(),
		startFromTemplate: vi.fn().mockImplementation((template: Template) => {
			session = {
				id: 'active',
				date: new Date().toISOString().split('T')[0] ?? '',
				startTime: new Date().toISOString(),
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
		startEmpty: vi.fn().mockImplementation(() => {
			session = {
				id: 'active',
				date: new Date().toISOString().split('T')[0] ?? '',
				startTime: new Date().toISOString(),
				status: 'active',
				exercises: []
			};
			notifyListeners();
		}),
		addExercise: vi.fn().mockImplementation((name: string) => {
			if (session) {
				session.exercises.push({
					exercise: name,
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 12,
					restSeconds: 120,
					sets: []
				});
				notifyListeners();
			}
		}),
		removeExercise: vi.fn(),
		reorderExercises: vi.fn(),
		logSet: vi.fn().mockImplementation((exerciseIndex: number, weight: number, reps: number) => {
			if (session && session.exercises[exerciseIndex]) {
				session.exercises[exerciseIndex].sets.push({
					weight,
					reps,
					completed: true,
					timestamp: new Date().toISOString()
				});
				notifyListeners();
			}
		}),
		editSet: vi.fn(),
		deleteSet: vi.fn().mockImplementation((exerciseIndex: number, setIndex: number) => {
			if (session && session.exercises[exerciseIndex]) {
				session.exercises[exerciseIndex].sets.splice(setIndex, 1);
				notifyListeners();
			}
		}),
		getLastSet: vi.fn().mockImplementation((exerciseIndex: number) => {
			const exercise = session?.exercises[exerciseIndex];
			if (!exercise || exercise.sets.length === 0) return null;
			return exercise.sets[exercise.sets.length - 1] ?? null;
		}),
		finishSession: vi.fn().mockImplementation(async () => {
			if (session) {
				const finished = { ...session, status: 'completed' as const, endTime: new Date().toISOString() };
				session = null;
				return finished;
			}
			return null;
		}),
		discardSession: vi.fn().mockImplementation(() => {
			session = null;
			notifyListeners();
		}),
		startRestTimer: vi.fn(),
		addRestTime: vi.fn(),
		cancelRestTimer: vi.fn(),
		getRestTimeRemaining: vi.fn().mockReturnValue(0),
		isRestTimerActive: vi.fn().mockReturnValue(false),
		getRestTimer: vi.fn().mockReturnValue(null),
		subscribe: vi.fn().mockImplementation((listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}),
		updateSettings: vi.fn(),
		loadFromDisk: vi.fn().mockResolvedValue(false),
		cleanup: vi.fn().mockResolvedValue(undefined)
	};
}

// Mock view
export function createMockView() {
	const navigationHistory: string[] = [];

	return {
		app: {
			vault: {},
			workspace: {},
			fileManager: {}
		},
		navigateTo: vi.fn().mockImplementation((screen: string) => {
			navigationHistory.push(screen);
		}),
		goBack: vi.fn().mockImplementation(() => {
			navigationHistory.pop();
		}),
		getNavigationHistory: () => navigationHistory
	};
}

// Create full screen context
export function createMockScreenContext(options: {
	exercises?: Exercise[];
	templates?: Template[];
	sessions?: Session[];
	activeSession?: Session | null;
} = {}): ScreenContext {
	return {
		view: createMockView() as unknown as ScreenContext['view'],
		plugin: createMockPlugin() as unknown as ScreenContext['plugin'],
		exerciseRepo: createMockExerciseRepo(options.exercises ?? []) as unknown as ScreenContext['exerciseRepo'],
		templateRepo: createMockTemplateRepo(options.templates ?? []) as unknown as ScreenContext['templateRepo'],
		sessionRepo: createMockSessionRepo(options.sessions ?? []) as unknown as ScreenContext['sessionRepo'],
		sessionState: createMockSessionState(options.activeSession ?? null) as unknown as ScreenContext['sessionState']
	};
}

// Sample data factories
export function createSampleExercise(overrides: Partial<Exercise> = {}): Exercise {
	return {
		id: 'bench-press',
		name: 'Bench Press',
		category: 'Chest',
		equipment: 'Barbell',
		muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
		defaultWeight: 60,
		weightIncrement: 2.5,
		...overrides
	};
}

export function createSampleTemplate(overrides: Partial<Template> = {}): Template {
	return {
		id: 'push-day',
		name: 'Push Day',
		description: 'Chest, shoulders, and triceps',
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
		],
		...overrides
	};
}

export function createSampleSession(overrides: Partial<Session> = {}): Session {
	return {
		id: '2025-01-01-push-day',
		date: '2025-01-01',
		startTime: '2025-01-01T10:00:00Z',
		endTime: '2025-01-01T11:00:00Z',
		template: 'Push Day',
		status: 'completed',
		exercises: [
			{
				exercise: 'Bench Press',
				targetSets: 4,
				targetRepsMin: 6,
				targetRepsMax: 8,
				restSeconds: 180,
				sets: [
					{ weight: 80, reps: 8, completed: true, timestamp: '2025-01-01T10:05:00Z' },
					{ weight: 80, reps: 7, completed: true, timestamp: '2025-01-01T10:10:00Z' },
					{ weight: 80, reps: 6, completed: true, timestamp: '2025-01-01T10:15:00Z' },
					{ weight: 80, reps: 6, completed: true, timestamp: '2025-01-01T10:20:00Z' }
				]
			}
		],
		...overrides
	};
}

export function createSampleSessionExercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
	return {
		exercise: 'Bench Press',
		targetSets: 4,
		targetRepsMin: 6,
		targetRepsMax: 8,
		restSeconds: 180,
		sets: [],
		...overrides
	};
}

// Helper to wait for promises to resolve
export async function flushPromises(): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, 0));
}

// Helper to simulate user clicks
export function click(element: HTMLElement): void {
	element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

// Helper to simulate input changes
export function changeInput(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

// Helper to find elements by text content
export function findByText(container: HTMLElement, text: string): HTMLElement | null {
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	while ((node = walker.nextNode())) {
		if (node.textContent?.includes(text)) {
			return node.parentElement;
		}
	}
	return null;
}

// Helper to find button by text
export function findButton(container: HTMLElement, text: string): HTMLButtonElement | null {
	const buttons = container.querySelectorAll('button');
	for (const button of buttons) {
		if (button.textContent?.includes(text)) {
			return button;
		}
	}
	return null;
}
