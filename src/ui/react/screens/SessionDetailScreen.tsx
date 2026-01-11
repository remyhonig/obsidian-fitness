/**
 * SessionDetailScreen Component
 *
 * Displays details of a historical workout session.
 * Similar to FinishScreen but for viewing past sessions.
 */

import { useState, useEffect } from 'react';
import { TFile } from 'obsidian';
import { useApp } from '../contexts';
import { TopNav } from '../components/TopNav';
import { ActionFooter } from '../components/ActionFooter';

interface SessionExercise {
	name: string;
	sets: Array<{ reps: number; weight: number; rpe?: number }>;
}

interface SessionData {
	id: string;
	date: string;
	workout: string;
	startTime?: string;
	endTime?: string;
	exercises: SessionExercise[];
}

export interface SessionDetailScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	sessionPath?: string;
}

export function SessionDetailScreen({ onNavigate, sessionPath }: SessionDetailScreenProps) {
	const app = useApp();
	const [session, setSession] = useState<SessionData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (sessionPath) {
			loadSession(sessionPath);
		}
	}, [sessionPath]);

	const loadSession = async (path: string) => {
		setLoading(true);
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			setLoading(false);
			return;
		}

		const content = await app.vault.read(file);
		const parsed = parseSessionMarkdown(content, file.basename);
		setSession(parsed);
		setLoading(false);
	};

	if (loading) {
		return (
			<div className="fit-session-detail-screen">
				<TopNav title="loading..." onBack={() => onNavigate('history')} />
				<div className="fit-content">
					<div className="fit-loading">Loading session...</div>
				</div>
			</div>
		);
	}

	if (!session) {
		return (
			<div className="fit-session-detail-screen">
				<TopNav title="session" onBack={() => onNavigate('history')} />
				<div className="fit-content">
					<div className="fit-empty-state">Session not found.</div>
				</div>
			</div>
		);
	}

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

	// Format date
	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	};

	return (
		<div className="fit-session-detail-screen">
			<TopNav
				title={formatDate(session.date)}
				onBack={() => onNavigate('history')}
			/>

			<div className="fit-content">
				{/* Workout name */}
				<div className="fit-session-detail-workout">
					{session.workout.toLowerCase()}
				</div>

				{/* Stats grid */}
				<div className="fit-session-detail-stats">
					<div className="fit-session-detail-stat">
						<span className="fit-session-detail-stat-value">{durationMinutes}</span>
						<span className="fit-session-detail-stat-label">min</span>
					</div>
					<div className="fit-session-detail-stat">
						<span className="fit-session-detail-stat-value">{exercisesCompleted}</span>
						<span className="fit-session-detail-stat-label">exercises</span>
					</div>
					<div className="fit-session-detail-stat">
						<span className="fit-session-detail-stat-value">{totalSets}</span>
						<span className="fit-session-detail-stat-label">sets</span>
					</div>
					<div className="fit-session-detail-stat">
						<span className="fit-session-detail-stat-value">{totalReps}</span>
						<span className="fit-session-detail-stat-label">reps</span>
					</div>
					{totalVolume > 0 && (
						<div className="fit-session-detail-stat">
							<span className="fit-session-detail-stat-value">{formatVolume(totalVolume)}</span>
							<span className="fit-session-detail-stat-label">kg</span>
						</div>
					)}
				</div>

				{/* Exercise list */}
				<div className="fit-session-detail-exercises">
					{session.exercises.map((exercise, index) => {
						if (exercise.sets.length === 0) return null;
						const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
						const totalExReps = exercise.sets.reduce((s, set) => s + set.reps, 0);

						return (
							<div key={index} className="fit-session-detail-exercise">
								<span className="fit-session-detail-exercise-name">
									{exercise.name.toLowerCase()}
								</span>
								<span className="fit-session-detail-exercise-stats">
									{exercise.sets.length}×{totalExReps} reps
									{maxWeight > 0 && ` · ${maxWeight}kg`}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			<ActionFooter
				layout="single"
				primaryAction={{
					label: 'back',
					onClick: () => onNavigate('history'),
					variant: 'secondary',
				}}
			/>
		</div>
	);
}

/**
 * Parse session markdown file to extract workout data
 */
function parseSessionMarkdown(content: string, filename: string): SessionData {
	// Parse YAML frontmatter
	const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
	const yaml: Record<string, string> = {};

	if (yamlMatch?.[1]) {
		for (const line of yamlMatch[1].split('\n')) {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.substring(0, colonIndex).trim();
				let value = line.substring(colonIndex + 1).trim();
				if ((value.startsWith('"') && value.endsWith('"')) ||
					(value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1);
				}
				yaml[key] = value;
			}
		}
	}

	// Extract workout name from wikilink if present
	let workout = yaml.workout || 'Unknown Workout';
	const wikiMatch = workout.match(/\[\[.*?#(.*?)\]\]/);
	if (wikiMatch?.[1]) {
		workout = wikiMatch[1];
	}

	// Parse exercises
	const exercises: SessionExercise[] = [];
	const exerciseSections = content.split(/^## /m).slice(1);

	for (const section of exerciseSections) {
		const lines = section.trim().split('\n');
		const name = lines[0]?.trim() || 'Unknown Exercise';

		const sets: Array<{ reps: number; weight: number; rpe?: number }> = [];

		// Parse set lines (e.g., "- 10 × 80kg @ RPE 7")
		for (const line of lines.slice(1)) {
			const setMatch = line.match(/^-\s*(\d+)\s*[×x]\s*([\d.]+)\s*kg(?:\s*@\s*RPE\s*([\d.]+))?/i);
			if (setMatch && setMatch[1] && setMatch[2]) {
				sets.push({
					reps: parseInt(setMatch[1], 10),
					weight: parseFloat(setMatch[2]),
					rpe: setMatch[3] ? parseFloat(setMatch[3]) : undefined
				});
			}
		}

		if (sets.length > 0) {
			exercises.push({ name, sets });
		}
	}

	return {
		id: filename,
		date: yaml.date || filename.substring(0, 10),
		workout,
		startTime: yaml.startTime,
		endTime: yaml.endTime,
		exercises
	};
}
