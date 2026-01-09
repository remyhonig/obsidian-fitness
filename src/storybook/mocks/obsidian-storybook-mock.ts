/**
 * Extended Obsidian mock for Storybook
 *
 * Provides mock implementations of Obsidian APIs used by React components.
 * Uses in-memory storage for file operations.
 */

// In-memory file storage for Storybook
const fileStorage = new Map<string, { content: string; stat: { mtime: number } }>();

export class TFile {
	path: string;
	basename: string;
	name: string;
	extension: string;
	stat: { mtime: number };

	constructor(path: string, mtime?: number) {
		this.path = path;
		this.name = path.split('/').pop() ?? '';
		this.basename = this.name.replace(/\.[^.]+$/, '');
		this.extension = this.name.split('.').pop() ?? '';
		this.stat = { mtime: mtime ?? Date.now() };
	}
}

export class TFolder {
	path: string;
	children: (TFile | TFolder)[];

	constructor(path: string, children: (TFile | TFolder)[] = []) {
		this.path = path;
		this.children = children;
	}
}

export class Notice {
	message: string;

	constructor(message: string, _timeout?: number) {
		this.message = message;
		console.log('[Notice]', message);
	}

	hide(): void {}
}

// Component class for MarkdownRenderer lifecycle
export class Component {
	load(): void {}
	unload(): void {}
}

// MarkdownRenderer mock - converts markdown to basic HTML
export const MarkdownRenderer = {
	render: async (
		_app: unknown,
		markdown: string,
		el: HTMLElement,
		_sourcePath: string,
		_component: Component
	): Promise<void> => {
		// Simple markdown to HTML conversion for Storybook preview
		const html = markdown
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/^- (.+)$/gm, '<li>$1</li>')
			.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
		el.innerHTML = `<p>${html}</p>`;
	},
};

type EventHandler = (...args: unknown[]) => void;
const eventHandlers = new Map<string, Set<EventHandler>>();

export class App {
	vault = {
		getMarkdownFiles: (): TFile[] => {
			return Array.from(fileStorage.keys())
				.filter(p => p.endsWith('.md'))
				.map(p => new TFile(p, fileStorage.get(p)?.stat.mtime));
		},

		read: async (file: TFile): Promise<string> => {
			const stored = fileStorage.get(file.path);
			if (!stored) throw new Error(`File not found: ${file.path}`);
			return stored.content;
		},

		getAbstractFileByPath: (path: string): TFile | TFolder | null => {
			if (fileStorage.has(path)) {
				return new TFile(path, fileStorage.get(path)?.stat.mtime);
			}
			// Check if it's a folder
			const isFolder = Array.from(fileStorage.keys()).some(p => p.startsWith(path + '/'));
			if (isFolder) {
				return new TFolder(path);
			}
			return null;
		},

		create: async (path: string, content: string): Promise<TFile> => {
			fileStorage.set(path, { content, stat: { mtime: Date.now() } });
			return new TFile(path);
		},

		modify: async (file: TFile, content: string): Promise<void> => {
			fileStorage.set(file.path, { content, stat: { mtime: Date.now() } });
		},

		createFolder: async (_path: string): Promise<void> => {
			// No-op for in-memory storage
		},

		on: (event: string, handler: EventHandler): { unload: () => void } => {
			if (!eventHandlers.has(event)) {
				eventHandlers.set(event, new Set());
			}
			eventHandlers.get(event)!.add(handler);
			return {
				unload: () => {
					eventHandlers.get(event)?.delete(handler);
				}
			};
		},

		off: (event: string, handler: EventHandler): void => {
			eventHandlers.get(event)?.delete(handler);
		},
	};

	workspace = {
		getLeaf: () => ({
			openFile: async (file: TFile): Promise<void> => {
				console.log('[Storybook] Would open file:', file.path);
			},
		}),
	};

	fileManager = {};
}

// Helper to populate file storage for stories
export function setStorybookFiles(files: Record<string, string>): void {
	fileStorage.clear();
	for (const [path, content] of Object.entries(files)) {
		fileStorage.set(path, { content, stat: { mtime: Date.now() } });
	}
}

// Helper to add a single file
export function addStorybookFile(path: string, content: string): void {
	fileStorage.set(path, { content, stat: { mtime: Date.now() } });
}

// Helper to clear all files
export function clearStorybookFiles(): void {
	fileStorage.clear();
}

// Mock setIcon function
export function setIcon(el: HTMLElement, iconId: string): void {
	el.classList.add('svg-icon');
	el.dataset.icon = iconId;
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

// Mock Plugin class
export class Plugin {
	app: App;
	manifest = { id: 'obsidian-fit', name: 'Fitness', version: '1.0.0' };

	constructor(app: App) {
		this.app = app;
	}

	loadData = async (): Promise<Record<string, unknown>> => ({});
	saveData = async (_data: unknown): Promise<void> => {};
	addCommand = (): void => {};
	addRibbonIcon = (): void => {};
	addSettingTab = (): void => {};
	registerView = (): void => {};
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
	PluginSettingTab,
	MarkdownRenderer,
	Component,
};
