import { App, PluginSettingTab as ObsidianPluginSettingTab, Setting } from 'obsidian';
import type MainPlugin from './main';
import type { WeightUnit } from './types';

export interface PluginSettings {
	basePath: string;
	weightUnit: WeightUnit;
	defaultRestSeconds: number;
	autoStartRestTimer: boolean;
	weightIncrementsKg: number[];
	weightIncrementsLbs: number[];
}

export const DEFAULT_SETTINGS: PluginSettings = {
	basePath: 'Fitness',
	weightUnit: 'kg',
	defaultRestSeconds: 120,
	autoStartRestTimer: true,
	weightIncrementsKg: [10, 2.5, 0.5, 0.25],
	weightIncrementsLbs: [45, 10, 5, 2.5]
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
			.setDesc('Base folder for exercises, templates, and sessions.')
			.addText(text => text
				.setPlaceholder('Fitness')
				.setValue(this.plugin.settings.basePath)
				.onChange(async (value) => {
					this.plugin.settings.basePath = value || 'Fitness';
					await this.plugin.saveSettings();
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
	}
}
