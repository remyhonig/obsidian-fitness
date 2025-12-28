import { vi } from 'vitest';

// Mock setIcon function
export function setIcon(el: HTMLElement, iconId: string): void {
	el.addClass('svg-icon');
	el.dataset.icon = iconId;
}

// Mock TFile class
export class TFile {
	path: string;
	name: string;
	extension: string;

	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() ?? '';
		this.extension = this.name.split('.').pop() ?? '';
	}
}

// Mock TFolder class
export class TFolder {
	path: string;
	children: (TFile | TFolder)[];

	constructor(path: string, children: (TFile | TFolder)[] = []) {
		this.path = path;
		this.children = children;
	}
}

// Mock Notice class
export class Notice {
	message: string;

	constructor(message: string, _timeout?: number) {
		this.message = message;
	}

	hide(): void {}
}

// Mock Modal class
export class Modal {
	app: unknown;
	contentEl: HTMLElement;

	constructor(app: unknown) {
		this.app = app;
		this.contentEl = document.createElement('div');
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

// Mock FuzzySuggestModal class
export class FuzzySuggestModal<T> {
	app: unknown;
	inputEl: HTMLInputElement;
	resultContainerEl: HTMLElement;

	constructor(app: unknown) {
		this.app = app;
		this.inputEl = document.createElement('input');
		this.resultContainerEl = document.createElement('div');
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
	getItems(): T[] { return []; }
	getItemText(_item: T): string { return ''; }
	onChooseItem(_item: T, _evt: MouseEvent | KeyboardEvent): void {}
	renderSuggestion(_item: T, _el: HTMLElement): void {}
}

// Mock App class
export class App {
	vault = {};
	workspace = {};
	fileManager = {};
}

// Mock Plugin class
export class Plugin {
	app: App;
	manifest = { id: 'test-plugin', name: 'Test Plugin', version: '1.0.0' };

	constructor(app: App) {
		this.app = app;
	}

	loadData = vi.fn().mockResolvedValue({});
	saveData = vi.fn().mockResolvedValue(undefined);
	addCommand = vi.fn();
	addRibbonIcon = vi.fn();
	addSettingTab = vi.fn();
	registerView = vi.fn();
}

// Mock ItemView class
export class ItemView {
	app: App;
	containerEl: HTMLElement;
	leaf: unknown;

	constructor() {
		this.app = new App();
		this.containerEl = document.createElement('div');
	}

	getViewType(): string { return 'test-view'; }
	getDisplayText(): string { return 'Test View'; }
	onOpen(): Promise<void> { return Promise.resolve(); }
	onClose(): Promise<void> { return Promise.resolve(); }
}

// Mock Setting class
export class Setting {
	settingEl: HTMLElement;

	constructor(_containerEl: HTMLElement) {
		this.settingEl = document.createElement('div');
	}

	setName(_name: string): this { return this; }
	setDesc(_desc: string): this { return this; }
	addText(_cb: (text: unknown) => unknown): this { return this; }
	addTextArea(_cb: (area: unknown) => unknown): this { return this; }
	addToggle(_cb: (toggle: unknown) => unknown): this { return this; }
	addDropdown(_cb: (dropdown: unknown) => unknown): this { return this; }
	addSlider(_cb: (slider: unknown) => unknown): this { return this; }
	addButton(_cb: (button: unknown) => unknown): this { return this; }
}

// Mock PluginSettingTab class
export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement('div');
	}

	display(): void {}
	hide(): void {}
}

// Export default for module resolution
export default {
	setIcon,
	TFile,
	TFolder,
	Notice,
	Modal,
	FuzzySuggestModal,
	App,
	Plugin,
	ItemView,
	Setting,
	PluginSettingTab
};
