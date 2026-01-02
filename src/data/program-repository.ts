import { App, TFile } from 'obsidian';
import type { Program, Question, QuestionOption, Workout, WorkoutExercise } from '../types';
import {
	ensureFolder,
	getFilesInFolder,
	getIdFromPath,
	parseFrontmatter,
	createFileContent,
	parseDescriptionSection
} from './file-utils';
import { parseInlineWorkouts } from './program-body';
import { createWorkoutBody } from './workout-body';

// Frontmatter only contains metadata, not workouts
interface ProgramMetadata {
	name: string;
	description?: string;
}

export class ProgramRepository {
	private basePath: string;
	/** Cache of inline workouts by program ID */
	private inlineWorkoutCache: Map<string, Map<string, Workout>> = new Map();

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
	 * Note: Programs are created by editing markdown files directly.
	 * This method is not currently used.
	 */
	create(_program: Omit<Program, 'id'>): Promise<Program> {
		throw new Error('Program creation via API is not supported. Edit program files directly.');
	}

	/**
	 * Updates an existing program's metadata and review questions.
	 * Inline workouts are preserved from the cache.
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

		// Body: inline workouts + optional review section
		let body = this.createInlineWorkoutsSection(id);
		if (updated.questions && updated.questions.length > 0) {
			body += this.createReviewSection(updated.questions);
		}

		const content = createFileContent(frontmatter, body);
		await this.app.vault.modify(file, content);
	}

	/**
	 * Creates inline workouts section from cached workout data
	 */
	private createInlineWorkoutsSection(programId: string): string {
		const workoutMap = this.inlineWorkoutCache.get(programId);
		if (!workoutMap || workoutMap.size === 0) {
			return '';
		}

		const lines: string[] = ['', '## Workouts', ''];
		for (const workout of workoutMap.values()) {
			lines.push(`### ${workout.name}`);
			// Convert WorkoutExercise to WorkoutExerciseRow format
			const rows = workout.exercises.map(e => ({
				exercise: e.exercise,
				exerciseId: e.exerciseId,
				sets: e.targetSets,
				repsMin: e.targetRepsMin,
				repsMax: e.targetRepsMax,
				restSeconds: e.restSeconds,
				source: e.source
			}));
			lines.push(createWorkoutBody(rows));
			lines.push('');
		}
		return lines.join('\n');
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

			const programId = getIdFromPath(file.path);

			// Parse inline workouts (H3 sections with exercise tables)
			const inlineWorkouts = parseInlineWorkouts(body);
			const workoutMap = new Map<string, Workout>();
			for (const inline of inlineWorkouts) {
				const exercises: WorkoutExercise[] = inline.exercises.map(e => ({
					exercise: e.exercise,
					exerciseId: e.exerciseId,
					targetSets: e.sets,
					targetRepsMin: e.repsMin,
					targetRepsMax: e.repsMax,
					restSeconds: e.restSeconds,
					source: e.source
				}));
				workoutMap.set(inline.id, {
					id: inline.id,
					name: inline.name,
					exercises
				});
			}
			this.inlineWorkoutCache.set(programId, workoutMap);
			const workouts = inlineWorkouts.map(w => w.id);

			// Parse review questions from body
			const questions = this.parseReviewSection(body);

			// Body description takes precedence over frontmatter description
			const bodyDescription = parseDescriptionSection(body);
			const description = bodyDescription ?? frontmatter.description;

			return {
				id: programId,
				name: frontmatter.name,
				description,
				workouts,
				questions: questions.length > 0 ? questions : undefined
			};
		} catch {
			return null;
		}
	}

	/**
	 * Gets an inline workout from cache (for programs with embedded workouts)
	 */
	getInlineWorkout(programId: string, workoutId: string): Workout | null {
		return this.inlineWorkoutCache.get(programId)?.get(workoutId) ?? null;
	}

	/**
	 * Checks if a program has inline workouts
	 */
	hasInlineWorkouts(programId: string): boolean {
		return this.inlineWorkoutCache.has(programId);
	}

	/**
	 * Parses the Review section from the program body
	 * Format:
	 * ## Review
	 * ### question-id
	 * **Question text?**
	 * - option-id: Option label
	 * - option-id: Option label | freeText: 120
	 */
	private parseReviewSection(body: string): Question[] {
		const questions: Question[] = [];

		// Find the Review section (always last section, so match to end)
		const reviewMatch = body.match(/## Review\s*([\s\S]*)$/i);
		if (!reviewMatch) return questions;

		const reviewContent = reviewMatch[1] ?? '';

		// Split by ### headers to get individual questions
		const questionBlocks = reviewContent.split(/(?=^### )/m).filter(block => block.trim().startsWith('### '));

		for (const block of questionBlocks) {
			const question = this.parseQuestionBlock(block);
			if (question) {
				questions.push(question);
			}
		}

		return questions;
	}

	/**
	 * Parses a single question block
	 */
	private parseQuestionBlock(block: string): Question | null {
		// Remove HTML comments before parsing
		const cleanBlock = block.replace(/<!--[\s\S]*?-->/g, '');
		const lines = cleanBlock.split('\n').map(l => l.trim()).filter(l => l);

		// First line should be ### id
		const idMatch = lines[0]?.match(/^### (.+)$/);
		if (!idMatch) return null;
		const id = idMatch[1]?.trim() ?? '';
		if (!id) return null;

		// Second line should be **Question text?**
		const textMatch = lines[1]?.match(/^\*\*(.+)\*\*$/);
		if (!textMatch) return null;
		const text = textMatch[1]?.trim() ?? '';
		if (!text) return null;

		// Remaining lines are options: - option-id: Option label
		const options: QuestionOption[] = [];
		let allowFreeText = false;
		let freeTextTrigger: string | undefined;
		let freeTextMaxLength: number | undefined;

		for (let i = 2; i < lines.length; i++) {
			const line = lines[i];
			if (!line?.startsWith('- ')) continue;

			// Parse option: - id: Label or - id: Label | freeText: 120
			const optionContent = line.slice(2); // Remove "- "

			// Check for freeText modifier
			const freeTextMatch = optionContent.match(/^([^:]+):\s*(.+?)\s*\|\s*freeText:\s*(\d+)$/);
			if (freeTextMatch) {
				const optionId = freeTextMatch[1]?.trim() ?? '';
				const optionLabel = freeTextMatch[2]?.trim() ?? '';
				const maxLength = parseInt(freeTextMatch[3] ?? '200', 10);

				if (optionId && optionLabel) {
					options.push({ id: optionId, label: optionLabel });
					allowFreeText = true;
					freeTextTrigger = optionId;
					freeTextMaxLength = maxLength;
				}
				continue;
			}

			// Standard option: - id: Label
			const optionMatch = optionContent.match(/^([^:]+):\s*(.+)$/);
			if (optionMatch) {
				const optionId = optionMatch[1]?.trim() ?? '';
				const optionLabel = optionMatch[2]?.trim() ?? '';
				if (optionId && optionLabel) {
					options.push({ id: optionId, label: optionLabel });
				}
			}
		}

		if (options.length === 0) return null;

		return {
			id,
			text,
			options,
			allowFreeText: allowFreeText || undefined,
			freeTextTrigger,
			freeTextMaxLength
		};
	}

	/**
	 * Creates the Review section markdown
	 */
	private createReviewSection(questions: Question[]): string {
		const lines: string[] = ['', '## Review', ''];

		for (const question of questions) {
			lines.push(`### ${question.id}`);
			lines.push(`**${question.text}**`);
			for (const option of question.options) {
				if (question.freeTextTrigger === option.id && question.freeTextMaxLength) {
					lines.push(`- ${option.id}: ${option.label} | freeText: ${question.freeTextMaxLength}`);
				} else {
					lines.push(`- ${option.id}: ${option.label}`);
				}
			}
			lines.push('');
		}

		return lines.join('\n');
	}
}
