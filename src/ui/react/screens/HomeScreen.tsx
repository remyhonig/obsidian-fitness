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
	const { program, session, dispatch } = useDomain();
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
				{/* Mascot Greeting */}
				<Mascot
					mood="neutral"
					message="Ready to get stronger? Let's do this!"
					bubblePosition="left"
					className="fit-home-mascot"
				/>

				{/* Next Workout Card - with program name as title */}
				<section className="fit-card">
					<h2>{program.program.name}</h2>
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
										start workout
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
									<p className="fit-scheduled-time">start your training cycle</p>
									<button
										className="fit-button-primary"
										onClick={() => handleStartWorkout(suggestedWorkout.name)}
									>
										start workout
									</button>
								</div>
							);
						}

						return <p>no workouts available</p>;
					})()}
				</section>

				{/* Schedule Overview */}
				<section className="fit-card fit-schedule-card">
					{program.schedule.weeklyPattern.length > 0 ? (
						<>
							<h2>this week</h2>
							<div className="fit-schedule-list">
								{program.schedule.weeklyPattern.map((entry, index) => (
									<button
										key={index}
										className="fit-schedule-item"
										onClick={() => entry.workouts[0] && onNavigate('workout-detail', { workoutName: entry.workouts[0] })}
									>
										<div className="fit-schedule-item-day">{entry.day.toLowerCase()}</div>
										<div className="fit-schedule-item-workout">
											{entry.workouts.join(', ')}
										</div>
										<span className="fit-schedule-item-arrow">›</span>
									</button>
								))}
							</div>
						</>
					) : program.schedule.cyclePattern.length > 0 ? (
						<>
							<h2>training cycle</h2>
							<div className="fit-schedule-list">
								{program.schedule.cyclePattern.map((entry, index) => (
									<button
										key={index}
										className="fit-schedule-item"
										onClick={() => onNavigate('workout-detail', { workoutName: entry.workout })}
									>
										<div className="fit-schedule-item-day">day {index + 1}</div>
										<div className="fit-schedule-item-workout">
											{entry.workout}
											{entry.recovery && (
												<span className="fit-schedule-item-recovery">
													{entry.recovery} rest
												</span>
											)}
										</div>
										<span className="fit-schedule-item-arrow">›</span>
									</button>
								))}
							</div>
						</>
					) : (
						<>
							<h2>schedule</h2>
							<p>no schedule defined</p>
						</>
					)}
				</section>

				</div>
		</div>
	);
}
