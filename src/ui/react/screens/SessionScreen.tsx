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

import { useState, useEffect, useMemo } from 'react';
import { useDomain } from '../contexts';
import { ExerciseGroup, type ExerciseSetData } from '../components/ExerciseGroup';
import { TopNav, type TimerConfig } from '../components/TopNav';
import { ExerciseInfoModal } from '../components/ExerciseInfoModal';
import { ActionFooter, type CoachTip, type PostSetQuestion } from '../components/ActionFooter';
import type { ExerciseExecutionView, MediaReference, ExerciseRuleProgress } from '../../../domain/fitness-domain-adapter';

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


interface PendingSet {
	reps: number | null;
	rpe: number | null;
	weight: number;
}

/** Exercise summary state for completion display */
export interface ExerciseSummaryState {
	exerciseName: string;
	exerciseIndex: number;
	completedSets: Array<{ reps: number; weight: number; rpe: number }>;
	nextTarget: { sets: number; reps: string; weight: string; rpe: number | null };
	adjustment: { change: string; reason: string; timing: 'next_set' | 'next_session' } | null;
	/** Progress towards triggering progression rules */
	ruleProgress: ExerciseRuleProgress | null;
	/** Information about a broken streak, if any */
	streakBroken: {
		wasBroken: boolean;
		previousStreak: number;
		ruleDescription: string;
	} | null;
}

interface SessionScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	/** Initial exercise summary state for Storybook testing */
	initialExerciseSummary?: ExerciseSummaryState | null;
	/** Initial detail input mode for Storybook testing (reps/rpe/weight questions) */
	initialDetailInputMode?: 'none' | 'reps' | 'rpe' | 'weight';
	/** Initial pending set data for Storybook testing */
	initialPendingSet?: { reps: number | null; rpe: number | null; weight: number };
}

export function SessionScreen({ onNavigate, initialExerciseSummary, initialDetailInputMode, initialPendingSet }: SessionScreenProps) {
	const { adapter, session, dispatch, saveSession, getSessionProgress, isSessionComplete } = useDomain();

	// Step flow state
	const [sessionStep, setSessionStep] = useState<SessionStep>('workout');
	const [pendingSet, setPendingSet] = useState<PendingSet>(
		initialPendingSet ?? { reps: null, rpe: null, weight: 0 }
	);

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
	const [detailInputMode, setDetailInputMode] = useState<'none' | 'reps' | 'rpe' | 'weight'>(initialDetailInputMode ?? 'none');

	// Track if we're editing an existing set (null = new set, number = set index being edited)
	const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);

	// Info modal state - tracks which exercise's info modal is open (null = closed)
	const [infoModalExerciseIndex, setInfoModalExerciseIndex] = useState<number | null>(null);

	// Exercise completion summary state
	const [exerciseSummary, setExerciseSummary] = useState<ExerciseSummaryState | null>(
		initialExerciseSummary ?? null
	);

	// Post-set feedback state (for in-exercise adjustments like next_set rules)
	const [postSetFeedback, setPostSetFeedback] = useState<{
		change: string;
		reason: string;
	} | null>(null);

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
				<TopNav title={session.workout} />

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
		// Start rest timer immediately when user clicks DONE
		dispatch({ type: 'start_rest_timer' });

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
			// Check if this completes the exercise (before dispatch, sets.length is current count)
			const isLastSet = currentExercise.sets.length + 1 >= currentExercise.targetSets;

			// Capture values for use in setTimeout (they're validated non-null above)
			const completedReps = pendingSet.reps;
			const completedWeight = pendingSet.weight;
			const completedRpe = pendingSet.rpe;
			const exerciseIndexForSummary = session.currentExerciseIndex;
			const exerciseNameForSummary = currentExercise.exercise;
			const existingSets = [...currentExercise.sets];
			const completingSetIndex = currentExercise.sets.length;

			dispatch({
				type: 'complete_set',
				exercise: currentExercise.exercise,
				reps: completedReps,
				weight: completedWeight,
				rpe: completedRpe,
				restSeconds: restElapsed
			});

			// Always show animation for completed set
			setJustCompletedSet(completingSetIndex);

			if (isLastSet) {
				// Show summary after animation completes
				setTimeout(() => {
					setJustCompletedSet(null);
					const result = adapter.evaluateExerciseCompletion(exerciseIndexForSummary);
					setExerciseSummary({
						exerciseName: exerciseNameForSummary,
						exerciseIndex: exerciseIndexForSummary,
						// Include the just-completed set
						completedSets: [...existingSets, {
							reps: completedReps,
							weight: completedWeight,
							rpe: completedRpe
						}],
						nextTarget: result.nextTarget,
						adjustment: result.adjustment,
						ruleProgress: result.ruleProgress,
						streakBroken: result.streakBroken,
					});
				}, 600);
			} else {
				// Non-last set: check for rule-triggered weight changes
				setTimeout(() => {
					setJustCompletedSet(null);

					// Get fresh execution view after state update
					const newExecutionView = adapter.getExecutionView(exerciseIndexForSummary);
					const nextSetIndex = completingSetIndex + 1;

					if (newExecutionView?.sets[nextSetIndex]) {
						const nextTargetWeightStr = newExecutionView.sets[nextSetIndex].target.weight;
						// Parse weight string (e.g., "55kg" -> 55)
						const match = nextTargetWeightStr.match(/(\d+(?:\.\d+)?)/);
						const nextTargetWeight = match?.[1] ? parseFloat(match[1]) : completedWeight;

						if (nextTargetWeight !== completedWeight) {
							// Weight changed - a rule fired!
							const diff = nextTargetWeight - completedWeight;
							const changeStr = diff > 0 ? `+${diff}kg` : `${diff}kg`;

							// Find which rule fired by checking execution view
							const firedRule = newExecutionView.ruleProgress?.rules.find(r =>
								r.timing === 'next_set' && r.currentlyMet
							);

							setPostSetFeedback({
								change: `${changeStr} next set`,
								reason: firedRule?.ruleDescription || 'weight adjusted',
							});

							// Auto-dismiss after 3 seconds
							setTimeout(() => setPostSetFeedback(null), 3000);
						}
					}
				}, 100); // Small delay to let state update
			}
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

			// Build timer config for TopNav
			const timerConfig: TimerConfig | undefined = isViewingActiveExercise
				? isRestComplete
					? { type: 'countup', seconds: setDuration, label: 'Ready' }
					: { type: 'countdown', seconds: restRemaining, totalSeconds: totalRestTarget, label: 'Rest' }
				: undefined;

			// Handle title click - add extra rest when resting, return to active when browsing
			const handleTitleClick = () => {
				if (!isViewingActiveExercise) {
					setViewedExerciseIndex(session.currentExerciseIndex);
				} else if (!isRestComplete) {
					dispatch({ type: 'add_extra_rest', seconds: 15 });
				}
			};

			return (
				<div className="fit-session-screen">
					{/* Exercise info modal */}
					{infoModalExerciseIndex !== null && (() => {
						const modalExercise = session.exercises[infoModalExerciseIndex];
						if (!modalExercise) return null;
						const modalImage = getImageUrl(modalExercise.media);
						const modalYoutube = getYouTubeMedia(modalExercise.media);
						return (
							<ExerciseInfoModal
								exerciseName={modalExercise.exercise}
								imageUrl={modalImage?.url}
								youtubeUrl={modalYoutube?.url}
								note={modalExercise.note ?? undefined}
								onClose={() => setInfoModalExerciseIndex(null)}
							/>
						);
					})()}

					<TopNav
						title={viewedExercise.exercise}
						subtitle={!isViewingActiveExercise ? 'Tap to return to active' : undefined}
						timer={timerConfig}
						onTitleClick={handleTitleClick}
					/>

					<div className="fit-content">
						{/* All workout exercises with their sets - using ExerciseGroup components */}
						<div className="fit-workout-sets-overview">
								{session.exercises.map((exercise, exerciseIndex) => {
									const isActive = exerciseIndex === session.currentExerciseIndex;
									const exerciseCompletedSets = exercise.sets.length;
									const isExerciseDone = exerciseCompletedSets >= exercise.targetSets;
									const repsDisplay = exercise.targetRepsMin === exercise.targetRepsMax
										? String(exercise.targetRepsMin)
										: `${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
									const exerciseImage = getImageUrl(exercise.media);
									const exerciseYoutube = getYouTubeMedia(exercise.media);

									// Check if exercise has any info to show
									const hasExerciseInfo = exerciseImage || exerciseYoutube || exercise.note;

									// Determine group variant: done if all sets complete, next if active, pending otherwise
									const groupVariant: 'pending' | 'next' | 'done' = isExerciseDone
										? 'done'
										: isActive
											? 'next'
											: 'pending';

									// Build sets data for ExerciseGroup
									const setsData: ExerciseSetData[] = Array.from({ length: exercise.targetSets }, (_, i) => {
										const isDone = i < exerciseCompletedSets;
										const isNext = i === exerciseCompletedSets && isActive;
										const isJustCompleted = i === justCompletedSet && isActive && isViewingActiveExercise;
										const set = exercise.sets[i];

										// For pending sets on the active exercise, use execution view for dynamic weights
										// (reflects next_set rule adjustments)
										let pendingWeight = exercise.targetWeight ?? 0;
										if (!isDone && isActive && executionView?.sets[i]) {
											const targetWeightStr = executionView.sets[i].target.weight;
											// Parse weight string (e.g., "55kg" -> 55, "bodyweight" -> 0)
											if (targetWeightStr.toLowerCase().includes('body')) {
												pendingWeight = 0;
											} else {
												const match = targetWeightStr.match(/(\d+(?:\.\d+)?)/);
												if (match?.[1]) {
													pendingWeight = parseFloat(match[1]);
												}
											}
										}

										return {
											weight: isDone && set ? set.weight : pendingWeight,
											reps: isDone && set ? set.reps : repsDisplay,
											rpe: isDone && set ? set.rpe : exercise.targetRPE ?? 7,
											variant: isDone ? 'done' : isNext ? 'next' : 'pending',
											result: isDone ? 'good' : undefined, // TODO: Calculate actual result based on performance
											onClick: isActive && isViewingActiveExercise ? () => handleSetCardTap(i) : undefined,
										};
									});

									return (
										<ExerciseGroup
											key={exerciseIndex}
											exerciseName={exercise.exercise}
											variant={groupVariant}
											sets={setsData}
											onInfoClick={hasExerciseInfo ? () => setInfoModalExerciseIndex(exerciseIndex) : undefined}
											width="100%"
										/>
									);
								})}
							</div>

					</div>

					{/* Unified ActionFooter - handles all states */}
					{isViewingActiveExercise && !exerciseSummary && (() => {
						// Build question prop based on current input mode
						const buildQuestion = (): PostSetQuestion | undefined => {
							switch (detailInputMode) {
								case 'reps':
									return {
										type: 'reps',
										min: currentExercise.targetRepsMin,
										max: currentExercise.targetRepsMax,
										onSelect: handleInlineReps,
									};
								case 'rpe':
									return {
										type: 'rpe',
										target: targetRPE,
										onSelect: handleInlineRPE,
									};
								case 'weight':
									return {
										type: 'weight',
										value: pendingSet.weight,
										pendingReps: pendingSet.reps ?? 0,
										onChange: (weight: number) => setPendingSet(p => ({ ...p, weight })),
										onConfirm: handleInlineWeightConfirm,
									};
								default:
									return undefined;
							}
						};

						const question = buildQuestion();

						// When showing a question, don't show action buttons
						if (question) {
							return (
								<ActionFooter
									layout="single"
									question={question}
								/>
							);
						}

						// Show post-set feedback if there's a recent adjustment
						if (postSetFeedback) {
							return (
								<ActionFooter
									layout="single"
									primaryAction={{
										label: 'continue',
										onClick: () => setPostSetFeedback(null),
										variant: 'success',
									}}
									coachTip={{
										change: postSetFeedback.change,
										reason: postSetFeedback.reason,
									}}
								/>
							);
						}

						// Default triple layout with Cancel/DONE/Skip
						return (
							<ActionFooter
								layout="triple"
								leftAction={{
									label: 'Cancel',
									onClick: handleCancel,
									variant: 'ghost',
								}}
								primaryAction={
									isSelectedSetNext
										? { label: 'DONE', onClick: handleDoneClick, variant: 'primary' }
										: isSelectedSetDone && selectedSet
											? { label: 'Edit Set', onClick: handleEditClick, variant: 'secondary' }
											: { label: '', onClick: () => {}, disabled: true }
								}
								rightAction={{
									label: 'Skip',
									onClick: handleSkipExercise,
									variant: 'ghost',
								}}
							/>
						);
					})()}

					{/* Exercise completion feedback with coach tip */}
					{isViewingActiveExercise && exerciseSummary && (() => {
						// Build coach tip from exercise summary
						const buildCoachTip = (): CoachTip => {
							const temporalRule = exerciseSummary.ruleProgress?.rules.find(r => r.progress);

							if (exerciseSummary.streakBroken?.wasBroken) {
								return {
									change: 'streak broken',
									reason: `${exerciseSummary.streakBroken.previousStreak} session streak for "${exerciseSummary.streakBroken.ruleDescription}" lost`,
									streakBroken: true,
									ruleProgress: temporalRule?.progress ? {
										current: 0,
										required: temporalRule.progress.required,
										unit: temporalRule.progress.unit,
									} : undefined,
								};
							}

							if (exerciseSummary.adjustment) {
								// Format timing for display
								const timingLabel = exerciseSummary.adjustment.timing === 'next_set'
									? 'next set'
									: 'next session';

								return {
									change: `${exerciseSummary.adjustment.change} ${timingLabel}`,
									reason: exerciseSummary.adjustment.reason,
									ruleProgress: temporalRule?.progress ? {
										current: temporalRule.progress.current,
										required: temporalRule.progress.required,
										unit: temporalRule.progress.unit,
									} : undefined,
								};
							}

							return {
								change: 'exercise complete',
								reason: `Next: ${exerciseSummary.nextTarget.sets}×${exerciseSummary.nextTarget.reps} @ ${exerciseSummary.nextTarget.weight}`,
								ruleProgress: temporalRule?.progress ? {
									current: temporalRule.progress.current,
									required: temporalRule.progress.required,
									unit: temporalRule.progress.unit,
								} : undefined,
							};
						};

						return (
							<ActionFooter
								layout="single"
								primaryAction={{
									label: exerciseSummary.streakBroken?.wasBroken ? 'keep going!' : 'Continue',
									onClick: () => {
										dispatch({ type: 'next_exercise' });
										setExerciseSummary(null);
									},
									variant: 'success',
								}}
								coachTip={buildCoachTip()}
							/>
						);
					})()}

					{/* Return to active footer when browsing */}
					{!isViewingActiveExercise && (
						<ActionFooter
							layout="single"
							primaryAction={{
								label: 'Return to Active Exercise',
								onClick: () => setViewedExerciseIndex(session.currentExerciseIndex),
								variant: 'success',
							}}
						/>
					)}
				</div>
			);

		case 'reps':
			return (
				<div className="fit-session-screen">
					<TopNav
						title="Reps"
						variant="actions"
						leftAction={<button className="fit-button-text" onClick={handleBack}>← Back</button>}
						rightAction={<button className="fit-button-text" onClick={handleCancel}>Cancel</button>}
					/>

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
					<TopNav
						title="RPE"
						variant="actions"
						leftAction={<button className="fit-button-text" onClick={handleBack}>← Back</button>}
						rightAction={<button className="fit-button-text" onClick={handleCancel}>Cancel</button>}
					/>

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
					<TopNav
						title="Weight"
						variant="actions"
						leftAction={<button className="fit-button-text" onClick={handleBack}>← Back</button>}
						rightAction={<button className="fit-button-text" onClick={handleCancel}>Cancel</button>}
					/>

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
