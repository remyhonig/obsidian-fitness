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
	const [extraRestTime, setExtraRestTime] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

	// Animation state - tracks which set index just completed
	const [justCompletedSet, setJustCompletedSet] = useState<number | null>(null);

	// Selected set for detail panel (defaults to next set to complete)
	const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);

	// Input mode for inline editing in detail panel
	const [detailInputMode, setDetailInputMode] = useState<'none' | 'reps' | 'rpe' | 'weight'>('none');

	// Track if we're editing an existing set (null = new set, number = set index being edited)
	const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);

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

	// Get suggested weight: use last completed set, or fall back to program target
	const getSuggestedWeight = (): number | null => {
		if (!currentExercise) return null;
		const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
		if (lastSet) {
			return lastSet.weight;
		}
		// Fall back to program target weight
		return currentExercise.targetWeight;
	};

	// Target RPE from program, defaulting to 7
	const targetRPE = currentExercise?.targetRPE ?? 7;

	// Check if workout is complete
	if (isSessionComplete() || !currentExercise) {
		const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);

		return (
			<div className="fit-session-screen">
				<header className="fit-screen-header">
					<h1>{session.workout}</h1>
				</header>

				<div className="fit-content">
					<div className="fit-workout-complete">
						<div className="fit-complete-icon">✓</div>
						<h2>Workout Complete!</h2>
						<p className="fit-complete-stats">{totalSets} sets logged</p>
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
			weight: getSuggestedWeight() ?? 0
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

		// Track which set is being completed for animation
		const completingSetIndex = currentExercise.sets.length;
		setJustCompletedSet(completingSetIndex);

		dispatch({
			type: 'complete_set',
			exercise: currentExercise.exercise,
			reps: pendingSet.reps,
			weight: pendingSet.weight,
			rpe: pendingSet.rpe,
			restSeconds: restElapsed
		});

		// Clear animation state after animation completes
		setTimeout(() => setJustCompletedSet(null), 600);

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

	// Format weight for display
	const formatWeight = (weight: number | null): string => {
		if (weight === null) return '?';
		if (weight === 0) return 'BW';
		return `${weight}kg`;
	};

	// Get the effective selected set index (default to next set)
	const effectiveSelectedIndex = selectedSetIndex ?? completedSets;
	const isSelectedSetDone = effectiveSelectedIndex < completedSets;
	const isSelectedSetNext = effectiveSelectedIndex === completedSets;
	const selectedSet = currentExercise?.sets[effectiveSelectedIndex];

	// Handle set card tap
	const handleSetCardTap = (index: number) => {
		setSelectedSetIndex(index);
		setDetailInputMode('none');
		// Reset pending set when selecting a new card
		if (index === completedSets) {
			setPendingSet({
				reps: null,
				rpe: null,
				weight: getSuggestedWeight() ?? 0
			});
		}
	};

	// Handle DONE button - stop set timer, start rest timer, begin input flow
	const handleDoneClick = () => {
		setRestElapsed(0);
		setExtraRestTime(0);
		setEditingSetIndex(null);
		setPendingSet({
			reps: null,
			rpe: null,
			weight: getSuggestedWeight() ?? 0
		});
		setDetailInputMode('reps');
	};

	// Handle Edit button - start editing an existing set
	const handleEditClick = () => {
		if (!isSelectedSetDone || !selectedSet) return;
		setEditingSetIndex(effectiveSelectedIndex);
		setPendingSet({
			reps: selectedSet.reps,
			rpe: selectedSet.rpe,
			weight: selectedSet.weight
		});
		setDetailInputMode('reps');
	};

	// Handle inline reps selection
	const handleInlineReps = (reps: number) => {
		setPendingSet(prev => ({ ...prev, reps }));
		setDetailInputMode('rpe');
	};

	// Handle inline RPE selection
	const handleInlineRPE = (rpe: number) => {
		setPendingSet(prev => ({ ...prev, rpe }));
		setDetailInputMode('weight');
	};

	// Handle inline weight confirm
	const handleInlineWeightConfirm = () => {
		if (pendingSet.reps === null || pendingSet.rpe === null) return;

		if (editingSetIndex !== null) {
			// Editing an existing set
			dispatch({
				type: 'update_set',
				exerciseIndex: session.currentExerciseIndex,
				setIndex: editingSetIndex,
				reps: pendingSet.reps,
				weight: pendingSet.weight,
				rpe: pendingSet.rpe
			});
			setEditingSetIndex(null);
		} else {
			// Completing a new set
			const completingSetIndex = currentExercise.sets.length;
			setJustCompletedSet(completingSetIndex);

			dispatch({
				type: 'complete_set',
				exercise: currentExercise.exercise,
				reps: pendingSet.reps,
				weight: pendingSet.weight,
				rpe: pendingSet.rpe,
				restSeconds: restElapsed
			});

			setTimeout(() => setJustCompletedSet(null), 600);
		}

		setDetailInputMode('none');
		setSelectedSetIndex(null); // Will default to next set
	};

	// Render based on current step
	switch (sessionStep) {
		case 'workout':
			// Calculate rest progress and timing
			const totalRestTarget = restTarget + extraRestTime;
			const isRestComplete = restElapsed >= totalRestTarget;
			const restRemaining = Math.max(0, totalRestTarget - restElapsed);
			const setDuration = isRestComplete ? restElapsed - totalRestTarget : 0;
			const restProgress = Math.min(100, (restElapsed / totalRestTarget) * 100);

			return (
				<div className="fit-session-screen">
					<header className="fit-screen-header">
						<h1>{currentExercise.exercise}</h1>
						<button className="fit-header-btn-cancel" onClick={handleCancel}>
							Cancel
						</button>
					</header>

					<div className="fit-content">
						{/* Set cards */}
						<div className="fit-set-tabs">
							{Array.from({ length: totalSets }, (_, i) => {
								const isDone = i < completedSets;
								const isNext = i === completedSets;
								const isJustCompleted = i === justCompletedSet;
								const isSelected = i === effectiveSelectedIndex;
								const set = currentExercise.sets[i];
								return (
									<div
										key={i}
										className={`fit-set-card ${isDone ? 'done' : ''} ${isNext ? 'next' : ''} ${isJustCompleted ? 'just-completed' : ''} ${isSelected ? 'selected' : ''}`}
										onClick={() => handleSetCardTap(i)}
									>
										{isJustCompleted && (
											<div className="fit-stars">
												<span className="fit-star fit-star-1">✦</span>
												<span className="fit-star fit-star-2">★</span>
												<span className="fit-star fit-star-3">✦</span>
												<span className="fit-star fit-star-4">★</span>
												<span className="fit-star fit-star-5">✦</span>
												<span className="fit-star fit-star-6">★</span>
												<span className="fit-star fit-star-7">✦</span>
												<span className="fit-star fit-star-8">★</span>
												<span className="fit-star fit-star-9">✦</span>
												<span className="fit-star fit-star-10">★</span>
											</div>
										)}
										<div className="fit-set-card-header">
											{isDone && set ? formatWeight(set.weight) : formatWeight(getSuggestedWeight())}
										</div>
										{isDone && set ? (
											<div className="fit-set-card-content">
												<div className="fit-set-card-main">{set.reps}</div>
												<div className="fit-set-card-details">
													RPE {set.rpe}
												</div>
											</div>
										) : (
											<div className="fit-set-card-content">
												<div className="fit-set-card-main">{repsTarget}</div>
												<div className="fit-set-card-details">
													RPE {targetRPE}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Rest timer panel */}
						<div className={`fit-timer-panel ${isRestComplete ? 'complete' : ''}`}>
							<div
								className="fit-timer-progress"
								style={{ width: `${restProgress}%` }}
							/>
							<div className="fit-timer-content">
								{isRestComplete ? (
									<div className="fit-timer-time">
										<span className="fit-timer-label">Set time</span>
										<span className="fit-timer-value">{formatTime(setDuration)}</span>
									</div>
								) : (
									<div className="fit-timer-time">
										<span className="fit-timer-label">Rest</span>
										<span className="fit-timer-value">{formatTime(restRemaining)}</span>
									</div>
								)}
								{!isRestComplete && (
									<button
										className="fit-timer-add-btn"
										onClick={() => setExtraRestTime(prev => prev + 30)}
									>
										+30s
									</button>
								)}
							</div>
						</div>

						{/* Detail panel */}
						<div className="fit-detail-panel">
							<div className="fit-detail-content">
								{detailInputMode === 'none' && (
									<>
										{isSelectedSetNext && (
											<button
												className="fit-button-success fit-done-button"
												onClick={handleDoneClick}
											>
												DONE
											</button>
										)}
										{isSelectedSetDone && selectedSet && (
											<>
												<div className="fit-detail-stats">
													<span>{selectedSet.reps} reps</span>
													<span>{formatWeight(selectedSet.weight)}</span>
													<span>RPE {selectedSet.rpe}</span>
												</div>
												<button
													className="fit-button-secondary fit-edit-button"
													onClick={handleEditClick}
												>
													Edit
												</button>
											</>
										)}
										{!isSelectedSetNext && !isSelectedSetDone && (
											<p className="fit-detail-hint">Complete earlier sets first</p>
										)}
									</>
								)}

								{detailInputMode === 'reps' && (
									<div className="fit-inline-input">
										<h3>How many reps?</h3>
										<div className="fit-number-grid fit-number-grid-inline">
											{Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
												const inRange = num >= currentExercise.targetRepsMin &&
													num <= currentExercise.targetRepsMax;
												return (
													<button
														key={num}
														className={`fit-number-button ${inRange ? 'in-range' : ''}`}
														onClick={() => handleInlineReps(num)}
													>
														{num}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{detailInputMode === 'rpe' && (
									<div className="fit-inline-input">
										<h3>RPE?</h3>
										<div className="fit-number-grid fit-number-grid-inline fit-number-grid-rpe">
											{Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
												const isTarget = num === targetRPE;
												return (
													<button
														key={num}
														className={`fit-number-button ${isTarget ? 'in-range' : ''}`}
														onClick={() => handleInlineRPE(num)}
													>
														{num}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{detailInputMode === 'weight' && (
									<div className="fit-inline-input">
										<h3>Weight (kg)</h3>
										<div className="fit-weight-inline">
											<div className="fit-weight-display-inline">
												{pendingSet.weight === 0 ? 'BW' : pendingSet.weight}
												{pendingSet.weight > 0 && <span className="fit-weight-unit-inline">kg</span>}
											</div>
											<div className="fit-weight-buttons-inline">
												<button onClick={() => setPendingSet(p => ({ ...p, weight: Math.max(0, p.weight - 5) }))}>-5</button>
												<button onClick={() => setPendingSet(p => ({ ...p, weight: Math.max(0, p.weight - 1) }))}>-1</button>
												<button onClick={() => setPendingSet(p => ({ ...p, weight: p.weight + 1 }))}>+1</button>
												<button onClick={() => setPendingSet(p => ({ ...p, weight: p.weight + 5 }))}>+5</button>
											</div>
											<button
												className="fit-button-success fit-confirm-inline"
												onClick={handleInlineWeightConfirm}
											>
												Confirm ({pendingSet.reps} reps @ {pendingSet.weight === 0 ? 'BW' : `${pendingSet.weight}kg`})
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Skip button at bottom of panel */}
							<button className="fit-skip-btn-panel" onClick={handleSkipExercise}>
								Skip Exercise
							</button>
						</div>
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
								{Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
									const isTarget = num === targetRPE;
									return (
										<button
											key={num}
											className={`fit-number-button ${isTarget ? 'in-range' : ''}`}
											onClick={() => handleSelectRPE(num)}
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
