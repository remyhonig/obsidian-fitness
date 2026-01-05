import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, PluginSettingTab } from './settings';
import { FitView, VIEW_TYPE_FIT } from './views/fit-view';
import { FitViewReact, VIEW_TYPE_FIT_REACT } from './views/fit-view-react';
import { bootstrapDataFolder } from './data/bootstrap';
import { DatabaseExerciseRepository } from './data/database-exercise-repository';
import { registerContextMenus } from './context-menus';
import type { DatabaseExerciseEntry } from './types';

// Separate storage key for exercise database (not mixed with settings)
const EXERCISE_DATABASE_KEY = 'exercise-database';

interface ExerciseDatabaseData {
	version: string;
	importedAt: string;
	exercises: DatabaseExerciseEntry[];
}

export default class MainPlugin extends Plugin {
	settings: PluginSettings;
	databaseExerciseRepo: DatabaseExerciseRepository;

	async onload() {
		await this.loadSettings();

		// Initialize database exercise repository
		this.databaseExerciseRepo = new DatabaseExerciseRepository(
			async () => {
				const data = await this.loadData() as Record<string, unknown> | null | undefined;
				return (data?.[EXERCISE_DATABASE_KEY] as ExerciseDatabaseData | null) ?? null;
			},
			async (dbData) => {
				const data = (await this.loadData() as Record<string, unknown> | null) ?? {};
				data[EXERCISE_DATABASE_KEY] = dbData;
				await this.saveData(data);
			}
		);

		// Load the exercise database
		await this.databaseExerciseRepo.load();

		// Bootstrap data folder structure and starter content
		// Wrapped in try-catch to ensure plugin loads even if bootstrap fails
		try {
			await bootstrapDataFolder(this.app, this.settings.basePath);
		} catch (error) {
			console.error('[Fit] Bootstrap failed:', error);
		}

		// Register the workout views (both legacy and React)
		this.registerView(
			VIEW_TYPE_FIT,
			(leaf) => new FitView(leaf, this)
		);
		this.registerView(
			VIEW_TYPE_FIT_REACT,
			(leaf) => new FitViewReact(leaf, this)
		);

		// Add ribbon icon (opens React version by default)
		this.addRibbonIcon('dumbbell', 'Open workout tracker', () => {
			void this.activateViewReact();
		});

		// Add command to open workout tracker (React version)
		this.addCommand({
			id: 'open-workout-tracker',
			name: 'Open workout tracker (React)',
			callback: () => {
				void this.activateViewReact();
			}
		});

		// Add command to open workout tracker (legacy version)
		this.addCommand({
			id: 'open-workout-tracker-legacy',
			name: 'Open workout tracker (Legacy)',
			callback: () => {
				void this.activateView();
			}
		});

		// Add command to download exercise database
		this.addCommand({
			id: 'download-exercise-database',
			name: 'Download exercise database (800+ exercises)',
			callback: () => {
				void this.downloadExerciseDatabase();
			}
		});

		// Add settings tab
		this.addSettingTab(new PluginSettingTab(this.app, this));

		// Register folder context menus for adding exercises/programs
		registerContextMenus(this);
	}

	/**
	 * Downloads and stores the exercise database
	 */
	async downloadExerciseDatabase(): Promise<void> {
		new Notice('Downloading exercise database...');
		try {
			const result = await this.databaseExerciseRepo.import();
			new Notice(`Downloaded ${result.imported} exercises`);
		} catch (error) {
			console.error('[Fit] Failed to download exercise database:', error);
			new Notice(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Migrates from old file-based exercise imports to new database system
	 * Removes exercise files that are identical to database entries
	 */
	async migrateExercises(): Promise<{ removed: number; kept: number }> {
		// Need a temporary ExerciseRepository to do the migration
		const { ExerciseRepository } = await import('./data/exercise-repository');
		const exerciseRepo = new ExerciseRepository(this.app, this.settings.basePath);
		exerciseRepo.setDatabaseRepository(this.databaseExerciseRepo);

		new Notice('Migrating exercises...');
		try {
			const result = await exerciseRepo.migrateFromFileImports();
			new Notice(`Migration complete: Removed ${result.removed} duplicates, kept ${result.kept} custom exercises`);
			return result;
		} catch (error) {
			console.error('[Fit] Migration failed:', error);
			new Notice(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return { removed: 0, kept: 0 };
		}
	}

	onunload() {
		// Views are automatically cleaned up by Obsidian
	}

	async loadSettings() {
		const savedData = await this.loadData() as Partial<PluginSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Notify all open FitViews of the settings change
		this.notifyViewsOfSettingsChange();
	}

	/**
	 * Notifies all open FitViews that settings have changed
	 */
	private notifyViewsOfSettingsChange(): void {
		// Notify legacy views
		const legacyLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIT);
		for (const leaf of legacyLeaves) {
			const view = leaf.view;
			if (view instanceof FitView) {
				view.onSettingsChanged();
			}
		}

		// Notify React views
		const reactLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIT_REACT);
		for (const leaf of reactLeaves) {
			const view = leaf.view;
			if (view instanceof FitViewReact) {
				view.onSettingsChanged();
			}
		}
	}

	/**
	 * Activates the workout view (legacy version)
	 */
	async activateView(): Promise<void> {
		const { workspace } = this.app;

		// Check if view is already open
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_FIT);
		const existingLeaf = leaves[0];
		if (existingLeaf) {
			// Reveal existing view
			await workspace.revealLeaf(existingLeaf);
			return;
		}

		// Open in a new leaf
		const leaf = workspace.getLeaf(false);
		await leaf.setViewState({
			type: VIEW_TYPE_FIT,
			active: true
		});

		await workspace.revealLeaf(leaf);
	}

	/**
	 * Activates the workout view (React version)
	 */
	async activateViewReact(): Promise<void> {
		const { workspace } = this.app;

		// Check if view is already open
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_FIT_REACT);
		const existingLeaf = leaves[0];
		if (existingLeaf) {
			// Reveal existing view
			await workspace.revealLeaf(existingLeaf);
			return;
		}

		// Open in a new leaf
		const leaf = workspace.getLeaf(false);
		await leaf.setViewState({
			type: VIEW_TYPE_FIT_REACT,
			active: true
		});

		await workspace.revealLeaf(leaf);
	}
}
