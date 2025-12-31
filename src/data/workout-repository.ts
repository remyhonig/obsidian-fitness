import { App, TFile } from 'obsidian';
import type { Workout, WorkoutExercise, ExerciseSource } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	parseFrontmatter,
	createFileContent,
	parseWorkoutBody,
	createWorkoutBody
} from './file-utils';
import { toSlug } from '../domain/identifier';
import type { DatabaseExerciseRepository } from './database-exercise-repository';

// Frontmatter only contains metadata, not exercises
interface WorkoutMetadata {
	name: string;
	description?: string;
	estimatedDuration?: number;
}

export class WorkoutRepository {
	private basePath: string;
	private databaseRepo: DatabaseExerciseRepository | null = null;

	constructor(
		private app: App,
		basePath: string
	) {
		this.basePath = `${basePath}/Workouts`;
	}

	/**
	 * Sets the database repository for exercise name lookups
	 */
	setDatabaseRepository(repo: DatabaseExerciseRepository): void {
		this.databaseRepo = repo;
	}

	/**
	 * Updates the base path (when settings change)
	 */
	setBasePath(basePath: string): void {
		this.basePath = `${basePath}/Workouts`;
	}

	/**
	 * Ensures the workouts folder exists
	 */
	async ensureFolder(): Promise<void> {
		await ensureFolder(this.app, this.basePath);
	}

	/**
	 * Gets all workouts
	 */
	async list(): Promise<Workout[]> {
		await this.ensureFolder();
		const files = getFilesInFolder(this.app, this.basePath);
		const workouts: Workout[] = [];

		for (const file of files) {
			const workout = await this.parseWorkoutFile(file);
			if (workout) {
				workouts.push(workout);
			}
		}

		// Sort by name
		workouts.sort((a, b) => a.name.localeCompare(b.name));
		return workouts;
	}

	/**
	 * Gets a single workout by ID
	 */
	async get(id: string): Promise<Workout | null> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			return null;
		}
		return this.parseWorkoutFile(file);
	}

	/**
	 * Gets a single workout by name
	 */
	async getByName(name: string): Promise<Workout | null> {
		const workouts = await this.list();
		return workouts.find(w => w.name.toLowerCase() === name.toLowerCase()) ?? null;
	}

	/**
	 * Creates a new workout
	 */
	async create(workout: Omit<Workout, 'id'>): Promise<Workout> {
		await this.ensureFolder();

		const id = toSlug(workout.name);
		const path = `${this.basePath}/${id}.md`;

		// Check if already exists
		if (this.app.vault.getFileByPath(path)) {
			throw new Error(`Workout already exists: ${workout.name}`);
		}

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			name: workout.name,
			description: workout.description,
			estimatedDuration: workout.estimatedDuration
		};

		// Body: exercises table (with source info for proper formatting)
		const body = createWorkoutBody(
			workout.exercises.map(e => ({
				exercise: e.exercise,
				exerciseId: e.exerciseId,
				sets: e.targetSets,
				repsMin: e.targetRepsMin,
				repsMax: e.targetRepsMax,
				restSeconds: e.restSeconds,
				source: e.source
			}))
		);

		const content = createFileContent(frontmatter, body);
		await this.app.vault.create(path, content);

		return { id, ...workout };
	}

	/**
	 * Updates an existing workout
	 * Returns the new ID if the file was renamed, otherwise returns the original ID
	 */
	async update(id: string, updates: Partial<Omit<Workout, 'id'>>): Promise<string> {
		const path = `${this.basePath}/${id}.md`;
		let file = this.app.vault.getFileByPath(path);
		if (!file) {
			throw new Error(`Workout not found: ${id}`);
		}

		const existing = await this.get(id);
		if (!existing) {
			throw new Error(`Workout not found: ${id}`);
		}

		const updated = { ...existing, ...updates };

		// Frontmatter: metadata only
		const frontmatter: Record<string, unknown> = {
			name: updated.name,
			description: updated.description,
			estimatedDuration: updated.estimatedDuration
		};

		// Body: exercises table (with source info for proper formatting)
		const body = createWorkoutBody(
			updated.exercises.map(e => ({
				exercise: e.exercise,
				exerciseId: e.exerciseId,
				sets: e.targetSets,
				repsMin: e.targetRepsMin,
				repsMax: e.targetRepsMax,
				restSeconds: e.restSeconds,
				source: e.source
			}))
		);

		const content = createFileContent(frontmatter, body);
		await this.app.vault.modify(file, content);

		// If name changed, rename the file to match
		// This uses fileManager.renameFile which updates wikilinks in other files
		let newId = id;
		if (updates.name && toSlug(updates.name) !== id) {
			newId = toSlug(updates.name);
			const newPath = `${this.basePath}/${newId}.md`;

			// Check if target file already exists
			if (!this.app.vault.getFileByPath(newPath)) {
				// Re-fetch file reference after modify
				file = this.app.vault.getFileByPath(path);
				if (file) {
					await this.app.fileManager.renameFile(file, newPath);
				}
			}
		}

		return newId;
	}

	/**
	 * Deletes a workout
	 */
	async delete(id: string): Promise<void> {
		const path = `${this.basePath}/${id}.md`;
		const file = this.app.vault.getFileByPath(path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}

	/**
	 * Duplicates a workout with a new name
	 */
	async duplicate(id: string, newName: string): Promise<Workout> {
		const existing = await this.get(id);
		if (!existing) {
			throw new Error(`Workout not found: ${id}`);
		}

		return this.create({
			name: newName,
			description: existing.description,
			estimatedDuration: existing.estimatedDuration,
			exercises: [...existing.exercises]
		});
	}

	/**
	 * Searches workouts by name
	 */
	async search(query: string): Promise<Workout[]> {
		const workouts = await this.list();
		const lowerQuery = query.toLowerCase();

		return workouts.filter(w =>
			w.name.toLowerCase().includes(lowerQuery) ||
			w.description?.toLowerCase().includes(lowerQuery)
		);
	}

	/**
	 * Migrates workout files to use correct exercise reference format
	 * Database exercises: plain text ID
	 * Custom exercises: wikilinks [[id]]
	 */
	async migrateExerciseReferences(
		databaseRepo: DatabaseExerciseRepository
	): Promise<{ updated: number; skipped: number }> {
		const workouts = await this.list();
		let updated = 0;
		let skipped = 0;

		for (const workout of workouts) {
			let needsUpdate = false;
			const updatedExercises: WorkoutExercise[] = [];

			for (const exercise of workout.exercises) {
				// Determine the correct source based on database lookup
				const exerciseId = exercise.exerciseId ?? toSlug(exercise.exercise);
				const dbExercise = databaseRepo.get(exerciseId);
				const correctSource: ExerciseSource = dbExercise ? 'database' : 'custom';

				// Check if the stored source differs from the correct source
				if (exercise.source !== correctSource) {
					needsUpdate = true;
				}

				updatedExercises.push({
					...exercise,
					exerciseId,
					source: correctSource
				});
			}

			if (needsUpdate) {
				// Re-save the workout with correct exercise references
				await this.update(workout.id, { exercises: updatedExercises });
				updated++;
			} else {
				skipped++;
			}
		}

		return { updated, skipped };
	}

	/**
	 * Parses a workout file into a Workout object
	 */
	private async parseWorkoutFile(file: TFile): Promise<Workout | null> {
		try {
			// Use read() instead of cachedRead() to ensure fresh content after file modifications
			const content = await this.app.vault.read(file);
			const { frontmatter, body } = parseFrontmatter<WorkoutMetadata>(content);

			if (!frontmatter?.name) {
				return null;
			}

			// Parse exercises from body table (includes exerciseId and source)
			const exerciseRows = parseWorkoutBody(body);
			const exercises: WorkoutExercise[] = exerciseRows.map(row => {
				// Look up proper exercise name from database if available
				let exerciseName = row.exercise;
				const exerciseId = row.exerciseId ?? toSlug(row.exercise);

				if (this.databaseRepo) {
					const dbExercise = this.databaseRepo.get(exerciseId);
					if (dbExercise) {
						exerciseName = dbExercise.name;
					}
				}

				return {
					exercise: exerciseName,
					exerciseId,
					targetSets: row.sets,
					targetRepsMin: row.repsMin,
					targetRepsMax: row.repsMax,
					restSeconds: row.restSeconds,
					source: row.source
				};
			});

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
