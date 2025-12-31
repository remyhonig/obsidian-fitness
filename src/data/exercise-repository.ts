import { App, TFile } from 'obsidian';
import type { Exercise, ExerciseFrontmatter } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	parseFrontmatter,
	createFileContent
} from './file-utils';
import { toSlug } from '../domain/identifier';
import type { DatabaseExerciseRepository } from './database-exercise-repository';

export class ExerciseRepository {
	private basePath: string;
	private databaseRepo: DatabaseExerciseRepository | null = null;

	constructor(
		private app: App,
		basePath: string
	) {
		this.basePath = `${basePath}/Exercises`;
	}

	/**
	 * Sets the database repository for merged queries
	 */
	setDatabaseRepository(repo: DatabaseExerciseRepository): void {
		this.databaseRepo = repo;
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
	 * Gets all exercises (custom + database, custom takes precedence)
	 */
	async list(): Promise<Exercise[]> {
		await this.ensureFolder();

		// Get custom exercises from files
		const files = getFilesInFolder(this.app, this.basePath);
		const customExercises: Exercise[] = [];
		const customIds = new Set<string>();

		for (const file of files) {
			const exercise = await this.parseExerciseFile(file);
			if (exercise) {
				customExercises.push(exercise);
				customIds.add(exercise.id);
			}
		}

		// Merge with database exercises (custom takes precedence)
		const allExercises = [...customExercises];
		if (this.databaseRepo) {
			for (const dbExercise of this.databaseRepo.list()) {
				if (!customIds.has(dbExercise.id)) {
					allExercises.push(dbExercise);
				}
			}
		}

		// Sort by name
		allExercises.sort((a, b) => a.name.localeCompare(b.name));
		return allExercises;
	}

	/**
	 * Gets only custom exercises (for migration/management)
	 */
	async listCustom(): Promise<Exercise[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const exercises: Exercise[] = [];

		for (const file of files) {
			const exercise = await this.parseExerciseFile(file);
			if (exercise) {
				exercises.push(exercise);
			}
		}

		exercises.sort((a, b) => a.name.localeCompare(b.name));
		return exercises;
	}

	/**
	 * Gets a single exercise by ID (checks custom first, then database)
	 */
	async get(id: string): Promise<Exercise | null> {
		// Check custom exercises first
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			return this.parseExerciseFile(file);
		}

		// Fall back to database
		if (this.databaseRepo) {
			return this.databaseRepo.get(id);
		}

		return null;
	}

	/**
	 * Gets a single exercise by name or ID (slug)
	 * Checks custom exercises first, then database
	 */
	async getByName(name: string): Promise<Exercise | null> {
		// Check custom exercises first
		const customExercises = await this.listCustom();
		const nameLower = name.toLowerCase();
		const nameSlug = nameLower.replace(/\s+/g, '-');

		const customMatch = customExercises.find(e => e.name.toLowerCase() === nameLower) ??
			customExercises.find(e => e.id.toLowerCase() === nameSlug);

		if (customMatch) {
			return customMatch;
		}

		// Fall back to database
		if (this.databaseRepo) {
			return this.databaseRepo.getByName(name);
		}

		return null;
	}

	/**
	 * Copies a database exercise to custom (for editing)
	 */
	async copyToCustom(id: string): Promise<Exercise | null> {
		if (!this.databaseRepo) return null;

		const dbExercise = this.databaseRepo.get(id);
		if (!dbExercise) return null;

		// Check if custom version already exists
		const existingPath = `${this.basePath}/${id}.md`;
		if (this.app.vault.getFileByPath(existingPath)) {
			// Already exists as custom, return it
			return this.get(id);
		}

		// Create custom copy
		const created = await this.create({
			name: dbExercise.name,
			category: dbExercise.category,
			equipment: dbExercise.equipment,
			muscleGroups: dbExercise.muscleGroups,
			defaultWeight: dbExercise.defaultWeight,
			weightIncrement: dbExercise.weightIncrement,
			image0: dbExercise.image0,
			image1: dbExercise.image1,
			notes: dbExercise.notes,
			source: 'custom'
		});

		return created;
	}

	/**
	 * Creates a new exercise
	 */
	async create(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
		await this.ensureFolder();

		const id = toSlug(exercise.name);
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
	 * Searches exercises by name (includes database exercises)
	 */
	async search(query: string): Promise<Exercise[]> {
		const exercises = await this.list(); // Already merges custom + database
		const lowerQuery = query.toLowerCase();

		return exercises.filter(e =>
			e.name.toLowerCase().includes(lowerQuery) ||
			e.category?.toLowerCase().includes(lowerQuery) ||
			e.equipment?.toLowerCase().includes(lowerQuery) ||
			e.muscleGroups?.some(m => m.toLowerCase().includes(lowerQuery))
		);
	}

	/**
	 * Migrates from file-based database imports to the new system
	 * Removes files that are identical to database entries
	 * Returns stats about the migration
	 */
	async migrateFromFileImports(): Promise<{ removed: number; kept: number }> {
		if (!this.databaseRepo) {
			return { removed: 0, kept: 0 };
		}

		const customExercises = await this.listCustom();
		let removed = 0;
		let kept = 0;

		for (const custom of customExercises) {
			const dbExercise = this.databaseRepo.get(custom.id);
			if (!dbExercise) {
				// Not in database, keep it
				kept++;
				continue;
			}

			// Compare key fields to see if it's been customized
			const isModified =
				custom.defaultWeight !== undefined ||
				custom.weightIncrement !== undefined ||
				this.notesAreModified(custom.notes, dbExercise.notes);

			if (isModified) {
				// User has customized it, keep the file
				kept++;
			} else {
				// It's a pure database import, remove the file
				await this.delete(custom.id);
				removed++;
			}
		}

		return { removed, kept };
	}

	/**
	 * Checks if notes have been meaningfully modified from database version
	 */
	private notesAreModified(customNotes: string | undefined, dbNotes: string | undefined): boolean {
		if (!customNotes && !dbNotes) return false;
		if (!customNotes || !dbNotes) return true;

		// Normalize whitespace and compare
		const normalizedCustom = customNotes.trim().replace(/\s+/g, ' ');
		const normalizedDb = dbNotes.trim().replace(/\s+/g, ' ');

		return normalizedCustom !== normalizedDb;
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
				notes: body.trim() || undefined,
				source: 'custom'
			};
		} catch {
			return null;
		}
	}
}
