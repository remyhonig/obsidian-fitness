/**
 * FinishScreen Component
 *
 * Displays workout completion summary after a session is finished.
 * Features the mascot celebrating with the user, workout stats,
 * active streaks, and triggered rules that will affect the next session.
 */

import { useMemo } from 'react';
import { TFile } from 'obsidian';
import { useApp, useDomain } from '../contexts';
import { TopNav } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ActionFooter } from '../components/ActionFooter';

interface FinishScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

/** Represents a streak the user is building */
interface ActiveStreak {
	exerciseName: string;
	ruleDescription: string;
	current: number;
	required: number;
	unit: 'sessions' | 'sets';
}

/** Represents a rule that triggered and will affect next session */
interface TriggeredRule {
	exerciseName: string;
	change: string;
	reason: string;
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

	// Collect active streaks and triggered rules from each exercise
	const { activeStreaks, triggeredRules } = useMemo(() => {
		const streaks: ActiveStreak[] = [];
		const rules: TriggeredRule[] = [];

		session.exercises.forEach((exercise, index) => {
			if (exercise.sets.length === 0) return;

			const result = adapter.evaluateExerciseCompletion(index);

			// Collect active streaks (rules with progress > 0)
			if (result.ruleProgress) {
				for (const rule of result.ruleProgress.rules) {
					if (rule.progress && rule.progress.current > 0) {
						streaks.push({
							exerciseName: exercise.exercise,
							ruleDescription: rule.ruleDescription || rule.effect,
							current: rule.progress.current,
							required: rule.progress.required,
							unit: rule.progress.unit,
						});
					}
				}
			}

			// Collect triggered rules that will affect next session
			if (result.adjustment && result.adjustment.timing === 'next_session') {
				rules.push({
					exerciseName: exercise.exercise,
					change: result.adjustment.change,
					reason: result.adjustment.reason,
				});
			}
		});

		return { activeStreaks: streaks, triggeredRules: rules };
	}, [session.exercises, adapter]);

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

				{/* Active streaks */}
				{activeStreaks.length > 0 && (
					<div className="fit-finish-section">
						<h3 className="fit-finish-section-title">🔥 streaks</h3>
						<div className="fit-finish-streaks">
							{activeStreaks.map((streak, index) => (
								<div key={index} className="fit-finish-streak">
									<span className="fit-finish-streak-exercise">{streak.exerciseName.toLowerCase()}</span>
									<span className="fit-finish-streak-progress">
										{streak.current}/{streak.required} {streak.unit}
									</span>
									<span className="fit-finish-streak-desc">{streak.ruleDescription}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Triggered rules for next session */}
				{triggeredRules.length > 0 && (
					<div className="fit-finish-section">
						<h3 className="fit-finish-section-title">⬆️ next session</h3>
						<div className="fit-finish-rules">
							{triggeredRules.map((rule, index) => (
								<div key={index} className="fit-finish-rule">
									<span className="fit-finish-rule-exercise">{rule.exerciseName.toLowerCase()}</span>
									<span className="fit-finish-rule-change">{rule.change}</span>
									<span className="fit-finish-rule-reason">{rule.reason}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Exercise summary */}
				<div className="fit-finish-exercises">
					{session.exercises.map((exercise, index) => {
						if (exercise.sets.length === 0) return null;
						const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
						const totalExReps = exercise.sets.reduce((s, set) => s + set.reps, 0);

						return (
							<div key={index} className="fit-finish-exercise">
								<span className="fit-finish-exercise-name">{exercise.exercise.toLowerCase()}</span>
								<span className="fit-finish-exercise-stats">
									{exercise.sets.length}×{totalExReps} reps
									{maxWeight > 0 && ` · ${maxWeight}kg`}
								</span>
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
		</div>
	);
}
