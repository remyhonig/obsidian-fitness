/**
 * ProgramPickerScreen Component
 *
 * Lists available programs organized by fitness goal categories.
 * Reads categories from settings.md and shows programs with names and descriptions.
 */

import { useState, useEffect } from 'react';
import { compileProgramFromString } from 'fitness-dsl';
import { TFile } from 'obsidian';
import { useApp, useUserSettings } from '../contexts';
import { TopNav } from '../components/TopNav';
import { Mascot } from '../components/Mascot';

interface ProgramPreview {
	path: string;
	name: string;
	description: string;
}

interface CategoryWithPrograms {
	goal: string;
	programs: ProgramPreview[];
}

interface ProgramPickerScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	onBack: () => void;
	/** Whether the user is changing from an existing program */
	isChangingProgram?: boolean;
}

export function ProgramPickerScreen({ onNavigate, onBack, isChangingProgram = false }: ProgramPickerScreenProps) {
	const app = useApp();
	const userSettings = useUserSettings();
	const [categories, setCategories] = useState<CategoryWithPrograms[]>([]);
	const [loading, setLoading] = useState(true);
	const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

	// Load available programs organized by category
	useEffect(() => {
		const loadPrograms = async () => {
			setLoading(true);

			// Get categories from settings
			const programCategories = await userSettings.getAvailablePrograms();

			// Load program details for each category
			const categoriesWithPrograms: CategoryWithPrograms[] = [];

			for (const category of programCategories) {
				const programs: ProgramPreview[] = [];

				for (const programPath of category.programPaths) {
					const file = app.vault.getAbstractFileByPath(programPath);
					if (file && file instanceof TFile) {
						try {
							const content = await app.vault.read(file);
							const compiled = compileProgramFromString(content);
							programs.push({
								path: programPath,
								name: compiled.programName || file.basename,
								description: compiled.programDescription || ''
							});
						} catch {
							// If compilation fails, still show the program with basic info
							programs.push({
								path: programPath,
								name: file.basename,
								description: ''
							});
						}
					}
				}

				// Only add category if it has valid programs
				if (programs.length > 0) {
					categoriesWithPrograms.push({
						goal: category.goal,
						programs
					});
				}
			}

			setCategories(categoriesWithPrograms);
			setLoading(false);
		};

		loadPrograms();
	}, [app, userSettings]);

	const handleSelectProgram = (path: string) => {
		onNavigate('program-setup', { programPath: path });
	};

	const toggleCategory = (goal: string) => {
		setCollapsedCategories(prev => {
			const next = new Set(prev);
			if (next.has(goal)) {
				next.delete(goal);
			} else {
				next.add(goal);
			}
			return next;
		});
	};

	const totalPrograms = categories.reduce((sum, cat) => sum + cat.programs.length, 0);

	return (
		<div className="fit-program-picker-screen">
			<TopNav
				title={isChangingProgram ? "change program" : "pick a program"}
				variant="back"
				onBack={onBack}
			/>

			<div className="fit-content">
				<div className="fit-program-picker-header">
					<Mascot
						mood="taking_notes"
						message={isChangingProgram
							? "No worries, your history is safe. Let's find what fits you best!"
							: "Future you will thank present you. I will tell you exactly what to do each workout!"
						}
						className="fit-program-picker-mascot"
					/>
				</div>

				{loading ? (
					<div className="fit-loading">loading programs...</div>
				) : totalPrograms === 0 ? (
					<div className="fit-empty-state">
						<p>no programs found</p>
						<p className="fit-hint">configure programs in Fitness/settings.md</p>
					</div>
				) : (
					<div className="fit-program-categories">
						{categories.map((category) => {
							const isCollapsed = collapsedCategories.has(category.goal);
							return (
								<div key={category.goal} className="fit-program-category">
									<h2
										className="fit-program-category-header"
										onClick={() => toggleCategory(category.goal)}
									>
										<span className={`fit-program-category-chevron ${isCollapsed ? 'collapsed' : ''}`}>
											›
										</span>
										{category.goal.toLowerCase()}
									</h2>
									{!isCollapsed && (
										<div className="fit-program-list">
											{category.programs.map((program) => (
												<button
													key={program.path}
													className="fit-program-list-item"
													onClick={() => handleSelectProgram(program.path)}
												>
													<div className="fit-program-list-item-content">
														<h3 className="fit-program-list-item-name">{program.name}</h3>
														{program.description && (
															<p className="fit-program-list-item-description">
																{program.description.toLowerCase()}
															</p>
														)}
													</div>
													<span className="fit-program-list-item-arrow">›</span>
												</button>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
