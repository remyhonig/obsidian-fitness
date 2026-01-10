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
 * User settings stored in markdown file
 */
export interface UserSettings {
	/** Path to the active program file (e.g., "Fitness/Programs/531.md") */
	activeProgram: string | null;
	/** Training maxes for each program */
	programTrainingMaxes: ProgramTrainingMaxes[];
}

/**
 * Repository for storing user settings including active program and training maxes.
 * Data is stored in a markdown file at Fitness/settings.md
 */
export class UserSettingsRepository {
	private filePath: string;
	private cache: UserSettings | null = null;

	constructor(
		private app: App,
		basePath: string
	) {
		this.filePath = `${basePath}/settings.md`;
	}

	/**
	 * Updates the file path when settings change
	 */
	setBasePath(basePath: string): void {
		this.filePath = `${basePath}/settings.md`;
		this.cache = null;
	}

	/**
	 * Gets all user settings
	 */
	async getSettings(): Promise<UserSettings> {
		if (this.cache) {
			return this.cache;
		}
		this.cache = await this.load();
		return this.cache;
	}

	/**
	 * Gets the active program path
	 */
	async getActiveProgram(): Promise<string | null> {
		const settings = await this.getSettings();
		return settings.activeProgram;
	}

	/**
	 * Sets the active program path
	 */
	async setActiveProgram(programPath: string | null): Promise<void> {
		const settings = await this.getSettings();
		settings.activeProgram = programPath;
		await this.save(settings);
	}

	/**
	 * Gets training maxes for a specific program
	 */
	async getTrainingMaxes(programName: string): Promise<UserTrainingMax[] | null> {
		const settings = await this.getSettings();
		const programData = settings.programTrainingMaxes.find(
			p => p.programName.toLowerCase() === programName.toLowerCase()
		);
		return programData?.trainingMaxes ?? null;
	}

	/**
	 * Checks if training maxes exist for a program
	 */
	async hasTrainingMaxes(programName: string): Promise<boolean> {
		const data = await this.getTrainingMaxes(programName);
		return data !== null && data.length > 0;
	}

	/**
	 * Saves training maxes for a program
	 */
	async saveTrainingMaxes(programName: string, trainingMaxes: UserTrainingMax[]): Promise<void> {
		const settings = await this.getSettings();

		// Find existing or add new
		const existingIndex = settings.programTrainingMaxes.findIndex(
			p => p.programName.toLowerCase() === programName.toLowerCase()
		);

		if (existingIndex >= 0) {
			settings.programTrainingMaxes[existingIndex] = { programName, trainingMaxes };
		} else {
			settings.programTrainingMaxes.push({ programName, trainingMaxes });
		}

		await this.save(settings);
	}

	/**
	 * Deletes training maxes for a program
	 */
	async deleteTrainingMaxes(programName: string): Promise<void> {
		const settings = await this.getSettings();
		settings.programTrainingMaxes = settings.programTrainingMaxes.filter(
			p => p.programName.toLowerCase() !== programName.toLowerCase()
		);
		await this.save(settings);
	}

	/**
	 * Clears the cache (call when file might have been modified externally)
	 */
	clearCache(): void {
		this.cache = null;
	}

	/**
	 * Loads settings from the file
	 */
	private async load(): Promise<UserSettings> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (!file || !(file instanceof TFile)) {
			return { activeProgram: null, programTrainingMaxes: [] };
		}

		try {
			const content = await this.app.vault.read(file);
			return this.parseContent(content);
		} catch {
			return { activeProgram: null, programTrainingMaxes: [] };
		}
	}

	/**
	 * Saves settings to the file
	 */
	private async save(settings: UserSettings): Promise<void> {
		this.cache = settings;
		const content = this.formatContent(settings);

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
	 * # active program
	 * Fitness/Programs/531.md
	 *
	 * # training maxes
	 *
	 * ## Program Name
	 * - Exercise: 100kg
	 * - Other Exercise: 80lbs
	 */
	private parseContent(content: string): UserSettings {
		const settings: UserSettings = {
			activeProgram: null,
			programTrainingMaxes: []
		};

		// Split into sections by H1 headers
		const lines = content.split('\n');
		let currentSection = '';
		let currentProgram: ProgramTrainingMaxes | null = null;

		for (const line of lines) {
			const trimmed = line.trim();

			// Check for H1 header (section)
			if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
				currentSection = trimmed.substring(2).toLowerCase().trim();
				currentProgram = null;
				continue;
			}

			// Check for H2 header (program name for training maxes)
			if (trimmed.startsWith('## ')) {
				if (currentSection === 'training maxes') {
					const programName = trimmed.substring(3).trim();
					if (programName) {
						currentProgram = { programName, trainingMaxes: [] };
						settings.programTrainingMaxes.push(currentProgram);
					}
				}
				continue;
			}

			// Parse content based on current section
			if (currentSection === 'active program') {
				// Non-empty, non-comment line is the program path
				if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
					settings.activeProgram = trimmed;
				}
			} else if (currentSection === 'training maxes' && currentProgram) {
				// Parse exercise line: - Exercise Name: 100kg
				if (trimmed.startsWith('- ')) {
					const match = trimmed.match(/^- (.+?):\s*(\d+(?:\.\d+)?)\s*(kg|lbs?)$/i);
					if (match) {
						const exercise = match[1]?.trim();
						const value = parseFloat(match[2] ?? '0');
						const unitRaw = match[3]?.toLowerCase() ?? 'kg';
						const unit = unitRaw.startsWith('lb') ? 'lbs' : 'kg';

						if (exercise && !isNaN(value)) {
							currentProgram.trainingMaxes.push({ exercise, value, unit });
						}
					}
				}
			}
		}

		return settings;
	}

	/**
	 * Formats settings into markdown content
	 */
	private formatContent(settings: UserSettings): string {
		const lines: string[] = [];

		// Active program section
		lines.push('# active program');
		lines.push(settings.activeProgram ?? '');
		lines.push('');

		// Training maxes section
		lines.push('# training maxes');
		lines.push('');

		for (const program of settings.programTrainingMaxes) {
			lines.push(`## ${program.programName}`);
			for (const tm of program.trainingMaxes) {
				lines.push(`- ${tm.exercise}: ${tm.value}${tm.unit}`);
			}
			lines.push('');
		}

		return lines.join('\n');
	}
}
