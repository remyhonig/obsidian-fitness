/**
 * SessionScreen Component
 *
 * Multi-step workout session flow:
 * 1. Workout step - Shows exercise, timer, "Log Set" button
 * 2. Reps step - Grid of 1-20 to select reps
 * 3. RPE step - Grid of 1-10 to select perceived exertion
 * 4. Weight step - Pre-filled weight with +/- adjustment
 *
 * Uses consistent layout with standard header and bottom navigation.
 */

import React, { useState, useEffect } from 'react';
import { useDomain } from '../contexts';

type SessionStep = 'workout' | 'reps' | 'rpe' | 'weight';

interface PendingSet {
	reps: number | null;
	rpe: number | null;
	weight: number;
}

interface SessionScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function SessionScreen({ onNavigate }: SessionScreenProps) {
	const { session, dispatch, saveSession, getSessionProgress, isSessionComplete } = useDomain();

	// Step flow state
	const [sessionStep, setSessionStep] = useState<SessionStep>('workout');
	const [pendingSet, setPendingSet] = useState<PendingSet>({
		reps: null,
		rpe: null,
		weight: 0
	});

	// Timer state
	const [restElapsed, setRestElapsed] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

	// Get current exercise from session state
	const currentExercise = session.exercises[session.currentExerciseIndex];

	// Timer effect - counts up every second (only on workout step)
	useEffect(() => {
		if (sessionStep !== 'workout') return;

		const interval = setInterval(() => {
			setRestElapsed(prev => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [sessionStep]);

	// Format seconds to M:SS
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Get last weight used for this exercise
	const getLastWeight = (): number => {
		const exercise = session.exercises[session.currentExerciseIndex];
		if (!exercise) return 0;
		const lastSet = exercise.sets[exercise.sets.length - 1];
		if (lastSet) {
			return lastSet.weight;
		}
		return 0;
	};

	// Auto-save after each set
	useEffect(() => {
		if (session.isActive && session.exercises.some(e => e.sets.length > 0)) {
			void saveSession();
		}
	}, [session.exercises]);

	// Redirect if no active session
	if (!session.isActive || !session.workout) {
		onNavigate('home');
		return null;
	}

	// Handle cancel workout
	const handleCancel = () => {
		// TODO: Could add confirmation dialog
		dispatch({ type: 'cancel_session' });
		onNavigate('home');
	};

	// Check if workout is complete
	if (isSessionComplete() || !currentExercise) {
		const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);

		return (
			<div className="fit-session-screen">
				<header className="fit-screen-header">
					<div style={{ width: 70 }} /> {/* Spacer to balance Cancel button */}
					<h1>{session.workout}</h1>
					<button className="fit-header-btn-cancel" onClick={handleCancel}>
						Cancel
					</button>
				</header>

				<div className="fit-content">
					<div className="fit-workout-complete">
						<div className="fit-exercise-current">
							<h2>Workout Complete!</h2>
							<p className="fit-exercise-target">{totalSets} sets logged</p>
						</div>
						<button
							className="fit-button-success fit-log-set-button"
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
			</div>
		);
	}

	// Step handlers
	const handleStartLogSet = () => {
		setPendingSet({
			reps: null,
			rpe: null,
			weight: getLastWeight()
		});
		setSessionStep('reps');
	};

	const handleSelectReps = (reps: number) => {
		setPendingSet(prev => ({ ...prev, reps }));
		setSessionStep('rpe');
	};

	const handleSelectRPE = (rpe: number) => {
		setPendingSet(prev => ({ ...prev, rpe }));
		setSessionStep('weight');
	};

	const handleConfirmWeight = () => {
		if (pendingSet.reps === null || pendingSet.rpe === null) return;

		dispatch({
			type: 'complete_set',
			exercise: currentExercise.exercise,
			reps: pendingSet.reps,
			weight: pendingSet.weight,
			rpe: pendingSet.rpe,
			restSeconds: restElapsed
		});

		setRestElapsed(0);
		setSessionStep('workout');
	};

	const handleSkipExercise = () => {
		dispatch({ type: 'next_exercise' });
		setSessionStep('workout');
	};

	const handleBack = () => {
		if (sessionStep === 'reps') {
			setSessionStep('workout');
		} else if (sessionStep === 'rpe') {
			setSessionStep('reps');
		} else if (sessionStep === 'weight') {
			setSessionStep('rpe');
		}
	};

	// Calculate display values
	const completedSets = currentExercise.sets.length;
	const currentSetNumber = completedSets + 1;
	const totalSets = currentExercise.targetSets;
	const repsTarget = currentExercise.targetRepsMin === currentExercise.targetRepsMax
		? String(currentExercise.targetRepsMin)
		: `${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax}`;

	const restTarget = currentExercise.restSeconds;
	const isRestComplete = restElapsed >= restTarget;

	// Render based on current step
	switch (sessionStep) {
		case 'workout':
			return (
				<div className="fit-session-screen">
					<header className="fit-screen-header">
						<div style={{ width: 70 }} /> {/* Spacer to balance Cancel button */}
						<h1>{session.workout}</h1>
						<button className="fit-header-btn-cancel" onClick={handleCancel}>
							Cancel
						</button>
					</header>

					<div className="fit-content">
						<div className="fit-exercise-current">
							<h2>{currentExercise.exercise}</h2>
							<p className="fit-exercise-target">
								{totalSets} × {repsTarget} reps
							</p>
						</div>

						<div className="fit-set-indicator">
							Set {currentSetNumber} of {totalSets}
						</div>

						<div className={`fit-rest-timer ${isRestComplete ? 'ready' : ''}`}>
							<div className="fit-rest-timer-label">
								{isRestComplete ? 'Ready!' : 'Rest'}
							</div>
							<div className="fit-rest-timer-value">
								{isRestComplete
									? formatTime(restElapsed)
									: formatTime(restTarget - restElapsed)}
							</div>
						</div>

						{completedSets > 0 && (
							<div className="fit-completed-sets">
								<h3>Completed</h3>
								<div className="fit-completed-sets-list">
									{currentExercise.sets.map((set, i) => (
										<div key={i} className="fit-set-chip">
											{set.reps} × {set.weight === 0 ? 'BW' : `${set.weight}kg`}
										</div>
									))}
								</div>
							</div>
						)}

						<button
							className="fit-button-primary fit-log-set-button"
							onClick={handleStartLogSet}
						>
							Log Set
						</button>

						<button
							className="fit-skip-button"
							onClick={handleSkipExercise}
						>
							Skip Exercise
						</button>
					</div>
				</div>
			);

		case 'reps':
			return (
				<div className="fit-session-screen">
					<header className="fit-screen-header">
						<button className="fit-header-btn-back" onClick={handleBack}>
							← Back
						</button>
						<h1>Reps</h1>
						<button className="fit-header-btn-cancel" onClick={handleCancel}>
							Cancel
						</button>
					</header>

					<div className="fit-content">
						<div className="fit-number-step">
							<h2>How many reps?</h2>
							<div className="fit-number-grid fit-number-grid-reps">
								{Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
									const inRange = num >= currentExercise.targetRepsMin &&
										num <= currentExercise.targetRepsMax;
									return (
										<button
											key={num}
											className={`fit-number-button ${inRange ? 'in-range' : ''}`}
											onClick={() => handleSelectReps(num)}
										>
											{num}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			);

		case 'rpe':
			return (
				<div className="fit-session-screen">
					<header className="fit-screen-header">
						<button className="fit-header-btn-back" onClick={handleBack}>
							← Back
						</button>
						<h1>RPE</h1>
						<button className="fit-header-btn-cancel" onClick={handleCancel}>
							Cancel
						</button>
					</header>

					<div className="fit-content">
						<div className="fit-number-step">
							<h2>Rate of Perceived Exertion</h2>
							<div className="fit-number-grid fit-number-grid-rpe">
								{Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
									<button
										key={num}
										className="fit-number-button"
										onClick={() => handleSelectRPE(num)}
									>
										{num}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			);

		case 'weight':
			return (
				<div className="fit-session-screen">
					<header className="fit-screen-header">
						<button className="fit-header-btn-back" onClick={handleBack}>
							← Back
						</button>
						<h1>Weight</h1>
						<button className="fit-header-btn-cancel" onClick={handleCancel}>
							Cancel
						</button>
					</header>

					<div className="fit-content">
						<div className="fit-weight-step">
							<h2>Set weight (kg)</h2>

							<div className="fit-weight-display">
								<div className="fit-weight-value">
									{pendingSet.weight === 0 ? 'BW' : pendingSet.weight}
								</div>
								{pendingSet.weight > 0 && (
									<div className="fit-weight-unit">kg</div>
								)}
							</div>

							<div className="fit-weight-buttons">
								<button
									className="fit-weight-adjust fit-weight-adjust-large"
									onClick={() => setPendingSet(p => ({
										...p,
										weight: Math.max(0, p.weight - 5)
									}))}
								>
									-5
								</button>
								<button
									className="fit-weight-adjust"
									onClick={() => setPendingSet(p => ({
										...p,
										weight: Math.max(0, p.weight - 1)
									}))}
								>
									-1
								</button>
								<button
									className="fit-weight-adjust"
									onClick={() => setPendingSet(p => ({
										...p,
										weight: p.weight + 1
									}))}
								>
									+1
								</button>
								<button
									className="fit-weight-adjust fit-weight-adjust-large"
									onClick={() => setPendingSet(p => ({
										...p,
										weight: p.weight + 5
									}))}
								>
									+5
								</button>
							</div>

							<button
								className="fit-button-success fit-weight-confirm"
								onClick={handleConfirmWeight}
							>
								Confirm ({pendingSet.reps} reps @ {pendingSet.weight === 0 ? 'BW' : `${pendingSet.weight}kg`})
							</button>
						</div>
					</div>
				</div>
			);
	}
}
