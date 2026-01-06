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

import React, { useState, useEffect, useMemo } from 'react';
import { useDomain } from '../contexts';
import type { ExerciseExecutionView, MediaReference } from '../../../domain/fitness-domain-adapter';

type SessionStep = 'workout' | 'reps' | 'rpe' | 'weight';

/**
 * YouTube media info - can be embeddable (video/shorts) or external (search)
 */
interface YouTubeMedia {
	type: 'youtube-video' | 'youtube-shorts' | 'youtube-search';
	url: string;
	videoId?: string;
	description: string | null;
}

/**
 * Extract YouTube media from media references
 * Priority: 1. Shorts (embeddable), 2. Videos (embeddable), 3. Search (browser)
 */
function getYouTubeMedia(media: MediaReference[]): YouTubeMedia | null {
	// First pass: look for shorts (highest priority - embeddable)
	for (const m of media) {
		if (m.type === 'youtube-shorts') {
			return { type: 'youtube-shorts', url: m.url, videoId: m.videoId, description: m.description };
		}
	}
	// Second pass: look for videos (embeddable)
	for (const m of media) {
		if (m.type === 'youtube-video') {
			return { type: 'youtube-video', url: m.url, videoId: m.videoId, description: m.description };
		}
	}
	// Third pass: look for search (fallback - opens browser)
	for (const m of media) {
		if (m.type === 'youtube-search') {
			return { type: 'youtube-search', url: m.url, description: m.description };
		}
	}
	return null;
}

/**
 * Extract image URL from media references
 */
function getImageUrl(media: MediaReference[]): { url: string; description: string | null } | null {
	for (const m of media) {
		if (m.type === 'image') {
			return { url: m.url, description: m.description };
		}
	}
	return null;
}

/**
 * YouTube button component - badge on thumbnail
 */
function YouTubeButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			className="fit-youtube-btn"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			title="Watch exercise video"
		>
			<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
			</svg>
		</button>
	);
}


/**
 * Image modal component - fullscreen overlay with exercise image
 */
function ImageModal({ url, description, onClose }: { url: string; description: string | null; onClose: () => void }) {
	return (
		<div className="fit-image-modal" onClick={onClose}>
			<div className="fit-image-modal-content" onClick={(e) => e.stopPropagation()}>
				<button className="fit-image-modal-close" onClick={onClose}>×</button>
				<img src={url} alt={description || 'Exercise illustration'} />
				{description && <p className="fit-image-modal-desc">{description}</p>}
			</div>
		</div>
	);
}

interface PendingSet {
	reps: number | null;
	rpe: number | null;
	weight: number;
}

interface SessionScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function SessionScreen({ onNavigate }: SessionScreenProps) {
	const { adapter, session, dispatch, saveSession, getSessionProgress, isSessionComplete } = useDomain();

	// Step flow state
	const [sessionStep, setSessionStep] = useState<SessionStep>('workout');
	const [pendingSet, setPendingSet] = useState<PendingSet>({
		reps: null,
		rpe: null,
		weight: 0
	});

	// Timer state - calculated from session.restStartTime
	const [restElapsed, setRestElapsed] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

	// Extra rest time comes from session state (global)
	const extraRestTime = session.extraRestTime;

	// Animation state - tracks which set index just completed
	const [justCompletedSet, setJustCompletedSet] = useState<number | null>(null);

	// Selected set for detail panel (defaults to next set to complete)
	const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);

	// Input mode for inline editing in detail panel
	const [detailInputMode, setDetailInputMode] = useState<'none' | 'reps' | 'rpe' | 'weight'>('none');

	// Track if we're editing an existing set (null = new set, number = set index being edited)
	const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);

	// Image modal state
	const [showImageModal, setShowImageModal] = useState(false);

	// Viewed exercise index - allows browsing other exercises while tracking active one
	// Defaults to current active exercise, resets when active changes
	const [viewedExerciseIndex, setViewedExerciseIndex] = useState(session.currentExerciseIndex);

	// Reset viewed index when active exercise changes (e.g., after completing all sets)
	useEffect(() => {
		setViewedExerciseIndex(session.currentExerciseIndex);
	}, [session.currentExerciseIndex]);

	// Get current exercise from session state
	const currentExercise = session.exercises[session.currentExerciseIndex];

	// Get viewed exercise (may be different from active when browsing)
	// Falls back to current exercise if viewed index is somehow invalid
	const viewedExercise = session.exercises[viewedExerciseIndex] ?? currentExercise;
	const isViewingActiveExercise = viewedExerciseIndex === session.currentExerciseIndex;

	// Create a stable key that changes when set data changes (not just length)
	// This ensures execution view recalculates when sets are edited
	const setsKey = useMemo(() => {
		if (!currentExercise?.sets) return '';
		return currentExercise.sets.map(s => `${s.reps}-${s.weight}-${s.rpe}`).join('|');
	}, [currentExercise?.sets]);

	// Get execution view for current exercise (provides dynamic set targets)
	// Recalculates when exercise index or set data changes
	const executionView: ExerciseExecutionView | null = useMemo(() => {
		if (!currentExercise) return null;
		return adapter.getExecutionView(session.currentExerciseIndex);
	}, [adapter, session.currentExerciseIndex, setsKey]);

	// Timer effect - calculates elapsed time from session.restStartTime
	useEffect(() => {
		if (sessionStep !== 'workout' || !session.restStartTime) return;

		const updateElapsed = () => {
			const elapsed = Math.floor((Date.now() - session.restStartTime!) / 1000);
			setRestElapsed(elapsed);
		};

		updateElapsed();
		const interval = setInterval(updateElapsed, 1000);
		return () => clearInterval(interval);
	}, [sessionStep, session.restStartTime]);

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

	// Get suggested weight for a specific set index
	// Uses execution view targets (dynamic based on progression rules)
	const getSuggestedWeightForSet = (setIndex: number): number | null => {
		// Use execution view if available
		if (executionView?.sets[setIndex]) {
			const targetWeight = executionView.sets[setIndex].target.weight;
			// Parse weight string (e.g., "80kg" or "bodyweight")
			if (targetWeight.toLowerCase().includes('body')) {
				return 0;
			}
			const match = targetWeight.match(/(\d+(?:\.\d+)?)/);
			if (match?.[1]) {
				return parseFloat(match[1]);
			}
		}

		// Fall back to last completed set or program target
		if (!currentExercise) return null;
		const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
		if (lastSet) {
			return lastSet.weight;
		}
		return currentExercise.targetWeight;
	};

	// Legacy function - use for next set (completedSets index)
	const getSuggestedWeight = (): number | null => {
		if (!currentExercise) return null;
		return getSuggestedWeightForSet(currentExercise.sets.length);
	};

	// Target RPE from program, defaulting to 7
	const targetRPE = currentExercise?.targetRPE ?? 7;

	// Check if workout is complete
	if (isSessionComplete() || !currentExercise || !viewedExercise) {
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

	// Handle DONE button - begin input flow for logging the set
	const handleDoneClick = () => {
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

			// Get YouTube media and image for viewed exercise
			const youtubeMedia = getYouTubeMedia(viewedExercise.media);
			const imageData = getImageUrl(viewedExercise.media);

			// Handle YouTube button click - always open in browser
			// (YouTube blocks embeds from Obsidian's app:// origin)
			const handleYouTubeClick = () => {
				if (!youtubeMedia) return;
				window.open(youtubeMedia.url, '_blank');
			};

			return (
				<div className="fit-session-screen">
					{/* Image modal */}
					{showImageModal && imageData && (
						<ImageModal
							url={imageData.url}
							description={imageData.description}
							onClose={() => setShowImageModal(false)}
						/>
					)}

					<header
						className={`fit-screen-header fit-screen-header-nav ${!isRestComplete && isViewingActiveExercise ? 'fit-header-resting' : ''}`}
						onClick={!isRestComplete && isViewingActiveExercise ? () => dispatch({ type: 'add_extra_rest', seconds: 15 }) : undefined}
						style={{
							'--rest-progress': !isRestComplete && isViewingActiveExercise ? `${restProgress}%` : '0%',
							cursor: !isRestComplete && isViewingActiveExercise ? 'pointer' : undefined
						} as React.CSSProperties}
					>
						<button
							className="fit-header-nav-btn"
							onClick={(e) => { e.stopPropagation(); setViewedExerciseIndex(i => Math.max(0, i - 1)); }}
							disabled={viewedExerciseIndex === 0}
						>
							‹
						</button>
						<div
							className={`fit-exercise-title ${!isViewingActiveExercise ? 'fit-exercise-title-browsing' : ''}`}
							onClick={(e) => { e.stopPropagation(); setViewedExerciseIndex(session.currentExerciseIndex); }}
						>
							<h1>{viewedExercise.exercise}</h1>
							{!isViewingActiveExercise && (
								<span className="fit-return-hint">Tap to return to active</span>
							)}
							{isViewingActiveExercise && !isRestComplete && (
								<span className="fit-header-timer">{formatTime(restRemaining)}</span>
							)}
						</div>
						<button
							className="fit-header-nav-btn"
							onClick={(e) => { e.stopPropagation(); setViewedExerciseIndex(i => Math.min(session.exercises.length - 1, i + 1)); }}
							disabled={viewedExerciseIndex === session.exercises.length - 1}
						>
							›
						</button>
					</header>

					<div className="fit-content">
						{/* Exercise media row - image and comments */}
						{(imageData || viewedExercise.note) && (
							<div className="fit-exercise-media-row">
								{imageData && (
									<div
										className="fit-exercise-preview"
										onClick={() => setShowImageModal(true)}
									>
										<img src={imageData.url} alt={imageData.description || 'Exercise illustration'} />
										{youtubeMedia && <YouTubeButton onClick={handleYouTubeClick} />}
									</div>
								)}
								{viewedExercise.note && (
									<p className="fit-exercise-note">{viewedExercise.note}</p>
								)}
							</div>
						)}

						{/* Set cards */}
						<div className="fit-set-tabs">
							{Array.from({ length: viewedExercise.targetSets }, (_, i) => {
								const viewedCompletedSets = viewedExercise.sets.length;
								const isDone = i < viewedCompletedSets;
								const isNext = i === viewedCompletedSets && isViewingActiveExercise;
								const isJustCompleted = i === justCompletedSet && isViewingActiveExercise;
								const isSelected = i === effectiveSelectedIndex && isViewingActiveExercise;
								const set = viewedExercise.sets[i];
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
											{isDone && set ? formatWeight(set.weight) : formatWeight(viewedExercise.targetWeight)}
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
												<div className="fit-set-card-main">
													{viewedExercise.targetRepsMin === viewedExercise.targetRepsMax
														? String(viewedExercise.targetRepsMin)
														: `${viewedExercise.targetRepsMin}-${viewedExercise.targetRepsMax}`}
												</div>
												<div className="fit-set-card-details">
													RPE {viewedExercise.targetRPE ?? 7}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Adjustments panel - show rule or auto-match adjustments for next set (only for active exercise) */}
						{isViewingActiveExercise && executionView && (() => {
							// Get the next pending set's adjustment
							const nextPendingSet = executionView.sets[completedSets];
							const adjustment = nextPendingSet?.target.adjustment;

							// Only show if there's an adjustment of any type
							if (!adjustment) return null;

							const isRuleApplied = adjustment.type === 'rule_applied';
							const isAutoMatched = adjustment.type === 'auto_matched';

							return (
								<div className={`fit-triggered-rules ${isAutoMatched ? 'auto-matched' : ''}`}>
									<div className="fit-rule-item">
										<span className="fit-rule-icon">{isRuleApplied ? '⚡' : '↔'}</span>
										<div className="fit-rule-content">
											<span className="fit-rule-reason">{adjustment.reason}</span>
											{adjustment.ruleSource && (
												<span className="fit-rule-source">{adjustment.ruleSource}</span>
											)}
										</div>
									</div>
								</div>
							);
						})()}

						{/* Detail panel */}
						<div className="fit-detail-panel">
							<div className="fit-detail-content">
								{!isViewingActiveExercise ? (
									<>
										<p className="fit-detail-hint">
											{viewedExercise.sets.length}/{viewedExercise.targetSets} sets completed
										</p>
										<button
											className="fit-button-success fit-done-button"
											onClick={() => setViewedExerciseIndex(session.currentExerciseIndex)}
										>
											Return to Active Exercise
										</button>
									</>
								) : detailInputMode === 'none' ? (
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
								) : null}

								{isViewingActiveExercise && detailInputMode === 'reps' && (
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

								{isViewingActiveExercise && detailInputMode === 'rpe' && (
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

								{isViewingActiveExercise && detailInputMode === 'weight' && (
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

							{/* Skip and Cancel buttons at bottom of panel */}
							{isViewingActiveExercise && (
								<div className="fit-panel-actions">
									<button className="fit-skip-btn-panel" onClick={handleSkipExercise}>
										Skip Exercise
									</button>
									<button className="fit-cancel-btn-panel" onClick={handleCancel}>
										Cancel Workout
									</button>
								</div>
							)}
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
