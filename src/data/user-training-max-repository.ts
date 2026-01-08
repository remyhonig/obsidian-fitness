import { App, TFile } from 'obsidian';
import { ensureFolder } from './file-utils';

/**
 * User training max value for a single exercise
 */
export interface UserTrainingMax {
	exercise: string;
	value: number;
	unit: 'kg' | 'lbs';
}

/**
 * Training max values for a program
 */
export interface ProgramTrainingMaxes {
	programName: string;
	trainingMaxes: UserTrainingMax[];
}

/**
 * Repository for storing user-specific training max values.
 * Data is stored in a markdown file at Fitness/user-training-maxes.md
 */
export class UserTrainingMaxRepository {
	private filePath: string;

	constructor(
		private app: App,
		basePath: string
	) {
		this.filePath = `${basePath}/user-training-maxes.md`;
	}

	/**
	 * Updates the file path when settings change
	 */
	setBasePath(basePath: string): void {
		this.filePath = `${basePath}/user-training-maxes.md`;
	}

	/**
	 * Gets training maxes for a specific program
	 */
	async get(programName: string): Promise<UserTrainingMax[] | null> {
		const allData = await this.loadAll();
		const programData = allData.find(
			p => p.programName.toLowerCase() === programName.toLowerCase()
		);
		return programData?.trainingMaxes ?? null;
	}

	/**
	 * Checks if training maxes exist for a program
	 */
	async exists(programName: string): Promise<boolean> {
		const data = await this.get(programName);
		return data !== null && data.length > 0;
	}

	/**
	 * Saves training maxes for a program
	 */
	async save(programName: string, trainingMaxes: UserTrainingMax[]): Promise<void> {
		const allData = await this.loadAll();

		// Find existing or add new
		const existingIndex = allData.findIndex(
			p => p.programName.toLowerCase() === programName.toLowerCase()
		);

		if (existingIndex >= 0) {
			allData[existingIndex] = { programName, trainingMaxes };
		} else {
			allData.push({ programName, trainingMaxes });
		}

		await this.saveAll(allData);
	}

	/**
	 * Deletes training maxes for a program
	 */
	async delete(programName: string): Promise<void> {
		const allData = await this.loadAll();
		const filtered = allData.filter(
			p => p.programName.toLowerCase() !== programName.toLowerCase()
		);
		await this.saveAll(filtered);
	}

	/**
	 * Loads all training max data from the file
	 */
	private async loadAll(): Promise<ProgramTrainingMaxes[]> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (!file || !(file instanceof TFile)) {
			return [];
		}

		try {
			const content = await this.app.vault.read(file);
			return this.parseContent(content);
		} catch {
			return [];
		}
	}

	/**
	 * Saves all training max data to the file
	 */
	private async saveAll(data: ProgramTrainingMaxes[]): Promise<void> {
		const content = this.formatContent(data);

		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (file && file instanceof TFile) {
			await this.app.vault.modify(file, content);
		} else {
			// Ensure folder exists
			const folderPath = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
			await ensureFolder(this.app, folderPath);
			await this.app.vault.create(this.filePath, content);
		}
	}

	/**
	 * Parses file content into structured data
	 *
	 * Format:
	 * ## Program Name
	 * - Exercise: 100kg
	 * - Other Exercise: 80lbs
	 */
	private parseContent(content: string): ProgramTrainingMaxes[] {
		const results: ProgramTrainingMaxes[] = [];

		// Split by H2 headers
		const sections = content.split(/(?=^## )/m);

		for (const section of sections) {
			const lines = section.trim().split('\n');
			if (lines.length === 0) continue;

			// First line should be ## Program Name
			const headerMatch = lines[0]?.match(/^## (.+)$/);
			if (!headerMatch) continue;

			const programName = headerMatch[1]?.trim();
			if (!programName) continue;

			const trainingMaxes: UserTrainingMax[] = [];

			// Parse exercise lines
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i]?.trim();
				if (!line?.startsWith('- ')) continue;

				// Format: - Exercise Name: 100kg or - Exercise Name: 225lbs
				const match = line.match(/^- (.+?):\s*(\d+(?:\.\d+)?)\s*(kg|lbs?)$/i);
				if (match) {
					const exercise = match[1]?.trim();
					const value = parseFloat(match[2] ?? '0');
					const unitRaw = match[3]?.toLowerCase() ?? 'kg';
					const unit = unitRaw.startsWith('lb') ? 'lbs' : 'kg';

					if (exercise && !isNaN(value)) {
						trainingMaxes.push({ exercise, value, unit });
					}
				}
			}

			if (trainingMaxes.length > 0) {
				results.push({ programName, trainingMaxes });
			}
		}

		return results;
	}

	/**
	 * Formats data into markdown content
	 */
	private formatContent(data: ProgramTrainingMaxes[]): string {
		const lines: string[] = [
			'---',
			'# User Training Max Values',
			'# Auto-managed by Fitness plugin - do not edit manually',
			'---',
			''
		];

		for (const program of data) {
			lines.push(`## ${program.programName}`);
			for (const tm of program.trainingMaxes) {
				lines.push(`- ${tm.exercise}: ${tm.value}${tm.unit}`);
			}
			lines.push('');
		}

		return lines.join('\n');
	}
}
