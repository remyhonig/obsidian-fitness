import { App, TFile } from 'obsidian';
import type { Template, TemplateExercise } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	toFilename,
	parseFrontmatter,
	createFileContent,
	parseTemplateBody,
	createTemplateBody
} from './file-utils';

// Frontmatter only contains metadata, not exercises
interface TemplateMetadata {
	name: string;
	description?: string;
	estimatedDuration?: number;
}

export class TemplateRepository {
	private basePath: string;

	constructor(
		private app: App,
		basePath: string
	) {
		this.basePath = `${basePath}/Templates`;
	}

	/**
	 * Updates the base path (when settings change)
	 */
	setBasePath(basePath: string): void {
		this.basePath = `${basePath}/Templates`;
	}

	/**
	 * Ensures the templates folder exists
	 */
	async ensureFolder(): Promise<void> {
		await ensureFolder(this.app, this.basePath);
	}

	/**
	 * Gets all templates
	 */
	async list(): Promise<Template[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const templates: Template[] = [];

		for (const file of files) {
			const template = await this.parseTemplateFile(file);
			if (template) {
				templates.push(template);
			}
		}

		// Sort by name
		templates.sort((a, b) => a.name.localeCompare(b.name));
		return templates;
	}

	/**
	 * Gets a single template by ID
	 */
	async get(id: string): Promise<Template | null> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			return null;
		}
		return this.parseTemplateFile(file);
	}

	/**
	 * Gets a single template by name
	 */
	async getByName(name: string): Promise<Template | null> {
		const templates = await this.list();
		return templates.find(t => t.name.toLowerCase() === name.toLowerCase()) ?? null;
	}

	/**
	 * Creates a new template
	 */
	async create(template: Omit<Template, 'id'>): Promise<Template> {
		await this.ensureFolder();

		const id = toFilename(template.name);
		const path = `${this.basePath}/${id}.md`;

		// Check if already exists
		if (this.app.vault.getFileByPath(path)) {
			throw new Error(`Template already exists: ${template.name}`);
		}

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			name: template.name,
			description: template.description,
			estimatedDuration: template.estimatedDuration
		};

		// Body: exercises table
		const body = createTemplateBody(
			template.exercises.map(e => ({
				exercise: e.exercise,
				sets: e.targetSets,
				repsMin: e.targetRepsMin,
				repsMax: e.targetRepsMax,
				restSeconds: e.restSeconds
			}))
		);

		const content = createFileContent(frontmatter, body);
		await this.app.vault.create(path, content);

		return { id, ...template };
	}

	/**
	 * Updates an existing template
	 */
	async update(id: string, updates: Partial<Omit<Template, 'id'>>): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			throw new Error(`Template not found: ${id}`);
		}

		const existing = await this.get(id);
		if (!existing) {
			throw new Error(`Template not found: ${id}`);
		}

		const updated = { ...existing, ...updates };

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			name: updated.name,
			description: updated.description,
			estimatedDuration: updated.estimatedDuration
		};

		// Body: exercises table
		const body = createTemplateBody(
			updated.exercises.map(e => ({
				exercise: e.exercise,
				sets: e.targetSets,
				repsMin: e.targetRepsMin,
				repsMax: e.targetRepsMax,
				restSeconds: e.restSeconds
			}))
		);

		const content = createFileContent(frontmatter, body);
		await this.app.vault.modify(file, content);
	}

	/**
	 * Deletes a template
	 */
	async delete(id: string): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}

	/**
	 * Duplicates a template with a new name
	 */
	async duplicate(id: string, newName: string): Promise<Template> {
		const existing = await this.get(id);
		if (!existing) {
			throw new Error(`Template not found: ${id}`);
		}

		return this.create({
			name: newName,
			description: existing.description,
			estimatedDuration: existing.estimatedDuration,
			exercises: [...existing.exercises]
		});
	}

	/**
	 * Searches templates by name
	 */
	async search(query: string): Promise<Template[]> {
		const templates = await this.list();
		const lowerQuery = query.toLowerCase();

		return templates.filter(t =>
			t.name.toLowerCase().includes(lowerQuery) ||
			t.description?.toLowerCase().includes(lowerQuery)
		);
	}

	/**
	 * Parses a template file into a Template object
	 */
	private async parseTemplateFile(file: TFile): Promise<Template | null> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const { frontmatter, body } = parseFrontmatter<TemplateMetadata>(content);

			if (!frontmatter?.name) {
				return null;
			}

			// Parse exercises from body table
			const exerciseRows = parseTemplateBody(body);
			const exercises: TemplateExercise[] = exerciseRows.map(row => ({
				exercise: row.exercise,
				targetSets: row.sets,
				targetRepsMin: row.repsMin,
				targetRepsMax: row.repsMax,
				restSeconds: row.restSeconds
			}));

			return {
				id: getIdFromPath(file.path),
				name: frontmatter.name,
				description: frontmatter.description,
				estimatedDuration: frontmatter.estimatedDuration,
				exercises
			};
		} catch {
			return null;
		}
	}
}
