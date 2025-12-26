import { App, TFile } from 'obsidian';
import type { Exercise, ExerciseFrontmatter } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	toFilename,
	parseFrontmatter,
	createFileContent
} from './file-utils';

export class ExerciseRepository {
	private basePath: string;

	constructor(
		private app: App,
		basePath: string
	) {
		this.basePath = `${basePath}/Exercises`;
	}

	/**
	 * Updates the base path (when settings change)
	 */
	setBasePath(basePath: string): void {
		this.basePath = `${basePath}/Exercises`;
	}

	/**
	 * Ensures the exercises folder exists
	 */
	async ensureFolder(): Promise<void> {
		await ensureFolder(this.app, this.basePath);
	}

	/**
	 * Gets all exercises
	 */
	async list(): Promise<Exercise[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const exercises: Exercise[] = [];

		for (const file of files) {
			const exercise = await this.parseExerciseFile(file);
			if (exercise) {
				exercises.push(exercise);
			}
		}

		// Sort by name
		exercises.sort((a, b) => a.name.localeCompare(b.name));
		return exercises;
	}

	/**
	 * Gets a single exercise by ID
	 */
	async get(id: string): Promise<Exercise | null> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			return null;
		}
		return this.parseExerciseFile(file);
	}

	/**
	 * Gets a single exercise by name or ID (slug)
	 * Handles cases where the name might be a title-cased slug
	 */
	async getByName(name: string): Promise<Exercise | null> {
		const exercises = await this.list();
		const nameLower = name.toLowerCase();
		const nameSlug = nameLower.replace(/\s+/g, '-');

		// Try exact name match first, then ID match
		return exercises.find(e => e.name.toLowerCase() === nameLower) ??
			exercises.find(e => e.id.toLowerCase() === nameSlug) ??
			null;
	}

	/**
	 * Creates a new exercise
	 */
	async create(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
		await this.ensureFolder();

		const id = toFilename(exercise.name);
		const path = `${this.basePath}/${id}.md`;

		// Check if already exists
		if (this.app.vault.getFileByPath(path)) {
			throw new Error(`Exercise already exists: ${exercise.name}`);
		}

		const frontmatter: Record<string, unknown> = {
			name: exercise.name,
			category: exercise.category,
			equipment: exercise.equipment,
			muscleGroups: exercise.muscleGroups,
			defaultWeight: exercise.defaultWeight,
			weightIncrement: exercise.weightIncrement,
			image0: exercise.image0,
			image1: exercise.image1
		};

		const content = createFileContent(frontmatter, exercise.notes);
		await this.app.vault.create(path, content);

		return { id, ...exercise };
	}

	/**
	 * Updates an existing exercise
	 */
	async update(id: string, updates: Partial<Omit<Exercise, 'id'>>): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			throw new Error(`Exercise not found: ${id}`);
		}

		const existing = await this.get(id);
		if (!existing) {
			throw new Error(`Exercise not found: ${id}`);
		}

		const updated = { ...existing, ...updates };
		const frontmatter: Record<string, unknown> = {
			name: updated.name,
			category: updated.category,
			equipment: updated.equipment,
			muscleGroups: updated.muscleGroups,
			defaultWeight: updated.defaultWeight,
			weightIncrement: updated.weightIncrement,
			image0: updated.image0,
			image1: updated.image1
		};

		const content = createFileContent(frontmatter, updated.notes);
		await this.app.vault.modify(file, content);
	}

	/**
	 * Deletes an exercise
	 */
	async delete(id: string): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}

	/**
	 * Searches exercises by name
	 */
	async search(query: string): Promise<Exercise[]> {
		const exercises = await this.list();
		const lowerQuery = query.toLowerCase();

		return exercises.filter(e =>
			e.name.toLowerCase().includes(lowerQuery) ||
			e.category?.toLowerCase().includes(lowerQuery) ||
			e.equipment?.toLowerCase().includes(lowerQuery) ||
			e.muscleGroups?.some(m => m.toLowerCase().includes(lowerQuery))
		);
	}

	/**
	 * Parses an exercise file into an Exercise object
	 */
	private async parseExerciseFile(file: TFile): Promise<Exercise | null> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const { frontmatter, body } = parseFrontmatter<ExerciseFrontmatter>(content);

			if (!frontmatter?.name) {
				return null;
			}

			return {
				id: getIdFromPath(file.path),
				name: frontmatter.name,
				category: frontmatter.category,
				equipment: frontmatter.equipment,
				muscleGroups: frontmatter.muscleGroups,
				defaultWeight: frontmatter.defaultWeight,
				weightIncrement: frontmatter.weightIncrement,
				image0: frontmatter.image0,
				image1: frontmatter.image1,
				notes: body.trim() || undefined
			};
		} catch {
			return null;
		}
	}
}
