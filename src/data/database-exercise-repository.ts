import { requestUrl } from 'obsidian';
import type { Exercise, DatabaseExerciseEntry } from '../types';
import { toSlug } from '../domain/identifier';

const DATABASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// External format from free-exercise-db
interface ExternalExercise {
	id: string;
	name: string;
	equipment: string | null;
	primaryMuscles: string[];
	secondaryMuscles: string[];
	instructions: string[];
	category: string;
	images: string[];
}

/**
 * Database stored in plugin data
 */
interface ExerciseDatabase {
	version: string;
	importedAt: string;
	exercises: DatabaseExerciseEntry[];
}

/**
 * Repository for read-only database exercises
 * Stored in plugin data folder, not synced between devices
 */
export class DatabaseExerciseRepository {
	private exercises: Map<string, Exercise> = new Map();
	private loaded = false;
	private database: ExerciseDatabase | null = null;

	constructor(
		private loadData: () => Promise<ExerciseDatabase | null>,
		private saveData: (data: ExerciseDatabase) => Promise<void>
	) {}

	/**
	 * Loads the exercise database from plugin data
	 */
	async load(): Promise<void> {
		if (this.loaded) return;

		try {
			this.database = await this.loadData();
			if (this.database?.exercises) {
				for (const entry of this.database.exercises) {
					const exercise = this.convertToExercise(entry);
					this.exercises.set(exercise.id, exercise);
				}
			}
			this.loaded = true;
		} catch (error) {
			console.error('[Fit] Failed to load exercise database:', error);
			this.loaded = true; // Mark as loaded to prevent retries
		}
	}

	/**
	 * Imports/updates the exercise database from free-exercise-db
	 */
	async import(): Promise<{ imported: number }> {
		const response = await requestUrl({ url: DATABASE_URL });
		const externalExercises = response.json as ExternalExercise[];

		const entries: DatabaseExerciseEntry[] = externalExercises.map(ext => ({
			id: toSlug(ext.name),
			name: ext.name,
			category: ext.category ? this.titleCase(ext.category) : undefined,
			equipment: ext.equipment ? this.titleCase(ext.equipment) : undefined,
			primaryMuscles: ext.primaryMuscles.map(m => this.titleCase(m)),
			secondaryMuscles: ext.secondaryMuscles.map(m => this.titleCase(m)),
			instructions: ext.instructions,
			images: ext.images.map((_, idx) => `${IMAGE_BASE_URL}/${ext.id}/${idx}.jpg`)
		}));

		this.database = {
			version: new Date().toISOString().split('T')[0] ?? 'unknown',
			importedAt: new Date().toISOString(),
			exercises: entries
		};

		await this.saveData(this.database);

		// Reload into memory
		this.exercises.clear();
		for (const entry of entries) {
			const exercise = this.convertToExercise(entry);
			this.exercises.set(exercise.id, exercise);
		}
		this.loaded = true;

		return { imported: entries.length };
	}

	/**
	 * Returns whether the database has been imported
	 */
	isImported(): boolean {
		return this.database !== null && this.database.exercises.length > 0;
	}

	/**
	 * Gets database info
	 */
	getInfo(): { version: string; count: number; importedAt: string } | null {
		if (!this.database) return null;
		return {
			version: this.database.version,
			count: this.database.exercises.length,
			importedAt: this.database.importedAt
		};
	}

	/**
	 * Lists all database exercises
	 */
	list(): Exercise[] {
		return Array.from(this.exercises.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Gets a database exercise by ID
	 */
	get(id: string): Exercise | null {
		return this.exercises.get(id) ?? null;
	}

	/**
	 * Gets a database exercise by name
	 */
	getByName(name: string): Exercise | null {
		const nameLower = name.toLowerCase();
		const nameSlug = toSlug(name);

		for (const exercise of this.exercises.values()) {
			if (exercise.name.toLowerCase() === nameLower || exercise.id === nameSlug) {
				return exercise;
			}
		}
		return null;
	}

	/**
	 * Searches database exercises
	 */
	search(query: string): Exercise[] {
		const lowerQuery = query.toLowerCase();

		return this.list().filter(e =>
			e.name.toLowerCase().includes(lowerQuery) ||
			e.category?.toLowerCase().includes(lowerQuery) ||
			e.equipment?.toLowerCase().includes(lowerQuery) ||
			e.muscleGroups?.some(m => m.toLowerCase().includes(lowerQuery))
		);
	}

	/**
	 * Clears the database (for re-import or cleanup)
	 */
	async clear(): Promise<void> {
		this.database = null;
		this.exercises.clear();
		// Save empty database
		await this.saveData({
			version: '',
			importedAt: '',
			exercises: []
		});
	}

	/**
	 * Converts a database entry to an Exercise object
	 */
	private convertToExercise(entry: DatabaseExerciseEntry): Exercise {
		const muscleGroups = [...entry.primaryMuscles, ...entry.secondaryMuscles];
		return {
			id: entry.id,
			name: entry.name,
			category: entry.category,
			equipment: entry.equipment,
			muscleGroups: muscleGroups.length > 0 ? muscleGroups : undefined,
			image0: entry.images[0],
			image1: entry.images[1],
			notes: entry.instructions.length > 0
				? entry.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')
				: undefined,
			source: 'database'
		};
	}

	/**
	 * Title-cases a string
	 */
	private titleCase(str: string): string {
		return str.split(' ')
			.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(' ');
	}
}
