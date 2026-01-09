/**
 * HomeScreen Component
 *
 * Main landing screen showing:
 * - Active program
 * - Next workout recommendation
 * - Quick actions (start workout, view history, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { TFile, MarkdownRenderer, Component } from 'obsidian';
import { compileProgramFromString } from 'fitness-dsl';
import { useApp, useDomain } from '../contexts';
import { TopNav, type TimerConfig } from '../components/TopNav';

interface ProgramPreview {
	path: string;
	name: string;
	description: string;
}

interface HomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

/** Component that renders markdown using Obsidian's renderer */
function MarkdownContent({ markdown, sourcePath }: { markdown: string; sourcePath: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const app = useApp();

	useEffect(() => {
		if (!containerRef.current || !markdown) return;

		// Clear previous content
		containerRef.current.empty();

		// Create a component for the renderer lifecycle
		const component = new Component();
		component.load();

		// Render markdown
		MarkdownRenderer.render(
			app,
			markdown,
			containerRef.current,
			sourcePath,
			component
		);

		return () => {
			component.unload();
		};
	}, [markdown, sourcePath, app]);

	return <div ref={containerRef} className="fit-markdown-content" />;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const app = useApp();
	const { program, session, dispatch, clearProgram } = useDomain();
	const [programPreviews, setProgramPreviews] = useState<ProgramPreview[]>([]);
	const [currentProgramIndex, setCurrentProgramIndex] = useState(0);
	const [restElapsed, setRestElapsed] = useState(0);

	// Get current exercise for rest target calculation
	const currentExercise = session.isActive
		? session.exercises[session.currentExerciseIndex]
		: null;
	const restTarget = (currentExercise?.restSeconds ?? 120) + session.extraRestTime;

	// Timer effect - calculates elapsed time from session.restStartTime
	useEffect(() => {
		if (!session.isActive || !session.restStartTime) {
			setRestElapsed(0);
			return;
		}

		const updateElapsed = () => {
			const elapsed = Math.floor((Date.now() - session.restStartTime!) / 1000);
			setRestElapsed(elapsed);
		};

		updateElapsed();
		const interval = setInterval(updateElapsed, 1000);
		return () => clearInterval(interval);
	}, [session.isActive, session.restStartTime]);

	// Build timer config for active session
	const getTimerConfig = (): TimerConfig | undefined => {
		if (!session.isActive) return undefined;

		const isRestComplete = restElapsed >= restTarget;
		const restRemaining = Math.max(0, restTarget - restElapsed);
		const overageTime = restElapsed - restTarget;

		return isRestComplete
			? { type: 'countup', seconds: overageTime, label: 'Ready' }
			: { type: 'countdown', seconds: restRemaining, totalSeconds: restTarget, label: 'Rest' };
	};

	// Load available programs with their descriptions
	useEffect(() => {
		const loadPrograms = async () => {
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
			setProgramPreviews(previews);
		};

		loadPrograms();

		// Also reload when vault changes
		const handleVaultChange = () => { void loadPrograms(); };
		app.vault.on('create', handleVaultChange);
		app.vault.on('delete', handleVaultChange);
		app.vault.on('rename', handleVaultChange);

		return () => {
			app.vault.off('create', handleVaultChange);
			app.vault.off('delete', handleVaultChange);
			app.vault.off('rename', handleVaultChange);
		};
	}, [app]);

	// Current program being browsed
	const currentPreview = programPreviews[currentProgramIndex];

	// Navigate between programs
	const goToPrevProgram = () => {
		setCurrentProgramIndex(prev =>
			prev === 0 ? programPreviews.length - 1 : prev - 1
		);
	};

	const goToNextProgram = () => {
		setCurrentProgramIndex(prev =>
			prev === programPreviews.length - 1 ? 0 : prev + 1
		);
	};

	const handleSelectProgram = (path: string) => {
		// Navigate to program setup screen instead of loading directly
		onNavigate('program-setup', { programPath: path });
	};

	const handleStartWorkout = (workoutName: string) => {
		dispatch({ type: 'start_workout', workoutName, programId: program?.program.name });
		onNavigate('session');
	};

	if (!program) {
		const hasMultiplePrograms = programPreviews.length > 1;
		return (
			<div className="fit-home-screen">
				<TopNav
					title={currentPreview?.name || 'Select Program'}
					subtitle={hasMultiplePrograms ? `${currentProgramIndex + 1} / ${programPreviews.length}` : undefined}
					variant={hasMultiplePrograms ? 'arrows' : 'simple'}
					onPrev={goToPrevProgram}
					onNext={goToNextProgram}
					timer={getTimerConfig()}
					onTitleClick={session.isActive ? () => onNavigate('session') : undefined}
				/>
				<div className="fit-content fit-program-browser-content">
					{programPreviews.length === 0 ? (
						<div className="fit-empty-state">
							<p>No programs found in Fitness/Programs/</p>
							<p>Create a program markdown file to get started</p>
						</div>
					) : currentPreview ? (
						<>
							{/* Program Description - rendered markdown */}
							{currentPreview.description && (
								<div className="fit-program-description-area">
									<MarkdownContent
										markdown={currentPreview.description}
										sourcePath={currentPreview.path}
									/>
								</div>
							)}

							{/* Select Button */}
							<div className="fit-action-footer">
								<button
									className="fit-button-primary fit-button-large"
									onClick={() => handleSelectProgram(currentPreview.path)}
								>
									Select Program
								</button>
							</div>
						</>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div className="fit-home-screen">
			<TopNav
				title="Home"
				timer={getTimerConfig()}
				onTitleClick={session.isActive ? () => onNavigate('session') : undefined}
			/>

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
