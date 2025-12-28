import { Setting } from 'obsidian';
import type MainPlugin from '../main';
import type { PluginSettings } from '../settings';

type SettingKey = keyof PluginSettings;

interface BaseSettingOptions {
	name: string;
	desc: string;
}

interface TextSettingOptions extends BaseSettingOptions {
	key: SettingKey;
	placeholder?: string;
	onSave?: () => Promise<void>;
}

interface NumberSettingOptions extends BaseSettingOptions {
	key: SettingKey;
	placeholder?: string;
	min?: number;
	max?: number;
}

interface ToggleSettingOptions extends BaseSettingOptions {
	key: SettingKey;
}

interface DropdownSettingOptions<T extends string> extends BaseSettingOptions {
	key: SettingKey;
	options: { value: T; label: string }[];
}

interface ArraySettingOptions extends BaseSettingOptions {
	key: SettingKey;
	placeholder?: string;
	parseFloat?: boolean;
}

interface ButtonSettingOptions extends BaseSettingOptions {
	buttonText: string;
	onClick: () => Promise<unknown>;
}

/**
 * Creates a text input setting
 */
export function createTextSetting(
	container: HTMLElement,
	plugin: MainPlugin,
	opts: TextSettingOptions
): Setting {
	return new Setting(container)
		.setName(opts.name)
		.setDesc(opts.desc)
		.addText(text => text
			.setPlaceholder(opts.placeholder ?? '')
			.setValue(String(plugin.settings[opts.key] ?? ''))
			.onChange(async (value) => {
				(plugin.settings[opts.key] as string) = value;
				await plugin.saveSettings();
				await opts.onSave?.();
			}));
}

/**
 * Creates a number input setting (integer)
 */
export function createNumberSetting(
	container: HTMLElement,
	plugin: MainPlugin,
	opts: NumberSettingOptions
): Setting {
	return new Setting(container)
		.setName(opts.name)
		.setDesc(opts.desc)
		.addText(text => text
			.setPlaceholder(opts.placeholder ?? '')
			.setValue(String(plugin.settings[opts.key]))
			.onChange(async (value) => {
				const parsed = parseInt(value, 10);
				if (isNaN(parsed)) return;
				if (opts.min !== undefined && parsed < opts.min) return;
				if (opts.max !== undefined && parsed > opts.max) return;
				(plugin.settings[opts.key] as number) = parsed;
				await plugin.saveSettings();
			}));
}

/**
 * Creates a toggle setting
 */
export function createToggleSetting(
	container: HTMLElement,
	plugin: MainPlugin,
	opts: ToggleSettingOptions
): Setting {
	return new Setting(container)
		.setName(opts.name)
		.setDesc(opts.desc)
		.addToggle(toggle => toggle
			.setValue(plugin.settings[opts.key] as boolean)
			.onChange(async (value) => {
				(plugin.settings[opts.key] as boolean) = value;
				await plugin.saveSettings();
			}));
}

/**
 * Creates a dropdown setting
 */
export function createDropdownSetting<T extends string>(
	container: HTMLElement,
	plugin: MainPlugin,
	opts: DropdownSettingOptions<T>
): Setting {
	return new Setting(container)
		.setName(opts.name)
		.setDesc(opts.desc)
		.addDropdown(dropdown => {
			for (const opt of opts.options) {
				dropdown.addOption(opt.value, opt.label);
			}
			dropdown.setValue(plugin.settings[opts.key] as string);
			dropdown.onChange(async (value) => {
				(plugin.settings[opts.key] as string) = value as T;
				await plugin.saveSettings();
			});
		});
}

/**
 * Creates a comma-separated array setting
 */
export function createArraySetting(
	container: HTMLElement,
	plugin: MainPlugin,
	opts: ArraySettingOptions
): Setting {
	const currentValue = plugin.settings[opts.key] as number[];
	return new Setting(container)
		.setName(opts.name)
		.setDesc(opts.desc)
		.addText(text => text
			.setPlaceholder(opts.placeholder ?? '')
			.setValue(currentValue.join(', '))
			.onChange(async (value) => {
				const parser = opts.parseFloat ? parseFloat : parseInt;
				const increments = value.split(',')
					.map(s => parser(s.trim()))
					.filter(n => !isNaN(n) && n > 0);
				if (increments.length > 0) {
					(plugin.settings[opts.key] as number[]) = increments;
					await plugin.saveSettings();
				}
			}));
}

/**
 * Creates a button setting
 */
export function createButtonSetting(
	container: HTMLElement,
	opts: ButtonSettingOptions
): Setting {
	return new Setting(container)
		.setName(opts.name)
		.setDesc(opts.desc)
		.addButton(button => button
			.setButtonText(opts.buttonText)
			.onClick(() => { void opts.onClick(); }));
}

/**
 * Creates a section heading
 */
export function createSettingHeading(
	container: HTMLElement,
	text: string,
	level: 'h2' | 'h3' = 'h3'
): void {
	container.createEl(level, { text });
}
