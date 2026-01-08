/**
 * WorkoutDetailScreen Component
 *
 * Shows a preview of a workout before starting it.
 * Displays workout name, description, and all exercises with their details.
 */

import React from 'react';
import { useDomain } from '../contexts';

interface WorkoutDetailScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	workoutName: string;
	onBack?: () => void;
}

export function WorkoutDetailScreen({ onNavigate, workoutName, onBack }: WorkoutDetailScreenProps) {
	const { program, dispatch } = useDomain();
	const workout = program?.workouts.find(w => w.name === workoutName);

	const handleStartWorkout = () => {
		dispatch({
			type: 'start_workout',
			workoutName,
			programId: program?.program.name
		});
		onNavigate('session');
	};

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			onNavigate('home');
		}
	};

	const formatReps = (reps: { min: number; max: number } | 'AMRAP'): string => {
		if (reps === 'AMRAP') return 'AMRAP';
		if (reps.min === reps.max) return String(reps.min);
		return `${reps.min}-${reps.max}`;
	};

	if (!workout) {
		return (
			<div className="fit-workout-detail-screen">
				<header className="fit-screen-header">
					<button className="fit-back-button" onClick={handleBack}>
						← Back
					</button>
					<h1>Workout</h1>
					<div style={{ width: 44 }} />
				</header>
				<div className="fit-content">
					<div className="fit-empty-state">
						<p>Workout "{workoutName}" not found.</p>
						<button
							className="fit-button-secondary"
							onClick={handleBack}
						>
							Go Back
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="fit-workout-detail-screen">
			<header className="fit-screen-header">
				<button className="fit-back-button" onClick={handleBack}>
					← Back
				</button>
				<h1>Workout</h1>
				<div style={{ width: 44 }} />
			</header>

			<div className="fit-content">
				{/* Workout Info */}
				<section className="fit-card">
					<h2>{workout.name}</h2>
					{workout.description && (
						<p className="fit-workout-description">{workout.description}</p>
					)}
					<p className="fit-workout-meta">
						{workout.exercises.length} exercises
					</p>
				</section>

				{/* Exercise List */}
				<section className="fit-card">
					<h3>Exercises</h3>
					<div className="fit-exercise-list">
						{workout.exercises.map((exercise, index) => (
							<div key={index} className="fit-exercise-item">
								<div className="fit-exercise-name">
									{exercise.name}
									{exercise.optional && (
										<span className="fit-optional-badge">Optional</span>
									)}
								</div>
								<div className="fit-exercise-details">
									<span className="fit-exercise-sets">
										{exercise.sets} × {formatReps(exercise.reps)}
									</span>
									{exercise.weight && (
										<span className="fit-exercise-weight">
											@ {exercise.weight}
										</span>
									)}
									{exercise.intensity && (
										<span className="fit-exercise-intensity">
											{exercise.intensity.type} {exercise.intensity.value}
										</span>
									)}
								</div>
								{exercise.rest && (
									<div className="fit-exercise-rest">
										Rest: {exercise.rest}
									</div>
								)}
								{exercise.note && (
									<div className="fit-exercise-note">
										{exercise.note}
									</div>
								)}
							</div>
						))}
					</div>
				</section>
			</div>

			{/* Start Button - fixed at bottom, outside scrollable content */}
			<div className="fit-action-footer">
				<button
					className="fit-button-primary fit-button-large"
					onClick={handleStartWorkout}
				>
					Start Workout
				</button>
			</div>
		</div>
	);
}
