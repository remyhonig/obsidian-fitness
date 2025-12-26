import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, PluginSettingTab } from './settings';
import { FitView, VIEW_TYPE_FIT } from './views/fit-view';

export default class MainPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

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
