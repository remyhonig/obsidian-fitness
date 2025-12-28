import { App, PluginSettingTab as ObsidianPluginSettingTab, Setting } from 'obsidian';
import type MainPlugin from './main';
import type { WeightUnit } from './types';
import { ProgramRepository } from './data/program-repository';
import { bootstrapDataFolder } from './data/bootstrap';
import {
	createTextSetting,
	createNumberSetting,
	createToggleSetting,
	createDropdownSetting,
	createArraySetting,
	createButtonSetting,
	createSettingHeading
} from './ui/settings-helpers';

export interface PluginSettings {
	basePath: string;
	weightUnit: WeightUnit;
	defaultRestSeconds: number;
	autoStartRestTimer: boolean;
	weightIncrementsKg: number[];
	weightIncrementsLbs: number[];
	activeProgram?: string;
	programWorkoutIndex: number;
	bottomPadding: number;
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

		createSettingHeading(containerEl, 'Fit settings', 'h2');

		createTextSetting(containerEl, this.plugin, {
			name: 'Data folder',
			desc: 'Base folder for exercises, workouts, and sessions.',
			key: 'basePath',
			placeholder: 'Fitness',
			onSave: () => bootstrapDataFolder(this.app, this.plugin.settings.basePath)
		});

		createDropdownSetting(containerEl, this.plugin, {
			name: 'Weight unit',
			desc: 'Unit for displaying and logging weights.',
			key: 'weightUnit',
			options: [
				{ value: 'kg', label: 'Kilograms' },
				{ value: 'lbs', label: 'Pounds' }
			]
		});

		createNumberSetting(containerEl, this.plugin, {
			name: 'Break time',
			desc: 'How long to pause between sets',
			key: 'defaultRestSeconds',
			placeholder: '120',
			min: 1
		});

		createToggleSetting(containerEl, this.plugin, {
			name: 'Auto-start timer',
			desc: 'Start timer after each set',
			key: 'autoStartRestTimer'
		});

		// Program section - needs dynamic loading, keep inline
		createSettingHeading(containerEl, 'Training program');
		this.renderProgramSetting(containerEl);

		createSettingHeading(containerEl, 'Display');

		createNumberSetting(containerEl, this.plugin, {
			name: 'Bottom padding',
			desc: 'Extra padding at the bottom of screens (in pixels). Increase if content is hidden by mobile navigation bars.',
			key: 'bottomPadding',
			placeholder: '100',
			min: 0
		});

		createSettingHeading(containerEl, 'Weight increments');

		createArraySetting(containerEl, this.plugin, {
			name: 'Kilogram increments',
			desc: 'Comma-separated weight increments for kilograms.',
			key: 'weightIncrementsKg',
			placeholder: '10, 2.5, 0.5, 0.25',
			parseFloat: true
		});

		createArraySetting(containerEl, this.plugin, {
			name: 'Pound increments',
			desc: 'Comma-separated weight increments for pounds.',
			key: 'weightIncrementsLbs',
			placeholder: '45, 10, 5, 2.5',
			parseFloat: true
		});

		createSettingHeading(containerEl, 'Exercise database');
		this.renderDatabaseSettings(containerEl);
	}

	private renderProgramSetting(containerEl: HTMLElement): void {
		const programSetting = new Setting(containerEl)
			.setName('Active program')
			.setDesc('Select a training program to follow. The next workout will be shown on the home screen.');

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
					this.plugin.settings.programWorkoutIndex = 0;
					await this.plugin.saveSettings();
				});
			});
		});
	}

	private renderDatabaseSettings(containerEl: HTMLElement): void {
		const dbInfo = this.plugin.databaseExerciseRepo.getInfo();
		const statusText = dbInfo
			? `${dbInfo.count} exercises (downloaded ${new Date(dbInfo.importedAt).toLocaleDateString()})`
			: 'Not downloaded';

		createButtonSetting(containerEl, {
			name: 'Exercise database',
			desc: `Status: ${statusText}. The database is stored locally and not synced. Download on each device.`,
			buttonText: dbInfo ? 'Re-download' : 'Download',
			onClick: async () => {
				await this.plugin.downloadExerciseDatabase();
				this.display();
			}
		});

		if (dbInfo) {
			createButtonSetting(containerEl, {
				name: 'Clean up duplicate files',
				desc: 'If you previously imported exercises as files, this removes duplicates that now come from the database. Custom exercises are kept.',
				buttonText: 'Clean up',
				onClick: () => this.plugin.migrateExercises()
			});

			createButtonSetting(containerEl, {
				name: 'Update workout references',
				desc: 'Updates workout files to use plain text for database exercises and wikilinks for custom exercises. Run this after downloading the database.',
				buttonText: 'Update workouts',
				onClick: () => this.plugin.migrateWorkouts()
			});
		}
	}
}
