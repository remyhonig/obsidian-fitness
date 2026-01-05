/**
 * HomeScreen Component
 *
 * Main landing screen showing:
 * - Active program
 * - Next workout recommendation
 * - Quick actions (start workout, view history, etc.)
 */

import React, { useState, useEffect } from 'react';
import { TFile } from 'obsidian';
import { useApp, useDomain } from '../contexts';

interface HomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const app = useApp();
	const { program, session, dispatch, loadProgram } = useDomain();
	const [programFiles, setProgramFiles] = useState<TFile[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load available program files on mount
	useEffect(() => {
		const loadProgramFiles = () => {
			const programsPath = 'Fitness/Programs';
			const files = app.vault.getMarkdownFiles()
				.filter(f => f.path.startsWith(programsPath + '/'))
				.sort((a, b) => a.basename.localeCompare(b.basename));
			console.log('[HomeScreen] Found program files:', files.map(f => f.path));
			setProgramFiles(files);
		};

		// Load immediately
		loadProgramFiles();

		// Also reload when vault changes (file created/deleted)
		const handleVaultChange = () => loadProgramFiles();
		app.vault.on('create', handleVaultChange);
		app.vault.on('delete', handleVaultChange);
		app.vault.on('rename', handleVaultChange);

		return () => {
			app.vault.off('create', handleVaultChange);
			app.vault.off('delete', handleVaultChange);
			app.vault.off('rename', handleVaultChange);
		};
	}, [app]);

	const handleLoadProgram = async (path: string) => {
		setIsLoading(true);
		setError(null);
		try {
			await loadProgram(path);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load program');
		} finally {
			setIsLoading(false);
		}
	};

	const handleStartWorkout = (workoutName: string) => {
		dispatch({ type: 'start_workout', workoutName, programId: program?.program.name });
		onNavigate('session');
	};

	if (!program) {
		return (
			<div className="fit-home-screen">
				<header className="fit-screen-header">
					<h1>Fitness</h1>
				</header>
				<div className="fit-content">
					<section className="fit-card">
						<h2>Load Program</h2>
						{error && (
							<div className="fit-error">
								{error}
							</div>
						)}
						{programFiles.length === 0 ? (
							<div className="fit-empty-state">
								<p>No programs found in Fitness/Programs/</p>
								<p>Create a program markdown file to get started</p>
							</div>
						) : (
							<div className="fit-program-loader">
								{programFiles.map((file) => (
									<button
										key={file.path}
										className="fit-button-secondary"
										disabled={isLoading}
										onClick={() => handleLoadProgram(file.path)}
									>
										{file.basename}
									</button>
								))}
							</div>
						)}
					</section>

					{/* Quick Actions when no program loaded */}
					<section className="fit-quick-actions">
						<button
							className="fit-button-secondary"
							onClick={() => onNavigate('history')}
						>
							View History
						</button>
					</section>
				</div>
			</div>
		);
	}

	return (
		<div className="fit-home-screen">
			<header className="fit-screen-header">
				<h1>{program.program.name}</h1>
				<p>{program.program.description}</p>
			</header>

			<div className="fit-content">
				{/* Next Workout Card */}
				<section className="fit-card">
					<h2>Next Workout</h2>
					{program.nextSession ? (
						<div className="fit-next-workout">
							<h3>{program.nextSession.workout}</h3>
							{program.nextSession.scheduledFor && (
								<p className="fit-scheduled-time">
									Scheduled: {program.nextSession.scheduledFor}
								</p>
							)}
							<button
								className="fit-button-primary"
								onClick={() => handleStartWorkout(program.nextSession!.workout)}
							>
								Start Workout
							</button>
						</div>
					) : (
						<p>No workout scheduled</p>
					)}
				</section>

				{/* Schedule Overview */}
				<section className="fit-card">
					<h2>This Week</h2>
					<div className="fit-schedule">
						{program.schedule.weeklyPattern.map((entry, index) => (
							<div key={index} className="fit-schedule-entry">
								<div className="fit-day">{entry.day}</div>
								<div className="fit-time">{entry.time || '-'}</div>
								<div className="fit-workouts">
									{entry.workouts.join(', ')}
								</div>
							</div>
						))}
					</div>
				</section>

				{/* Quick Actions */}
				<section className="fit-actions">
					<button
						className="fit-button-secondary"
						onClick={() => onNavigate('workout-picker')}
					>
						Choose Workout
					</button>
					<button
						className="fit-button-secondary"
						onClick={() => onNavigate('history')}
					>
						View History
					</button>
					<button
						className="fit-button-secondary"
						onClick={() => onNavigate('exercise-library')}
					>
						Exercise Library
					</button>
				</section>
			</div>
		</div>
	);
}
