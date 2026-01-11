/**
 * FinishScreen Component
 *
 * Displays workout completion summary after a session is finished.
 * Features the mascot celebrating with the user, workout stats,
 * and unified rule progress showing active/complete/broken streaks.
 */

import { useMemo, useState } from 'react';
import { TFile } from 'obsidian';
import { useApp, useDomain } from '../contexts';
import { TopNav } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ActionFooter } from '../components/ActionFooter';
import { RuleProgressPill } from '../components/RuleProgressPill';
import { StreakBrokenToast } from '../components/StreakBrokenToast';

export interface FinishScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

/** Unified rule progress item for display */
interface RuleProgressItem {
	exerciseName: string;
	ruleDescription: string;
	current: number;
	required: number;
	unit: 'sessions' | 'sets';
	variant: 'active' | 'complete' | 'broken';
	effect: string;
	previousStreak?: number;
}

/** Broken streak info for toast display */
interface BrokenStreakInfo {
	exerciseName: string;
	previousStreak: number;
	ruleDescription: string;
}

export function FinishScreen({ onNavigate }: FinishScreenProps) {
	const app = useApp();
	const { session, adapter } = useDomain();

	// Calculate stats
	const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
	const totalReps = session.exercises.reduce(
		(sum, e) => sum + e.sets.reduce((s, set) => s + set.reps, 0),
		0
	);
	const totalVolume = session.exercises.reduce(
		(sum, e) => sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0),
		0
	);
	const exercisesCompleted = session.exercises.filter(e => e.sets.length > 0).length;

	// Calculate duration
	let durationMinutes = 0;
	if (session.startTime && session.endTime) {
		const start = new Date(session.startTime);
		const end = new Date(session.endTime);
		durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
	}

	// Format volume for display
	const formatVolume = (vol: number): string => {
		if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
		return String(vol);
	};

	// Collect unified rule progress items and broken streaks from each exercise
	const { ruleProgressItems, brokenStreaks } = useMemo(() => {
		const items: RuleProgressItem[] = [];
		const broken: BrokenStreakInfo[] = [];

		session.exercises.forEach((exercise, index) => {
			if (exercise.sets.length === 0) return;

			const result = adapter.evaluateExerciseCompletion(index);

			// Collect from ruleProgress (all rules with progress tracking)
			if (result.ruleProgress) {
				for (const rule of result.ruleProgress.rules) {
					// Skip rules with no progress
					if (!rule.progress) continue;

					// Determine variant based on rule state
					let variant: 'active' | 'complete' | 'broken' = 'active';

					// Check if streak was broken this session
					if (rule.streakBroken?.wasBroken) {
						variant = 'broken';
						// Add to broken streaks for toast
						broken.push({
							exerciseName: exercise.exercise,
							previousStreak: rule.streakBroken.previousStreak,
							ruleDescription: rule.ruleDescription || rule.effect,
						});
					}
					// Check if rule triggered (progress reached required)
					else if (rule.progress.current >= rule.progress.required) {
						variant = 'complete';
					}

					// Only show rules with progress > 0 (or broken streaks)
					if (rule.progress.current > 0 || rule.streakBroken?.wasBroken) {
						items.push({
							exerciseName: exercise.exercise,
							ruleDescription: rule.ruleDescription || rule.effect,
							current: rule.progress.current,
							required: rule.progress.required,
							unit: rule.progress.unit,
							variant,
							effect: rule.effect,
							previousStreak: rule.streakBroken?.previousStreak,
						});
					}
				}
			}

			// Handle triggered rules (from adjustment)
			// If we have an adjustment, mark the matching ruleProgress item as complete
			// or add a new complete item if not already tracked
			if (result.adjustment && result.adjustment.timing === 'next_session') {
				// Find matching item from ruleProgress and update to complete
				const existingItem = items.find(
					item => item.exerciseName === exercise.exercise &&
					        item.effect === result.adjustment?.change
				);

				if (existingItem) {
					// Update existing item to complete variant
					existingItem.variant = 'complete';
				} else {
					// Add new complete item for rules without temporal tracking
					items.push({
						exerciseName: exercise.exercise,
						ruleDescription: result.adjustment.reason,
						current: 1,
						required: 1,
						unit: 'sessions',
						variant: 'complete',
						effect: result.adjustment.change,
					});
				}
			}
		});

		return { ruleProgressItems: items, brokenStreaks: broken };
	}, [session.exercises, adapter]);

	// State for managing broken streak toasts (show one at a time)
	const [currentToastIndex, setCurrentToastIndex] = useState(0);
	const currentBrokenStreak = brokenStreaks[currentToastIndex];

	const handleToastDismiss = () => {
		if (currentToastIndex < brokenStreaks.length - 1) {
			setCurrentToastIndex(prev => prev + 1);
		} else {
			setCurrentToastIndex(brokenStreaks.length); // Hide all toasts
		}
	};

	const handleViewSession = async () => {
		if (session.id) {
			const path = `Fitness/Sessions/${session.id}.md`;
			const file = app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				await app.workspace.getLeaf().openFile(file);
			}
		}
	};

	return (
		<div className="fit-finish-screen">
			<TopNav title="complete" />

			<div className="fit-content">
				{/* Mascot celebrating with the user - no speech bubble */}
				<div className="fit-finish-hero">
					<Mascot
						mood="posing"
						size="large"
						className="fit-finish-mascot"
					/>
				</div>

				{/* Workout name */}
				<div className="fit-finish-workout-name">
					{session.workout?.toLowerCase()}
				</div>

				{/* Stats grid */}
				<div className="fit-finish-stats">
					<div className="fit-finish-stat">
						<span className="fit-finish-stat-value">{durationMinutes}</span>
						<span className="fit-finish-stat-label">min</span>
					</div>
					<div className="fit-finish-stat">
						<span className="fit-finish-stat-value">{exercisesCompleted}</span>
						<span className="fit-finish-stat-label">exercises</span>
					</div>
					<div className="fit-finish-stat">
						<span className="fit-finish-stat-value">{totalSets}</span>
						<span className="fit-finish-stat-label">sets</span>
					</div>
					<div className="fit-finish-stat">
						<span className="fit-finish-stat-value">{totalReps}</span>
						<span className="fit-finish-stat-label">reps</span>
					</div>
					{totalVolume > 0 && (
						<div className="fit-finish-stat">
							<span className="fit-finish-stat-value">{formatVolume(totalVolume)}</span>
							<span className="fit-finish-stat-label">kg</span>
						</div>
					)}
				</div>

				{/* Exercise summary with inline rule progress */}
				<div className="fit-finish-exercises">
					{session.exercises.map((exercise, index) => {
						if (exercise.sets.length === 0) return null;
						const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
						const totalExReps = exercise.sets.reduce((s, set) => s + set.reps, 0);

						// Find rule progress for this exercise
						const exerciseProgress = ruleProgressItems.filter(
							item => item.exerciseName.toLowerCase() === exercise.exercise.toLowerCase()
						);

						return (
							<div key={index} className="fit-finish-exercise">
								<div className="fit-finish-exercise-header">
									<span className="fit-finish-exercise-name">{exercise.exercise.toLowerCase()}</span>
									<span className="fit-finish-exercise-stats">
										{exercise.sets.length}×{totalExReps} reps
										{maxWeight > 0 && ` · ${maxWeight}kg`}
									</span>
								</div>
								{exerciseProgress.length > 0 && (
									<div className="fit-finish-exercise-progress">
										{exerciseProgress.map((item, progressIndex) => (
											<RuleProgressPill
												key={progressIndex}
												current={item.current}
												required={item.required}
												unit={item.unit}
												variant={item.variant}
												effect={item.variant === 'complete' ? item.effect : undefined}
												previousStreak={item.previousStreak}
												description={item.ruleDescription}
											/>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Action buttons */}
			<ActionFooter
				layout="single"
				primaryAction={{
					label: 'done',
					onClick: () => onNavigate('home'),
					variant: 'success',
				}}
			/>

			{/* View session log link */}
			{session.id && (
				<button
					className="fit-finish-view-log"
					onClick={handleViewSession}
				>
					view session log
				</button>
			)}

			{/* Broken streak toast overlay */}
			{currentBrokenStreak && (
				<StreakBrokenToast
					previousStreak={currentBrokenStreak.previousStreak}
					ruleDescription={currentBrokenStreak.ruleDescription}
					onDismiss={handleToastDismiss}
				/>
			)}
		</div>
	);
}
