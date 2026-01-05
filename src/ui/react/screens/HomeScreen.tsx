/**
 * HomeScreen Component
 *
 * Main landing screen showing:
 * - Active program
 * - Next workout recommendation
 * - Quick actions (start workout, view history, etc.)
 */

import React from 'react';
import { useDomain } from '../contexts';

interface HomeScreenProps {
	onNavigate: (screen: string, params?: any) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const { program, session, dispatch } = useDomain();

	const handleStartWorkout = (workoutName: string) => {
		dispatch({ type: 'start_workout', workoutName });
		onNavigate('session');
	};

	if (!program) {
		return (
			<div className="fit-home-screen">
				<div className="fit-empty-state">
					<h2>No Program Loaded</h2>
					<p>Create a program in your vault to get started</p>
					<button onClick={() => onNavigate('workout-picker')}>
						Choose Program
					</button>
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
