/**
 * SessionScreen Component
 *
 * Active workout session showing:
 * - Current exercise
 * - Set logging interface
 * - Progress through workout
 */

import React, { useState } from 'react';
import { useDomain } from '../contexts';

interface SessionScreenProps {
	onNavigate: (screen: string, params?: any) => void;
}

export function SessionScreen({ onNavigate }: SessionScreenProps) {
	const { program, session, dispatch } = useDomain();
	const [currentWeight, setCurrentWeight] = useState('');
	const [currentReps, setCurrentReps] = useState('');
	const [currentRPE, setCurrentRPE] = useState('8');

	if (!session.isActive || !session.workout) {
		onNavigate('home');
		return null;
	}

	const workout = program?.workouts.find(w => w.name === session.workout);
	if (!workout) {
		return <div>Workout not found</div>;
	}

	const currentExercise = workout.exercises[session.currentExerciseIndex];
	if (!currentExercise) {
		// Workout complete
		return (
			<div className="fit-session-screen">
				<div className="fit-workout-complete">
					<h2>Workout Complete! 🎉</h2>
					<p>{session.completedSets.length} sets logged</p>
					<button
						className="fit-button-primary"
						onClick={() => {
							dispatch({ type: 'finish_session' });
							onNavigate('finish');
						}}
					>
						Finish & Save
					</button>
				</div>
			</div>
		);
	}

	const handleLogSet = () => {
		const reps = parseInt(currentReps, 10);
		const rpe = parseInt(currentRPE, 10);
		const weight = currentWeight;

		if (!reps || !weight) {
			return;
		}

		dispatch({
			type: 'complete_set',
			exercise: currentExercise.name,
			reps,
			weight,
			rpe
		});

		// Clear inputs for next set
		setCurrentReps('');
	};

	const handleSkipExercise = () => {
		dispatch({ type: 'skip_exercise', exercise: currentExercise.name });
	};

	const currentSetNumber = session.currentSetIndex + 1;
	const totalSets = currentExercise.sets;
	const repsTarget = typeof currentExercise.reps === 'string'
		? currentExercise.reps
		: `${currentExercise.reps.min}-${currentExercise.reps.max}`;

	return (
		<div className="fit-session-screen">
			<header className="fit-screen-header">
				<button onClick={() => onNavigate('home')}>← Back</button>
				<h1>{session.workout}</h1>
			</header>

			<div className="fit-content">
				{/* Progress */}
				<div className="fit-progress">
					<p>Exercise {session.currentExerciseIndex + 1} of {workout.exercises.length}</p>
					<progress
						value={session.currentExerciseIndex}
						max={workout.exercises.length}
					/>
				</div>

				{/* Current Exercise */}
				<section className="fit-card">
					<h2>{currentExercise.name}</h2>
					<div className="fit-exercise-target">
						<p><strong>Target:</strong> {totalSets} × {repsTarget}</p>
						{currentExercise.weight && (
							<p><strong>Weight:</strong> {currentExercise.weight}</p>
						)}
						{currentExercise.intensity && (
							<p><strong>{currentExercise.intensity.type}:</strong> {currentExercise.intensity.value}</p>
						)}
						{currentExercise.rest && (
							<p><strong>Rest:</strong> {currentExercise.rest}</p>
						)}
					</div>
				</section>

				{/* Set Logger */}
				<section className="fit-card">
					<h3>Log Set {currentSetNumber} / {totalSets}</h3>
					<div className="fit-set-logger">
						<div className="fit-input-group">
							<label>Reps</label>
							<input
								type="number"
								value={currentReps}
								onChange={(e) => setCurrentReps(e.target.value)}
								placeholder={repsTarget}
							/>
						</div>
						<div className="fit-input-group">
							<label>Weight</label>
							<input
								type="text"
								value={currentWeight}
								onChange={(e) => setCurrentWeight(e.target.value)}
								placeholder={currentExercise.weight || 'BW'}
							/>
						</div>
						<div className="fit-input-group">
							<label>RPE</label>
							<input
								type="number"
								min="1"
								max="10"
								value={currentRPE}
								onChange={(e) => setCurrentRPE(e.target.value)}
							/>
						</div>
					</div>
					<button
						className="fit-button-primary"
						onClick={handleLogSet}
					>
						Log Set
					</button>
				</section>

				{/* Completed Sets */}
				{session.completedSets.length > 0 && (
					<section className="fit-card">
						<h3>Completed Sets</h3>
						<table className="fit-sets-table">
							<thead>
								<tr>
									<th>Exercise</th>
									<th>Reps</th>
									<th>Weight</th>
									<th>RPE</th>
								</tr>
							</thead>
							<tbody>
								{session.completedSets.map((set, index) => (
									<tr key={index}>
										<td>{set.exercise}</td>
										<td>{set.reps}</td>
										<td>{set.weight}</td>
										<td>{set.rpe}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
				)}

				<button
					className="fit-button-secondary"
					onClick={handleSkipExercise}
				>
					Skip Exercise
				</button>
			</div>
		</div>
	);
}
