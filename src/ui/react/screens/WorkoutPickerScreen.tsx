/**
 * WorkoutPickerScreen Component
 *
 * Displays available workouts from the loaded program.
 * Allows user to search and select a workout to start.
 */

import React, { useState } from 'react';
import { useDomain } from '../contexts';

interface WorkoutPickerScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	isTab?: boolean;
}

export function WorkoutPickerScreen({ onNavigate, isTab = false }: WorkoutPickerScreenProps) {
	const { program, dispatch } = useDomain();
	const [searchQuery, setSearchQuery] = useState('');

	// Filter workouts based on search query
	const workouts = program?.workouts ?? [];
	const filteredWorkouts = searchQuery
		? workouts.filter(w =>
			w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			w.description?.toLowerCase().includes(searchQuery.toLowerCase())
		)
		: workouts;

	const handleStartWorkout = (workoutName: string) => {
		dispatch({
			type: 'start_workout',
			workoutName,
			programId: program?.program.name
		});
		onNavigate('session');
	};

	const handleStartEmptyWorkout = () => {
		dispatch({
			type: 'start_workout',
			workoutName: 'Empty Workout'
		});
		onNavigate('session');
	};

	return (
		<div className="fit-workout-picker-screen">
			<header className="fit-screen-header">
				{!isTab && <button onClick={() => onNavigate('home')}>← Back</button>}
				<h1>{isTab ? 'Workouts' : 'Start Workout'}</h1>
				{!isTab && <div style={{ width: 44 }} />}
			</header>

			<div className="fit-content">
				{/* Search */}
				<div className="fit-search-container">
					<input
						type="text"
						className="fit-search-input"
						placeholder="Search workouts..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				{/* Program check */}
				{!program ? (
					<div className="fit-empty-state">
						<p>No program loaded. Load a training program first.</p>
						<button
							className="fit-button-secondary"
							onClick={() => onNavigate('home')}
						>
							Go Home
						</button>
					</div>
				) : (
					<>
						{/* Workout list */}
						<div className="fit-workout-list">
							{filteredWorkouts.length === 0 ? (
								<div className="fit-empty-state">
									{searchQuery
										? 'No workouts found matching your search.'
										: 'No workouts defined in this program.'}
								</div>
							) : (
								filteredWorkouts.map((workout) => (
									<div
										key={workout.name}
										className="fit-workout-card"
										onClick={() => handleStartWorkout(workout.name)}
									>
										<div className="fit-workout-card-header">
											<h3>{workout.name}</h3>
											<span className="fit-workout-exercise-count">
												{workout.exercises.length} exercises
											</span>
										</div>
										{workout.description && (
											<p className="fit-workout-description">
												{workout.description}
											</p>
										)}
										<div className="fit-workout-exercises-preview">
											{workout.exercises.slice(0, 3).map((e, i) => (
												<span key={i} className="fit-exercise-tag">
													{e.name}
												</span>
											))}
											{workout.exercises.length > 3 && (
												<span className="fit-exercise-more">
													+{workout.exercises.length - 3} more
												</span>
											)}
										</div>
									</div>
								))
							)}
						</div>

						{/* Empty workout option */}
						<div className="fit-empty-workout-option">
							<button
								className="fit-button-ghost"
								onClick={handleStartEmptyWorkout}
							>
								Start empty workout
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
