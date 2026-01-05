/**
 * HistoryScreen Component
 *
 * Displays past workout sessions grouped by time period.
 * Loads sessions from markdown files in the Sessions folder.
 */

import React, { useState, useEffect } from 'react';
import { TFile } from 'obsidian';
import { useApp, useDomain } from '../contexts';

interface SessionSummary {
	id: string;
	date: string;
	workout: string;
	path: string;
}

interface WorkoutPickerScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function HistoryScreen({ onNavigate }: WorkoutPickerScreenProps) {
	const app = useApp();
	const { adapter } = useDomain();
	const [sessions, setSessions] = useState<SessionSummary[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSessions();
	}, []);

	const loadSessions = async () => {
		setLoading(true);
		const sessionsPath = 'Fitness/Sessions';

		// Get all markdown files in Sessions folder
		const folder = app.vault.getAbstractFileByPath(sessionsPath);
		if (!folder) {
			setLoading(false);
			return;
		}

		const files = app.vault.getMarkdownFiles()
			.filter(f => f.path.startsWith(sessionsPath + '/'))
			.sort((a, b) => b.stat.mtime - a.stat.mtime); // Most recent first

		const sessionList: SessionSummary[] = [];

		for (const file of files) {
			const content = await app.vault.read(file);
			const metadata = parseYamlFrontmatter(content);

			sessionList.push({
				id: file.basename,
				date: metadata.date || file.basename.substring(0, 10),
				workout: extractWorkoutName(metadata.workout) || 'Unknown Workout',
				path: file.path
			});
		}

		setSessions(sessionList);
		setLoading(false);
	};

	// Group sessions by time period
	const groupedSessions = groupByTimePeriod(sessions);

	return (
		<div className="fit-history-screen">
			<header className="fit-screen-header">
				<button onClick={() => onNavigate('home')}>← Back</button>
				<h1>History</h1>
			</header>

			<div className="fit-content">
				{loading ? (
					<div className="fit-loading">Loading sessions...</div>
				) : sessions.length === 0 ? (
					<div className="fit-empty-state">
						<p>No workout history yet.</p>
						<p>Complete your first workout to see it here!</p>
					</div>
				) : (
					<div className="fit-history-sections">
						{Array.from(groupedSessions.entries()).map(([period, periodSessions]) => (
							<section key={period} className="fit-history-section">
								<h2 className="fit-section-title">{period}</h2>
								<div className="fit-session-list">
									{periodSessions.map((session) => (
										<div
											key={session.id}
											className="fit-session-card"
											onClick={() => {
												// Open the session file in Obsidian
												const file = app.vault.getAbstractFileByPath(session.path);
												if (file instanceof TFile) {
													void app.workspace.getLeaf().openFile(file);
												}
											}}
										>
											<div className="fit-session-card-date">
												{formatDate(session.date)}
											</div>
											<div className="fit-session-card-workout">
												{session.workout}
											</div>
										</div>
									))}
								</div>
							</section>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseYamlFrontmatter(content: string): Record<string, string> {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match || !match[1]) return {};

	const yaml = match[1];
	const result: Record<string, string> = {};

	for (const line of yaml.split('\n')) {
		const colonIndex = line.indexOf(':');
		if (colonIndex > 0) {
			const key = line.substring(0, colonIndex).trim();
			let value = line.substring(colonIndex + 1).trim();
			// Remove quotes if present
			if ((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			result[key] = value;
		}
	}

	return result;
}

/**
 * Extract workout name from potential wikilink format
 * e.g., "[[Programs/my-program#Push Day]]" -> "Push Day"
 */
function extractWorkoutName(workout: string | undefined): string | null {
	if (!workout) return null;

	// Check for wikilink format
	const wikiMatch = workout.match(/\[\[.*?#(.*?)\]\]/);
	if (wikiMatch && wikiMatch[1]) {
		return wikiMatch[1];
	}

	return workout;
}

/**
 * Group sessions by time period (This week, Last week, by month)
 */
function groupByTimePeriod(sessions: SessionSummary[]): Map<string, SessionSummary[]> {
	const groups = new Map<string, SessionSummary[]>();
	const today = new Date();
	const startOfWeek = getStartOfWeek(today);
	const startOfLastWeek = new Date(startOfWeek);
	startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

	for (const session of sessions) {
		// Parse date as local time
		const sessionDate = new Date(session.date + 'T00:00:00');
		let label: string;

		if (sessionDate >= startOfWeek) {
			label = 'This week';
		} else if (sessionDate >= startOfLastWeek) {
			label = 'Last week';
		} else {
			// Group by month
			label = sessionDate.toLocaleDateString(undefined, {
				month: 'long',
				year: 'numeric'
			});
		}

		if (!groups.has(label)) {
			groups.set(label, []);
		}
		groups.get(label)!.push(session);
	}

	return groups;
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	return date.toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}
