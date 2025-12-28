import { App, PluginSettingTab as ObsidianPluginSettingTab, Setting } from 'obsidian';
import type MainPlugin from './main';
import type { WeightUnit } from './types';
import { ProgramRepository } from './data/program-repository';
import { bootstrapDataFolder } from './data/bootstrap';

export interface PluginSettings {
	basePath: string;
	weightUnit: WeightUnit;
	defaultRestSeconds: number;
	autoStartRestTimer: boolean;
	weightIncrementsKg: number[];
	weightIncrementsLbs: number[];
	activeProgram?: string; // Program ID (e.g., "ppl-split")
	programWorkoutIndex: number; // Current position in program (0-based)
	bottomPadding: number; // Extra bottom padding in pixels (for mobile nav bars)
}

export const DEFAULT_SETTINGS: PluginSettings = {
	basePath: 'Fitness',
	weightUnit: 'kg',
	defaultRestSeconds: 120,
	autoStartRestTimer: true,
	weightIncrementsKg: [10, 2.5, 0.5, 0.25],
	weightIncrementsLbs: [45, 10, 5, 2.5],
	programWorkoutIndex: 0,
	bottomPadding: 100
};

export class PluginSettingTab extends ObsidianPluginSettingTab {
	plugin: MainPlugin;

	constructor(app: App, plugin: MainPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Fit settings' });

		// Data path setting
		new Setting(containerEl)
			.setName('Data folder')
			.setDesc('Base folder for exercises, workouts, and sessions.')
			.addText(text => text
				.setPlaceholder('Fitness')
				.setValue(this.plugin.settings.basePath)
				.onChange(async (value) => {
					this.plugin.settings.basePath = value || 'Fitness';
					await this.plugin.saveSettings();
					// Bootstrap folder structure for new path
					await bootstrapDataFolder(this.app, this.plugin.settings.basePath);
				}));

		// Weight unit setting
		new Setting(containerEl)
			.setName('Weight unit')
			.setDesc('Unit for displaying and logging weights.')
			.addDropdown(dropdown => dropdown
				.addOption('kg', 'Kilograms')
				.addOption('lbs', 'Pounds')
				.setValue(this.plugin.settings.weightUnit)
				.onChange(async (value) => {
					this.plugin.settings.weightUnit = value as WeightUnit;
					await this.plugin.saveSettings();
				}));

		// Default rest timer setting
		new Setting(containerEl)
			.setName('Break time')
			.setDesc('How long to pause between sets')
			.addText(text => text
				.setPlaceholder('120')
				.setValue(String(this.plugin.settings.defaultRestSeconds))
				.onChange(async (value) => {
					const parsed = parseInt(value, 10);
					if (!isNaN(parsed) && parsed > 0) {
						this.plugin.settings.defaultRestSeconds = parsed;
						await this.plugin.saveSettings();
					}
				}));

		// Auto-start rest timer setting
		new Setting(containerEl)
			.setName('Auto-start timer')
			.setDesc('Start timer after each set')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoStartRestTimer)
				.onChange(async (value) => {
					this.plugin.settings.autoStartRestTimer = value;
					await this.plugin.saveSettings();
				}));

		// Program section
		containerEl.createEl('h3', { text: 'Training program' });

		// Active program setting - populated dynamically
		const programSetting = new Setting(containerEl)
			.setName('Active program')
			.setDesc('Select a training program to follow. The next workout will be shown on the home screen.');

		// Load programs and populate dropdown
		const programRepo = new ProgramRepository(this.app, this.plugin.settings.basePath);
		void programRepo.list().then(programs => {
			programSetting.addDropdown(dropdown => {
				dropdown.addOption('', 'None');
				for (const program of programs) {
					dropdown.addOption(program.id, program.name);
				}
				dropdown.setValue(this.plugin.settings.activeProgram ?? '');
				dropdown.onChange(async (value) => {
					this.plugin.settings.activeProgram = value || undefined;
					// Reset index when changing programs
					this.plugin.settings.programWorkoutIndex = 0;
					await this.plugin.saveSettings();
				});
			});
		});

		// Display section
		containerEl.createEl('h3', { text: 'Display' });

		new Setting(containerEl)
			.setName('Bottom padding')
			.setDesc('Extra padding at the bottom of screens (in pixels). Increase if content is hidden by mobile navigation bars.')
			.addText(text => text
				.setPlaceholder('100')
				.setValue(String(this.plugin.settings.bottomPadding))
				.onChange(async (value) => {
					const parsed = parseInt(value, 10);
					if (!isNaN(parsed) && parsed >= 0) {
						this.plugin.settings.bottomPadding = parsed;
						await this.plugin.saveSettings();
					}
				}));

		// Weight increments for kg
		containerEl.createEl('h3', { text: 'Weight increments' });

		new Setting(containerEl)
			.setName('Kilogram increments')
			.setDesc('Comma-separated weight increments for kilograms.')
			.addText(text => text
				.setPlaceholder('10, 2.5, 0.5, 0.25')
				.setValue(this.plugin.settings.weightIncrementsKg.join(', '))
				.onChange(async (value) => {
					const increments = value.split(',')
						.map(s => parseFloat(s.trim()))
						.filter(n => !isNaN(n) && n > 0);
					if (increments.length > 0) {
						this.plugin.settings.weightIncrementsKg = increments;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Pound increments')
			.setDesc('Comma-separated weight increments for pounds.')
			.addText(text => text
				.setPlaceholder('45, 10, 5, 2.5')
				.setValue(this.plugin.settings.weightIncrementsLbs.join(', '))
				.onChange(async (value) => {
					const increments = value.split(',')
						.map(s => parseFloat(s.trim()))
						.filter(n => !isNaN(n) && n > 0);
					if (increments.length > 0) {
						this.plugin.settings.weightIncrementsLbs = increments;
						await this.plugin.saveSettings();
					}
				}));

		// Exercise database
		containerEl.createEl('h3', { text: 'Exercise database' });

		// Show database status
		const dbInfo = this.plugin.databaseExerciseRepo.getInfo();
		const statusText = dbInfo
			? `${dbInfo.count} exercises (downloaded ${new Date(dbInfo.importedAt).toLocaleDateString()})`
			: 'Not downloaded';

		new Setting(containerEl)
			.setName('Exercise database')
			.setDesc(`Status: ${statusText}. The database is stored locally and not synced. Download on each device.`)
			.addButton(button => button
				.setButtonText(dbInfo ? 'Re-download' : 'Download')
				.onClick(async () => {
					await this.plugin.downloadExerciseDatabase();
					// Refresh the settings tab to show updated status
					this.display();
				}));

		// Migration option (only show if database is downloaded)
		if (dbInfo) {
			new Setting(containerEl)
				.setName('Clean up duplicate files')
				.setDesc('If you previously imported exercises as files, this removes duplicates that now come from the database. Custom exercises are kept.')
				.addButton(button => button
					.setButtonText('Clean up')
					.onClick(async () => {
						await this.plugin.migrateExercises();
					}));

			new Setting(containerEl)
				.setName('Update workout references')
				.setDesc('Updates workout files to use plain text for database exercises and wikilinks for custom exercises. Run this after downloading the database.')
				.addButton(button => button
					.setButtonText('Update workouts')
					.onClick(async () => {
						await this.plugin.migrateWorkouts();
					}));
		}
	}
}
