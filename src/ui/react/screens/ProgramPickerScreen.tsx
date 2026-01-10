/**
 * ProgramPickerScreen Component
 *
 * Lists all available programs for the user to pick from.
 * Shows program name and description in a list format.
 */

import { useState, useEffect } from 'react';
import { compileProgramFromString } from 'fitness-dsl';
import { useApp } from '../contexts';
import { TopNav } from '../components/TopNav';

interface ProgramPreview {
	path: string;
	name: string;
	description: string;
}

interface ProgramPickerScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	onBack: () => void;
}

export function ProgramPickerScreen({ onNavigate, onBack }: ProgramPickerScreenProps) {
	const app = useApp();
	const [programs, setPrograms] = useState<ProgramPreview[]>([]);
	const [loading, setLoading] = useState(true);

	// Load available programs
	useEffect(() => {
		const loadPrograms = async () => {
			setLoading(true);
			const programsPath = 'Fitness/Programs';
			const files = app.vault.getMarkdownFiles()
				.filter(f => f.path.startsWith(programsPath + '/'))
				.sort((a, b) => a.basename.localeCompare(b.basename));

			const previews: ProgramPreview[] = [];
			for (const file of files) {
				try {
					const content = await app.vault.read(file);
					const compiled = compileProgramFromString(content);
					previews.push({
						path: file.path,
						name: compiled.programName || file.basename,
						description: compiled.programDescription || ''
					});
				} catch (err) {
					// If compilation fails, still show the program with basic info
					previews.push({
						path: file.path,
						name: file.basename,
						description: ''
					});
				}
			}
			setPrograms(previews);
			setLoading(false);
		};

		loadPrograms();
	}, [app]);

	const handleSelectProgram = (path: string) => {
		onNavigate('program-setup', { programPath: path });
	};

	return (
		<div className="fit-program-picker-screen">
			<TopNav
				title="pick a program"
				variant="back"
				onBack={onBack}
			/>

			<div className="fit-content">
				{loading ? (
					<div className="fit-loading">loading programs...</div>
				) : programs.length === 0 ? (
					<div className="fit-empty-state">
						<p>no programs found</p>
						<p className="fit-hint">add markdown files to Fitness/Programs/</p>
					</div>
				) : (
					<div className="fit-program-list">
						{programs.map((program) => (
							<button
								key={program.path}
								className="fit-program-list-item"
								onClick={() => handleSelectProgram(program.path)}
							>
								<div className="fit-program-list-item-content">
									<h3 className="fit-program-list-item-name">{program.name.toLowerCase()}</h3>
									{program.description && (
										<p className="fit-program-list-item-description">
											{program.description.slice(0, 100).toLowerCase()}
											{program.description.length > 100 ? '...' : ''}
										</p>
									)}
								</div>
								<span className="fit-program-list-item-arrow">›</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
