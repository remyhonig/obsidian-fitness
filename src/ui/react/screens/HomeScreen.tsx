/**
 * HomeScreen Component
 *
 * Main landing screen showing:
 * - Active program
 * - Next workout recommendation
 * - Quick actions (start workout, view history, etc.)
 */

import { useState, useEffect } from 'react';
import { useDomain } from '../contexts';
import { TopNav, type TimerConfig } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ActionFooter } from '../components/ActionFooter';

interface HomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const { program, session, dispatch, clearProgram } = useDomain();
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

	const handleStartWorkout = (workoutName: string) => {
		dispatch({ type: 'start_workout', workoutName, programId: program?.program.name });
		onNavigate('session');
	};

	// Welcome screen - no program selected
	if (!program) {
		return (
			<div className="fit-home-screen">
				<TopNav
					title="welcome"
					timer={getTimerConfig()}
					onTitleClick={session.isActive ? () => onNavigate('session') : undefined}
				/>
				<div className="fit-content fit-welcome-content">
					<div className="fit-welcome-screen">
						<Mascot
							mood="neutral"
							size="large"
							message="Yo! Ready to crush it? Let's get those gains!"
						/>
					</div>
				</div>
				<ActionFooter
					layout="single"
					primaryAction={{
						label: 'continue',
						onClick: () => onNavigate('program-picker'),
						variant: 'primary'
					}}
				/>
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
