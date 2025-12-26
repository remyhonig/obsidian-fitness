import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, PluginSettingTab } from './settings';
import { FitView, VIEW_TYPE_FIT } from './views/fit-view';
import { bootstrapDataFolder, importExerciseDatabase } from './data/bootstrap';

export default class MainPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		// Bootstrap data folder structure and starter content
		// Wrapped in try-catch to ensure plugin loads even if bootstrap fails
		try {
			await bootstrapDataFolder(this.app, this.settings.basePath);
		} catch (error) {
			console.error('[Fit] Bootstrap failed:', error);
		}

		// Register the workout view
		this.registerView(
			VIEW_TYPE_FIT,
			(leaf) => new FitView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('dumbbell', 'Open workout tracker', () => {
			void this.activateView();
		});

		// Add command to open workout tracker
		this.addCommand({
			id: 'open-workout-tracker',
			name: 'Open workout tracker',
			callback: () => {
				void this.activateView();
			}
		});

		// Add command to import exercise database
		this.addCommand({
			id: 'import-exercise-database',
			name: 'Import exercise database (800+ exercises)',
			callback: () => {
				void importExerciseDatabase(this.app, this.settings.basePath);
			}
		});

		// Add settings tab
		this.addSettingTab(new PluginSettingTab(this.app, this));
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
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIT);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof FitView) {
				view.onSettingsChanged();
			}
		}
	}

	/**
	 * Activates the workout view
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
}
