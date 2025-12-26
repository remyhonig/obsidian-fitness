import { App, TFile } from 'obsidian';
import type { Program } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	toFilename,
	parseFrontmatter,
	createFileContent,
	parseProgramBody,
	createProgramBody
} from './file-utils';

// Frontmatter only contains metadata, not workouts
interface ProgramMetadata {
	name: string;
	description?: string;
}

export class ProgramRepository {
	private basePath: string;

	constructor(
		private app: App,
		basePath: string
	) {
		this.basePath = `${basePath}/Programs`;
	}

	/**
	 * Updates the base path (when settings change)
	 */
	setBasePath(basePath: string): void {
		this.basePath = `${basePath}/Programs`;
	}

	/**
	 * Ensures the programs folder exists
	 */
	async ensureFolder(): Promise<void> {
		await ensureFolder(this.app, this.basePath);
	}

	/**
	 * Gets all programs
	 */
	async list(): Promise<Program[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const programs: Program[] = [];

		for (const file of files) {
			const program = await this.parseProgramFile(file);
			if (program) {
				programs.push(program);
			}
		}

		// Sort by name
		programs.sort((a, b) => a.name.localeCompare(b.name));
		return programs;
	}

	/**
	 * Gets a single program by ID
	 */
	async get(id: string): Promise<Program | null> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			return null;
		}
		return this.parseProgramFile(file);
	}

	/**
	 * Gets a single program by name
	 */
	async getByName(name: string): Promise<Program | null> {
		const programs = await this.list();
		return programs.find(p => p.name.toLowerCase() === name.toLowerCase()) ?? null;
	}

	/**
	 * Creates a new program
	 */
	async create(program: Omit<Program, 'id'>): Promise<Program> {
		await this.ensureFolder();

		const id = toFilename(program.name);
		const path = `${this.basePath}/${id}.md`;

		// Check if already exists
		if (this.app.vault.getFileByPath(path)) {
			throw new Error(`Program already exists: ${program.name}`);
		}

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			name: program.name,
			description: program.description
		};

		// Body: ordered list of workout wikilinks
		const body = createProgramBody(program.workouts);

		const content = createFileContent(frontmatter, body);
		await this.app.vault.create(path, content);

		return { id, ...program };
	}

	/**
	 * Updates an existing program
	 */
	async update(id: string, updates: Partial<Omit<Program, 'id'>>): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			throw new Error(`Program not found: ${id}`);
		}

		const existing = await this.get(id);
		if (!existing) {
			throw new Error(`Program not found: ${id}`);
		}

		const updated = { ...existing, ...updates };

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			name: updated.name,
			description: updated.description
		};

		// Body: ordered list of workout wikilinks
		const body = createProgramBody(updated.workouts);

		const content = createFileContent(frontmatter, body);
		await this.app.vault.modify(file, content);
	}

	/**
	 * Deletes a program
	 */
	async delete(id: string): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}

	/**
	 * Parses a program file into a Program object
	 */
	private async parseProgramFile(file: TFile): Promise<Program | null> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const { frontmatter, body } = parseFrontmatter<ProgramMetadata>(content);

			if (!frontmatter?.name) {
				return null;
			}

			// Parse workouts from body list
			const workouts = parseProgramBody(body);

			return {
				id: getIdFromPath(file.path),
				name: frontmatter.name,
				description: frontmatter.description,
				workouts
			};
		} catch {
			return null;
		}
	}
}
