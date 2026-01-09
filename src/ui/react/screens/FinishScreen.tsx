/**
 * FinishScreen Component
 *
 * Displays workout completion summary after a session is finished.
 * Shows stats and provides navigation back to home.
 */

import React from 'react';
import { TFile } from 'obsidian';
import { useApp, useDomain } from '../contexts';
import { TopNav } from '../components/TopNav';

interface FinishScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function FinishScreen({ onNavigate }: FinishScreenProps) {
	const app = useApp();
	const { session } = useDomain();

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
			<TopNav title="Complete" />

			<div className="fit-content">
				<div className="fit-finish-content">
					<div className="fit-finish-icon">✓</div>
					<h2>Workout Complete!</h2>
					<h3>{session.workout}</h3>

					<div className="fit-finish-stats">
						<div className="fit-stat">
							<span className="fit-stat-value">{durationMinutes}</span>
							<span className="fit-stat-label">minutes</span>
						</div>
						<div className="fit-stat">
							<span className="fit-stat-value">{exercisesCompleted}</span>
							<span className="fit-stat-label">exercises</span>
						</div>
						<div className="fit-stat">
							<span className="fit-stat-value">{totalSets}</span>
							<span className="fit-stat-label">sets</span>
						</div>
						<div className="fit-stat">
							<span className="fit-stat-value">{totalReps}</span>
							<span className="fit-stat-label">reps</span>
						</div>
						{totalVolume > 0 && (
							<div className="fit-stat">
								<span className="fit-stat-value">
									{totalVolume >= 1000
										? `${(totalVolume / 1000).toFixed(1)}k`
										: totalVolume}
								</span>
								<span className="fit-stat-label">kg volume</span>
							</div>
						)}
					</div>

					{/* Exercise summary */}
					<div className="fit-finish-exercises">
						<h3>Exercises</h3>
						<div className="fit-exercise-summary-list">
							{session.exercises.map((exercise, index) => {
								if (exercise.sets.length === 0) return null;
								const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
								const totalExReps = exercise.sets.reduce((s, set) => s + set.reps, 0);

								return (
									<div key={index} className="fit-exercise-summary">
										<span className="fit-exercise-name">{exercise.exercise}</span>
										<span className="fit-exercise-stats">
											{exercise.sets.length} sets · {totalExReps} reps
											{maxWeight > 0 && ` · ${maxWeight}kg max`}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					<div className="fit-finish-actions">
						<button
							className="fit-button-primary"
							onClick={() => onNavigate('home')}
						>
							Done
						</button>
						{session.id && (
							<button
								className="fit-button-secondary"
								onClick={handleViewSession}
							>
								View Session Log
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
