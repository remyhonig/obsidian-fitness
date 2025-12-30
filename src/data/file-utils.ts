/**
 * Core filesystem utilities and re-exports from specialized modules
 */

import { App, TFile, TFolder } from 'obsidian';

// Re-export from specialized modules for backward compatibility
export {
	parseFrontmatter,
	toFrontmatter,
	createFileContent
} from './yaml-utils';

export {
	parseMarkdownTable,
	createMarkdownTable
} from './table-utils';

export {
	type WorkoutExerciseRow,
	extractExerciseId,
	extractWikiLinkName,
	isWikiLink,
	parseWorkoutBody,
	createWorkoutBody
} from './workout-body';

export {
	type SessionSetRow,
	type SessionExerciseBlock,
	parseSessionBody,
	createSessionBody,
	createPreviousExercisesBody
} from './session-body';

export {
	createSessionReviewBody,
	parseSessionReviewBody
} from './review-body';

export {
	parseDescriptionSection,
	parseProgramBody,
	createProgramBody,
	createCoachFeedbackBody,
	parseCoachFeedbackBody
} from './program-body';

// ========== Core Filesystem Operations ==========

/**
 * Ensures a folder exists, creating it and any parent folders if necessary
 */
export async function ensureFolder(app: App, path: string): Promise<TFolder> {
	const existing = app.vault.getFolderByPath(path);
	if (existing) {
		return existing;
	}

	// Create parent folders first if needed
	const parts = path.split('/');
	let currentPath = '';

	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}/${part}` : part;
		const folder = app.vault.getFolderByPath(currentPath);
		if (!folder) {
			try {
				await app.vault.createFolder(currentPath);
			} catch (e) {
				// Folder might already exist due to race condition
				if (!app.vault.getFolderByPath(currentPath)) {
					throw e;
				}
			}
		}
	}

	const folder = app.vault.getFolderByPath(path);
	if (!folder) {
		throw new Error(`Failed to create folder: ${path}`);
	}
	return folder;
}

/**
 * Gets all markdown files in a folder
 */
export function getFilesInFolder(app: App, folderPath: string): TFile[] {
	const folder = app.vault.getFolderByPath(folderPath);
	if (!folder) {
		return [];
	}

	const files: TFile[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === 'md') {
			files.push(child);
		}
	}
	return files;
}

/**
 * Generates a safe filename from a string
 */
export function toFilename(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Extracts ID from a file path (filename without extension)
 */
export function getIdFromPath(path: string): string {
	const parts = path.split('/');
	const filename = parts[parts.length - 1] ?? '';
	return filename.replace(/\.md$/, '');
}
