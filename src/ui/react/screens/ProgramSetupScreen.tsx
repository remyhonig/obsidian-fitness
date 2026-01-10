/**
 * ProgramSetupScreen Component
 *
 * Intermediate screen shown when selecting a program.
 * Displays program introduction and collects training max values if needed.
 */

import { useState, useEffect } from 'react';
import { TFile } from 'obsidian';
import { compileProgramFromString } from 'fitness-dsl';
import { useApp, useDomain } from '../contexts';
import { TrainingMaxForm, TrainingMaxValue } from '../components/TrainingMaxForm';
import { UserTrainingMaxRepository, UserTrainingMax } from '../../../data/user-training-max-repository';
import { TopNav } from '../components/TopNav';
import { MarkdownContent } from '../components/MarkdownContent';

interface ProgramSetupScreenProps {
	programPath: string;
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

/** Training max from compiled program */
interface ProgramTrainingMax {
	exercise: string;
	weight: {
		type: 'absolute';
		value: number;
		unit: 'kg' | 'lbs';
	};
}

interface ProgramInfo {
	name: string;
	description: string;
	trainingMaxes: ProgramTrainingMax[];
}

export function ProgramSetupScreen({
	programPath,
	onNavigate
}: ProgramSetupScreenProps) {
	const app = useApp();
	const { loadProgramWithTMs } = useDomain();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
	const [tmValues, setTmValues] = useState<Map<string, TrainingMaxValue>>(new Map());

	// Load and parse program
	useEffect(() => {
		loadProgramInfo();
	}, [programPath]);

	const loadProgramInfo = async () => {
		setLoading(true);
		setError(null);

		try {
			const file = app.vault.getAbstractFileByPath(programPath);
			if (!file || !(file instanceof TFile)) {
				setError('Program file not found');
				setLoading(false);
				return;
			}

			const content = await app.vault.read(file);
			const compiled = compileProgramFromString(content);

			// Pre-fill with default values from program
			const initialValues = new Map<string, TrainingMaxValue>();
			for (const tm of compiled.trainingMaxes) {
				const unit: 'kg' | 'lbs' = tm.weight.unit === 'kg' ? 'kg' : 'lbs';
				initialValues.set(tm.exercise, {
					exercise: tm.exercise,
					value: tm.weight.value,
					unit
				});
			}

			// Load any saved user values (override defaults)
			const tmRepo = new UserTrainingMaxRepository(app, 'Fitness');
			const savedValues = await tmRepo.get(compiled.programName);
			if (savedValues) {
				for (const saved of savedValues) {
					initialValues.set(saved.exercise, saved);
				}
			}

			// Now update all state together (after all async work is done)
			// This ensures React batches these updates into a single render
			setProgramInfo({
				name: compiled.programName,
				description: compiled.programDescription,
				trainingMaxes: compiled.trainingMaxes
			});
			setTmValues(initialValues);
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load program');
			setLoading(false);
		}
	};

	const handleTmChange = (exercise: string, value: number, unit: 'kg' | 'lbs') => {
		setTmValues(prev => {
			const next = new Map(prev);
			next.set(exercise, { exercise, value, unit });
			return next;
		});
	};

	const handleStartProgram = async () => {
		if (!programInfo) return;

		setSaving(true);
		setError(null);

		try {
			// Save TM values if there are any
			if (programInfo.trainingMaxes.length > 0) {
				const tmRepo = new UserTrainingMaxRepository(app, 'Fitness');
				const tmArray: UserTrainingMax[] = Array.from(tmValues.values());
				await tmRepo.save(programInfo.name, tmArray);
			}

			// Start the program with user's TM values via context
			const tmArray = Array.from(tmValues.values());
			await loadProgramWithTMs(programPath, tmArray.length > 0 ? tmArray : undefined);

			// Navigate to home
			onNavigate('home');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start program');
			setSaving(false);
		}
	};

	const handleBack = () => {
		onNavigate('program-picker');
	};

	// Check if all required TMs have values
	const hasAllTmValues = programInfo?.trainingMaxes.every(tm => {
		const val = tmValues.get(tm.exercise);
		return val && val.value > 0;
	}) ?? true;

	return (
		<div className="fit-program-setup-screen">
			<TopNav
				title="program"
				variant="back"
				onBack={handleBack}
			/>

			<div className="fit-content">
				{loading ? (
					<div className="fit-loading">Loading program...</div>
				) : error ? (
					<div className="fit-error">
						<p>{error}</p>
						<button className="fit-button-secondary" onClick={handleBack}>
							Go Back
						</button>
					</div>
				) : programInfo ? (
					<>
						{/* Program Title and Introduction */}
						<div className="fit-program-intro">
							<h1 className="fit-program-title">{programInfo.name}</h1>
							{programInfo.description && (
								<MarkdownContent content={programInfo.description} />
							)}
						</div>

						{/* Training Maxes Section */}
						{programInfo.trainingMaxes.length > 0 && (
							<div className="fit-tm-section">
								<h2>Set Your Training Maxes</h2>
								<p className="fit-tm-explanation">
									Enter the maximum weight you can lift for each exercise.
									These values will be used to calculate your working weights.
								</p>
								<TrainingMaxForm
									exercises={programInfo.trainingMaxes.map(tm => tm.exercise)}
									values={tmValues}
									onChange={handleTmChange}
								/>
							</div>
						)}
					</>
				) : null}
			</div>

			{/* Fixed Action Footer */}
			{!loading && !error && programInfo && (
				<div className="fit-action-footer">
					<button
						className="fit-button-primary fit-button-large"
						onClick={handleStartProgram}
						disabled={saving || !hasAllTmValues}
					>
						{saving ? 'Starting...' : 'Start Program'}
					</button>
				</div>
			)}
		</div>
	);
}
