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
	const { program, dispatch, clearProgram } = useDomain();
	const [programFiles, setProgramFiles] = useState<TFile[]>([]);

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

	const handleSelectProgram = (path: string) => {
		// Navigate to program setup screen instead of loading directly
		onNavigate('program-setup', { programPath: path });
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
						<h2>Select Program</h2>
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
										onClick={() => handleSelectProgram(file.path)}
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
				<h1>Home</h1>
			</header>

			<div className="fit-content">
				{/* Program Info Card */}
				<section className="fit-card fit-program-card">
					<div className="fit-program-header">
						<h2>{program.program.name}</h2>
						<button
							className="fit-button-ghost fit-change-program"
							onClick={clearProgram}
						>
							Change
						</button>
					</div>
					{program.program.description && (
						<p className="fit-program-description">{program.program.description}</p>
					)}
				</section>

				{/* Next Workout Card */}
				<section className="fit-card">
					<h2>Next Workout</h2>
					{(() => {
						// Use nextSession if available
						if (program.nextSession) {
							return (
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
							);
						}

						// Fallback: find first workout with exercises from cycle pattern or workouts list
						const cycleWorkoutNames = program.schedule.cyclePattern.map(c => c.workout);
						const workoutsWithExercises = program.workouts.filter(w => w.exercises.length > 0);

						// Prefer cycle order, but only if workout has exercises
						const firstCycleWorkout = cycleWorkoutNames
							.map(name => workoutsWithExercises.find(w => w.name === name))
							.find(w => w !== undefined);

						const suggestedWorkout = firstCycleWorkout ?? workoutsWithExercises[0];

						if (suggestedWorkout) {
							return (
								<div className="fit-next-workout">
									<h3>{suggestedWorkout.name}</h3>
									<p className="fit-scheduled-time">Start your training cycle</p>
									<button
										className="fit-button-primary"
										onClick={() => handleStartWorkout(suggestedWorkout.name)}
									>
										Start Workout
									</button>
								</div>
							);
						}

						return <p>No workouts available</p>;
					})()}
				</section>

				{/* Schedule Overview */}
				<section className="fit-card">
					{program.schedule.weeklyPattern.length > 0 ? (
						<>
							<h2>This Week</h2>
							<div className="fit-schedule">
								{program.schedule.weeklyPattern.map((entry, index) => (
									<div key={index} className="fit-schedule-entry">
										<div className="fit-day">{entry.day}</div>
										<div className="fit-time">{entry.time || '-'}</div>
										<div className="fit-workouts">
											{entry.workouts.map((workout, i) => (
												<span key={i}>
													{i > 0 && ', '}
													<span
														className="fit-workout-link"
														onClick={() => onNavigate('workout-detail', { workoutName: workout })}
													>
														{workout}
													</span>
												</span>
											))}
										</div>
									</div>
								))}
							</div>
						</>
					) : program.schedule.cyclePattern.length > 0 ? (
						<>
							<h2>Training Cycle</h2>
							<div className="fit-schedule">
								{program.schedule.cyclePattern.map((entry, index) => (
									<div key={index} className="fit-schedule-entry">
										<div className="fit-day">Day {index + 1}</div>
										<div className="fit-time">{entry.recovery ? `${entry.recovery} recovery` : '-'}</div>
										<div className="fit-workouts">
											<span
												className="fit-workout-link"
												onClick={() => onNavigate('workout-detail', { workoutName: entry.workout })}
											>
												{entry.workout}
											</span>
										</div>
									</div>
								))}
							</div>
						</>
					) : (
						<>
							<h2>Schedule</h2>
							<p>No schedule defined</p>
						</>
					)}
				</section>

				</div>
		</div>
	);
}
