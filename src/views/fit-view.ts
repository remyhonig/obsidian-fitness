import { ItemView, Platform, WorkspaceLeaf } from 'obsidian';
import type MainPlugin from '../main';
import type { ScreenType, ScreenParams } from '../types';
import { SessionStateManager } from '../state/session-state';
import { ExerciseRepository } from '../data/exercise-repository';
import { WorkoutRepository } from '../data/workout-repository';
import { SessionRepository } from '../data/session-repository';

// Screen imports
import { HomeScreen } from '../ui/screens/home-screen';
import { WorkoutPickerScreen } from '../ui/screens/workout-picker';
import { SessionScreen } from '../ui/screens/session-screen';
import { ExerciseScreen } from '../ui/screens/exercise-screen';
import { FinishScreen } from '../ui/screens/finish-screen';
import { HistoryScreen } from '../ui/screens/history-screen';
import { WorkoutEditorScreen } from '../ui/screens/workout-editor';
import { ExerciseLibraryScreen } from '../ui/screens/exercise-library';

export const VIEW_TYPE_FIT = 'obsidian-fit-view';

/**
 * Base interface for all screens
 */
export interface Screen {
	render(): void;
	destroy(): void;
}

/**
 * Context passed to screens for accessing plugin functionality
 */
export interface ScreenContext {
	view: FitView;
	plugin: MainPlugin;
	sessionState: SessionStateManager;
	exerciseRepo: ExerciseRepository;
	workoutRepo: WorkoutRepository;
	sessionRepo: SessionRepository;
}

/**
 * Main view for the workout tracker
 */
export class FitView extends ItemView {
	private currentScreen: Screen | null = null;
	private currentScreenType: ScreenType | null = null;
	private screenParams: ScreenParams = {};

	// Shared state and repositories
	sessionState: SessionStateManager;
	exerciseRepo: ExerciseRepository;
	workoutRepo: WorkoutRepository;
	sessionRepo: SessionRepository;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: MainPlugin
	) {
		super(leaf);

		// Initialize repositories
		this.exerciseRepo = new ExerciseRepository(this.app, plugin.settings.basePath);
		this.workoutRepo = new WorkoutRepository(this.app, plugin.settings.basePath);
		this.sessionRepo = new SessionRepository(this.app, plugin.settings.basePath);

		// Initialize session state
		this.sessionState = new SessionStateManager(this.app, plugin.settings);
	}

	getViewType(): string {
		return VIEW_TYPE_FIT;
	}

	getDisplayText(): string {
		return 'Workout';
	}

	getIcon(): string {
		return 'dumbbell';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('fit-view');

		// Add mobile class if on mobile
		if (Platform.isMobile) {
			container.addClass('fit-view-mobile');
		}

		// Try to restore active session
		const hasActiveSession = await this.sessionState.loadFromDisk();

		if (hasActiveSession) {
			this.navigateTo('session');
		} else {
			this.navigateTo('home');
		}
	}

	async onClose(): Promise<void> {
		// Cleanup session state
		await this.sessionState.cleanup();

		// Destroy current screen
		this.currentScreen?.destroy();
		this.currentScreen = null;
	}

	/**
	 * Gets the screen context for passing to screens
	 */
	getContext(): ScreenContext {
		return {
			view: this,
			plugin: this.plugin,
			sessionState: this.sessionState,
			exerciseRepo: this.exerciseRepo,
			workoutRepo: this.workoutRepo,
			sessionRepo: this.sessionRepo
		};
	}

	/**
	 * Navigates to a screen
	 */
	navigateTo(screenType: ScreenType, params: ScreenParams = {}): void {
		// Destroy current screen
		this.currentScreen?.destroy();

		// Get the content container
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// Store current screen info
		this.currentScreenType = screenType;
		this.screenParams = params;

		// Create new screen
		const ctx = this.getContext();

		switch (screenType) {
			case 'home':
				this.currentScreen = new HomeScreen(container, ctx);
				break;
			case 'workout-picker':
				this.currentScreen = new WorkoutPickerScreen(container, ctx);
				break;
			case 'session':
				this.currentScreen = new SessionScreen(container, ctx);
				break;
			case 'exercise':
				this.currentScreen = new ExerciseScreen(container, ctx, params);
				break;
			case 'finish':
				this.currentScreen = new FinishScreen(container, ctx, params);
				break;
			case 'history':
				this.currentScreen = new HistoryScreen(container, ctx);
				break;
			case 'workout-editor':
				this.currentScreen = new WorkoutEditorScreen(container, ctx, params);
				break;
			case 'exercise-library':
				this.currentScreen = new ExerciseLibraryScreen(container, ctx);
				break;
			default:
				// Fallback to home
				this.currentScreen = new HomeScreen(container, ctx);
		}

		// Render the screen
		this.currentScreen.render();
	}

	/**
	 * Goes back to the previous logical screen
	 */
	goBack(): void {
		switch (this.currentScreenType) {
			case 'exercise':
				this.navigateTo('session');
				break;
			case 'session':
				// If workout is active, stay on session
				// Otherwise go home
				if (this.sessionState.hasActiveSession()) {
					// Show confirm before leaving?
					this.navigateTo('home');
				} else {
					this.navigateTo('home');
				}
				break;
			case 'workout-picker':
			case 'history':
			case 'workout-editor':
			case 'exercise-library':
			case 'finish':
				this.navigateTo('home');
				break;
			default:
				this.navigateTo('home');
		}
	}

	/**
	 * Refreshes the current screen
	 */
	refresh(): void {
		if (this.currentScreenType) {
			this.navigateTo(this.currentScreenType, this.screenParams);
		}
	}
}
