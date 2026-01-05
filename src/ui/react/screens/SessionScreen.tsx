/**
 * SessionScreen Component
 *
 * Active workout session showing:
 * - Current exercise
 * - Set logging interface
 * - Progress through workout
 * - Auto-save after each set
 */

import React, { useState, useEffect } from 'react';
import { useDomain } from '../contexts';

interface SessionScreenProps {
	onNavigate: (screen: string, params?: any) => void;
}

export function SessionScreen({ onNavigate }: SessionScreenProps) {
	const { program, session, dispatch, saveSession, getSessionProgress, isSessionComplete } = useDomain();
	const [currentWeight, setCurrentWeight] = useState('');
	const [currentReps, setCurrentReps] = useState('');
	const [currentRPE, setCurrentRPE] = useState('8');
	const [isSaving, setIsSaving] = useState(false);
	const [restElapsed, setRestElapsed] = useState(0);

	// Get current exercise from session state
	const currentExercise = session.exercises[session.currentExerciseIndex];

	// Timer effect - counts up every second
	useEffect(() => {
		const interval = setInterval(() => {
			setRestElapsed(prev => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// Format seconds to M:SS
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Auto-save after each set
	useEffect(() => {
		if (session.isActive && session.exercises.some(e => e.sets.length > 0)) {
			void saveSession();
		}
	}, [session.exercises]);

	if (!session.isActive || !session.workout) {
		onNavigate('home');
		return null;
	}

	// Check if workout is complete
	if (isSessionComplete() || !currentExercise) {
		const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);

		return (
			<div className="fit-session-screen">
				<div className="fit-workout-complete">
					<h2>Workout Complete!</h2>
					<p>{totalSets} sets logged</p>
					<button
						className="fit-button-primary"
						disabled={isSaving}
						onClick={async () => {
							setIsSaving(true);
							dispatch({ type: 'finish_session' });
							await saveSession();
							setIsSaving(false);
							onNavigate('finish');
						}}
					>
						{isSaving ? 'Saving...' : 'Finish & Save'}
					</button>
				</div>
			</div>
		);
	}

	const handleLogSet = async () => {
		const reps = parseInt(currentReps, 10);
		const rpe = parseInt(currentRPE, 10);
		const weight = parseFloat(currentWeight) || 0;

		if (!reps) {
			return;
		}

		dispatch({
			type: 'complete_set',
			exercise: currentExercise.exercise,
			reps,
			weight,
			rpe: isNaN(rpe) ? 8 : rpe,
			restSeconds: restElapsed
		});

		// Reset timer and clear inputs for next set
		setRestElapsed(0);
		setCurrentReps('');
	};

	const handleSkipExercise = () => {
		dispatch({ type: 'next_exercise' });
		setCurrentReps('');
	};

	const completedSetsForExercise = currentExercise.sets.length;
	const currentSetNumber = completedSetsForExercise + 1;
	const totalSets = currentExercise.targetSets;
	const repsTarget = currentExercise.targetRepsMin === currentExercise.targetRepsMax
		? String(currentExercise.targetRepsMin)
		: `${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax}`;

	const progress = getSessionProgress();

	// Get all completed sets across all exercises for the table
	const allCompletedSets = session.exercises.flatMap(e =>
		e.sets.map(s => ({
			...s,
			exerciseName: e.exercise
		}))
	);

	return (
		<div className="fit-session-screen">
			<header className="fit-screen-header">
				<button onClick={() => onNavigate('home')}>← Back</button>
				<h1>{session.workout}</h1>
			</header>

			<div className="fit-content">
				{/* Progress */}
				<div className="fit-progress">
					<p>Exercise {session.currentExerciseIndex + 1} of {session.exercises.length} ({progress}% complete)</p>
					<progress
						value={progress}
						max={100}
					/>
				</div>

				{/* Current Exercise */}
				<section className="fit-card">
					<h2>{currentExercise.exercise}</h2>
					<div className="fit-exercise-target">
						<p><strong>Target:</strong> {totalSets} × {repsTarget}</p>
						<p><strong>Rest:</strong> {currentExercise.restSeconds}s</p>
					</div>
				</section>

				{/* Rest Timer */}
				<section className="fit-timer-card">
					<div className="fit-timer-display">
						<div className="fit-timer-elapsed">
							<span className="fit-timer-label">Rest</span>
							<span className="fit-timer-value">{formatTime(restElapsed)}</span>
						</div>
						<div className={`fit-timer-remaining ${restElapsed >= currentExercise.restSeconds ? 'fit-timer-ready' : ''}`}>
							<span className="fit-timer-label">Remaining</span>
							<span className="fit-timer-value">
								{restElapsed >= currentExercise.restSeconds
									? 'Ready!'
									: formatTime(currentExercise.restSeconds - restElapsed)}
							</span>
						</div>
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
							<label>Weight (kg)</label>
							<input
								type="number"
								step="0.5"
								value={currentWeight}
								onChange={(e) => setCurrentWeight(e.target.value)}
								placeholder="0 for bodyweight"
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

				{/* Completed Sets for Current Exercise */}
				{currentExercise.sets.length > 0 && (
					<section className="fit-card">
						<h3>Sets for {currentExercise.exercise}</h3>
						<table className="fit-sets-table">
							<thead>
								<tr>
									<th>#</th>
									<th>Reps</th>
									<th>Weight</th>
									<th>RPE</th>
								</tr>
							</thead>
							<tbody>
								{currentExercise.sets.map((set) => (
									<tr key={set.setNumber}>
										<td>{set.setNumber}</td>
										<td>{set.reps}</td>
										<td>{set.weight === 0 ? 'BW' : `${set.weight}kg`}</td>
										<td>{set.rpe}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
				)}

				{/* All Completed Sets */}
				{allCompletedSets.length > currentExercise.sets.length && (
					<section className="fit-card">
						<h3>All Completed Sets</h3>
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
								{allCompletedSets.map((set, index) => (
									<tr key={index}>
										<td>{set.exerciseName}</td>
										<td>{set.reps}</td>
										<td>{set.weight === 0 ? 'BW' : `${set.weight}kg`}</td>
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
