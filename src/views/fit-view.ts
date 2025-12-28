import { ItemView, Platform, WorkspaceLeaf, TAbstractFile, EventRef } from 'obsidian';
import type MainPlugin from '../main';
import type { ScreenType, ScreenParams } from '../types';
import { SessionStateManager } from '../state/session-state';
import { ExerciseRepository } from '../data/exercise-repository';
import { WorkoutRepository } from '../data/workout-repository';
import { SessionRepository } from '../data/session-repository';
import { ProgramRepository } from '../data/program-repository';

// Screen imports
import { HomeScreen } from '../ui/screens/home-screen';
import { WorkoutPickerScreen } from '../ui/screens/workout-picker';
import { SessionScreen } from '../ui/screens/session-screen';
import { ExerciseScreen } from '../ui/screens/exercise-screen';
import { FinishScreen } from '../ui/screens/finish-screen';
import { HistoryScreen } from '../ui/screens/history-screen';
import { WorkoutEditorScreen } from '../ui/screens/workout-editor';
import { ExerciseLibraryScreen } from '../ui/screens/exercise-library';
import { QuestionnaireScreen } from '../ui/screens/questionnaire-screen';
import { FeedbackScreen } from '../ui/screens/feedback-screen';
import { SessionDetailScreen } from '../ui/screens/session-detail-screen';

export const VIEW_TYPE_FIT = 'obsidian-fitness-view';

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
	programRepo: ProgramRepository;
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
	programRepo: ProgramRepository;

	// Event listeners for file changes
	private vaultEventRefs: EventRef[] = [];
	private refreshDebounceTimer: number | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: MainPlugin
	) {
		super(leaf);

		// Initialize repositories
		this.exerciseRepo = new ExerciseRepository(this.app, plugin.settings.basePath);
		this.workoutRepo = new WorkoutRepository(this.app, plugin.settings.basePath);
		this.sessionRepo = new SessionRepository(this.app, plugin.settings.basePath);
		this.programRepo = new ProgramRepository(this.app, plugin.settings.basePath);

		// Connect database repository to repositories that need exercise lookups
		this.exerciseRepo.setDatabaseRepository(plugin.databaseExerciseRepo);
		this.workoutRepo.setDatabaseRepository(plugin.databaseExerciseRepo);

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

		// Apply bottom padding from settings
		this.applyBottomPadding();

		// Register vault event listeners for file changes
		this.registerVaultEvents();

		// Try to restore active session (but don't auto-navigate, let user choose)
		await this.sessionState.loadFromDisk();

		this.navigateTo('home');
	}

	async onClose(): Promise<void> {
		// Unregister vault events
		this.unregisterVaultEvents();

		// Clear any pending refresh
		if (this.refreshDebounceTimer !== null) {
			window.clearTimeout(this.refreshDebounceTimer);
			this.refreshDebounceTimer = null;
		}

		// Cleanup session state
		await this.sessionState.cleanup();

		// Destroy current screen
		this.currentScreen?.destroy();
		this.currentScreen = null;
	}

	/**
	 * Registers vault event listeners to watch for file changes
	 */
	private registerVaultEvents(): void {
		const basePath = this.plugin.settings.basePath;

		const handleFileChange = (file: TAbstractFile) => {
			// Only refresh if the file is in our data folder
			if (file.path.startsWith(basePath + '/')) {
				console.debug('[Fit] File changed:', file.path);
				this.debouncedRefresh();
			}
		};

		// Listen for file modifications, creations, deletions, and renames
		this.vaultEventRefs.push(
			this.app.vault.on('modify', handleFileChange),
			this.app.vault.on('create', handleFileChange),
			this.app.vault.on('delete', handleFileChange),
			this.app.vault.on('rename', (file, oldPath) => {
				// Refresh if either old or new path is in our folder
				if (file.path.startsWith(basePath + '/') || oldPath.startsWith(basePath + '/')) {
					console.debug('[Fit] File renamed:', oldPath, '->', file.path);
					this.debouncedRefresh();
				}
			})
		);
	}

	/**
	 * Unregisters vault event listeners
	 */
	private unregisterVaultEvents(): void {
		for (const ref of this.vaultEventRefs) {
			this.app.vault.offref(ref);
		}
		this.vaultEventRefs = [];
	}

	/**
	 * Debounced refresh to avoid too many updates
	 */
	private debouncedRefresh(): void {
		if (this.refreshDebounceTimer !== null) {
			window.clearTimeout(this.refreshDebounceTimer);
		}
		this.refreshDebounceTimer = window.setTimeout(() => {
			this.refreshDebounceTimer = null;
			this.refresh();
		}, 300);
	}

	/**
	 * Called when settings change - updates repositories and refreshes
	 */
	onSettingsChanged(): void {
		const basePath = this.plugin.settings.basePath;

		// Update repository paths
		this.exerciseRepo.setBasePath(basePath);
		this.workoutRepo.setBasePath(basePath);
		this.sessionRepo.setBasePath(basePath);
		this.programRepo.setBasePath(basePath);

		// Update session state
		this.sessionState.updateSettings(this.plugin.settings);

		// Re-register vault events with new basePath
		this.unregisterVaultEvents();
		this.registerVaultEvents();

		// Update bottom padding
		this.applyBottomPadding();

		// Refresh the view
		this.refresh();
	}

	/**
	 * Applies bottom padding CSS variable from settings
	 */
	private applyBottomPadding(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.style.setProperty('--fit-bottom-padding', `${this.plugin.settings.bottomPadding}px`);
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
			sessionRepo: this.sessionRepo,
			programRepo: this.programRepo
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
			case 'questionnaire':
				this.currentScreen = new QuestionnaireScreen(container, ctx, params);
				break;
			case 'feedback':
				this.currentScreen = new FeedbackScreen(container, ctx, params);
				break;
			case 'session-detail':
				this.currentScreen = new SessionDetailScreen(container, ctx, params);
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
			case 'exercise-library':
			case 'finish':
			case 'questionnaire':
			case 'feedback':
			case 'session-detail':
				this.navigateTo('home');
				break;
			case 'workout-editor':
				// Go back to session if there's an active session, otherwise home
				if (this.sessionState.hasActiveSession()) {
					this.navigateTo('session');
				} else {
					this.navigateTo('home');
				}
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
			console.debug('[Fit] Refreshing screen:', this.currentScreenType);
			this.navigateTo(this.currentScreenType, this.screenParams);
		}
	}
}
