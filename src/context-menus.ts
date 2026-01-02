import { App, Menu, Notice, TAbstractFile, TFile, TFolder } from 'obsidian';
import type MainPlugin from './main';
import { TEMPLATES } from './data/bootstrap';
import { ensureFolder } from './data/file-utils';

/**
 * Registers folder-specific context menu items for Exercises and Programs folders
 */
export function registerContextMenus(plugin: MainPlugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on('file-menu', (menu, file) => {
			handleFileMenu(menu, file, plugin);
		})
	);
}

function handleFileMenu(menu: Menu, file: TAbstractFile, plugin: MainPlugin): void {
	if (!(file instanceof TFolder)) return;

	const basePath = plugin.settings.basePath;
	const exercisesPath = `${basePath}/Exercises`;
	const programsPath = `${basePath}/Programs`;

	if (file.path === exercisesPath) {
		menu.addItem((item) => {
			item.setTitle('Add exercise')
				.setIcon('plus')
				.setSection('action')
				.onClick(() => {
					void createExerciseFile(plugin.app, exercisesPath);
				});
		});
	}

	if (file.path === programsPath) {
		menu.addItem((item) => {
			item.setTitle('Add program')
				.setIcon('plus')
				.setSection('action')
				.onClick(() => {
					void createProgramFile(plugin.app, programsPath);
				});
		});
	}
}

async function createExerciseFile(app: App, exercisesPath: string): Promise<void> {
	const filename = generateUniqueFilename(app, exercisesPath, 'new-exercise');
	const filePath = `${exercisesPath}/${filename}.md`;

	// Remove the "copy this file" instruction from template since it's already a new file
	const content = TEMPLATES.exercise.content.replace(
		/\n\*\*Copy this file.*?\*\*\n?/,
		'\n'
	);

	try {
		await ensureFolder(app, exercisesPath);
		const file = await app.vault.create(filePath, content);
		await openFileInEditor(app, file);
	} catch (error) {
		console.error('[Fit] Failed to create exercise file:', error);
		new Notice(`Failed to create exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function createProgramFile(app: App, programsPath: string): Promise<void> {
	const filename = generateUniqueFilename(app, programsPath, 'new-program');
	const filePath = `${programsPath}/${filename}.md`;

	// Remove the "copy this file" instruction from template since it's already a new file
	const content = TEMPLATES.program.content.replace(
		/\n\*\*Copy this file.*?\*\*\n?/,
		'\n'
	);

	try {
		await ensureFolder(app, programsPath);
		const file = await app.vault.create(filePath, content);
		await openFileInEditor(app, file);
	} catch (error) {
		console.error('[Fit] Failed to create program file:', error);
		new Notice(`Failed to create program: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

function generateUniqueFilename(app: App, folderPath: string, baseName: string): string {
	let filename = baseName;
	let counter = 1;

	while (app.vault.getFileByPath(`${folderPath}/${filename}.md`)) {
		filename = `${baseName}-${counter}`;
		counter++;
	}

	return filename;
}

async function openFileInEditor(app: App, file: TFile): Promise<void> {
	const leaf = app.workspace.getLeaf(false);
	await leaf.openFile(file);
}
