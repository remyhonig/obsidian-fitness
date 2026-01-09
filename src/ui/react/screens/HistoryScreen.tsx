/**
 * HistoryScreen Component
 *
 * Displays past workout sessions with a calendar view.
 * Shows monthly stats, calendar with workout indicators,
 * and scrollable session cards below.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TFile } from 'obsidian';
import { useApp } from '../contexts';

interface SessionSummary {
	id: string;
	date: string;
	workout: string;
	path: string;
	exerciseCount?: number;
	duration?: number; // in seconds
}

interface HistoryScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	isTab?: boolean;
}

export function HistoryScreen({ onNavigate, isTab = false }: HistoryScreenProps) {
	const app = useApp();
	const [sessions, setSessions] = useState<SessionSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentMonth, setCurrentMonth] = useState(() => {
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() };
	});
	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	useEffect(() => {
		loadSessions();
	}, []);

	const loadSessions = async () => {
		setLoading(true);
		const sessionsPath = 'Fitness/Sessions';

		const folder = app.vault.getAbstractFileByPath(sessionsPath);
		if (!folder) {
			setLoading(false);
			return;
		}

		const files = app.vault.getMarkdownFiles()
			.filter(f => f.path.startsWith(sessionsPath + '/'))
			.sort((a, b) => b.stat.mtime - a.stat.mtime);

		const sessionList: SessionSummary[] = [];

		for (const file of files) {
			const content = await app.vault.read(file);
			const metadata = parseYamlFrontmatter(content);
			const stats = parseSessionStats(content);

			sessionList.push({
				id: file.basename,
				date: metadata.date || file.basename.substring(0, 10),
				workout: extractWorkoutName(metadata.workout) || 'Unknown Workout',
				path: file.path,
				exerciseCount: stats.exerciseCount,
				duration: stats.duration
			});
		}

		setSessions(sessionList);
		setLoading(false);
	};

	// Create a map of dates with workouts
	const workoutDates = useMemo(() => {
		const dates = new Map<string, SessionSummary[]>();
		for (const session of sessions) {
			const dateKey = session.date;
			if (!dates.has(dateKey)) {
				dates.set(dateKey, []);
			}
			dates.get(dateKey)!.push(session);
		}
		return dates;
	}, [sessions]);

	// Get sessions for current month, filtered by selected date if any
	const filteredSessions = useMemo(() => {
		// If a specific date is selected, only show sessions from that date
		if (selectedDate) {
			return sessions.filter(s => s.date === selectedDate)
				.sort((a, b) => b.date.localeCompare(a.date));
		}

		// Otherwise show all sessions from the current month
		const monthStart = new Date(currentMonth.year, currentMonth.month, 1);
		const monthEnd = new Date(currentMonth.year, currentMonth.month + 1, 0);

		return sessions.filter(s => {
			const date = new Date(s.date + 'T00:00:00');
			return date >= monthStart && date <= monthEnd;
		}).sort((a, b) => b.date.localeCompare(a.date));
	}, [sessions, currentMonth, selectedDate]);

	// Generate calendar days
	const calendarDays = useMemo(() => {
		const year = currentMonth.year;
		const month = currentMonth.month;

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Get day of week for first day (0 = Sunday)
		let startDayOfWeek = firstDay.getDay();
		// Convert to Monday start (0 = Monday)
		startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

		const days: Array<{ day: number | null; date: string | null; hasWorkout: boolean }> = [];

		// Add empty cells for days before the first
		for (let i = 0; i < startDayOfWeek; i++) {
			days.push({ day: null, date: null, hasWorkout: false });
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			days.push({
				day,
				date: dateStr,
				hasWorkout: workoutDates.has(dateStr)
			});
		}

		return days;
	}, [currentMonth, workoutDates]);

	// Navigate months
	const goToPrevMonth = () => {
		setSelectedDate(null); // Clear filter when changing month
		setCurrentMonth(prev => {
			if (prev.month === 0) {
				return { year: prev.year - 1, month: 11 };
			}
			return { year: prev.year, month: prev.month - 1 };
		});
	};

	const goToNextMonth = () => {
		setSelectedDate(null); // Clear filter when changing month
		setCurrentMonth(prev => {
			if (prev.month === 11) {
				return { year: prev.year + 1, month: 0 };
			}
			return { year: prev.year, month: prev.month + 1 };
		});
	};

	// Handle day click - filter sessions by date (toggle)
	const handleDayClick = (dateStr: string | null) => {
		if (!dateStr) return;
		// Toggle: if already selected, clear filter; otherwise set filter
		setSelectedDate(prev => prev === dateStr ? null : dateStr);
	};

	// Format duration
	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m ${secs}s`;
	};

	// Get month name
	const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString(undefined, {
		month: 'long',
		year: 'numeric'
	});

	// Check if viewing current month
	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
	const isCurrentMonth = currentMonth.year === today.getFullYear() && currentMonth.month === today.getMonth();

	// Go to current month
	const goToCurrentMonth = () => {
		setCurrentMonth({ year: today.getFullYear(), month: today.getMonth() });
	};

	return (
		<div className="fit-history-screen">
			<header className="fit-screen-header">
				<button className="fit-header-nav" onClick={goToPrevMonth}>‹</button>
				<div className="fit-header-title" onClick={!isCurrentMonth ? goToCurrentMonth : undefined}>
					<h1>{monthName}</h1>
					{!isCurrentMonth && (
						<span className="fit-return-hint">Tap to return to current month</span>
					)}
				</div>
				<button className="fit-header-nav" onClick={goToNextMonth}>›</button>
			</header>

			<div className="fit-content">
				{loading ? (
					<div className="fit-loading">Loading sessions...</div>
				) : (
					<>
						{/* Calendar */}
						<div className="fit-calendar">
							<div className="fit-calendar-weekdays">
								{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
									<div key={day} className="fit-calendar-weekday">{day}</div>
								))}
							</div>

							<div className="fit-calendar-grid">
								{calendarDays.map((dayInfo, index) => (
									<div
										key={index}
										className={`fit-calendar-day ${dayInfo.day === null ? 'empty' : ''} ${dayInfo.hasWorkout ? 'has-workout' : ''} ${dayInfo.date === todayStr ? 'today' : ''} ${dayInfo.date === selectedDate ? 'selected' : ''}`}
										onClick={() => dayInfo.hasWorkout && handleDayClick(dayInfo.date)}
									>
										{dayInfo.day !== null && (
											<>
												<span className="fit-day-number">{dayInfo.day}</span>
												{dayInfo.hasWorkout && <span className="fit-day-dot" />}
											</>
										)}
									</div>
								))}
							</div>
						</div>

						{/* Session Cards */}
						{sessions.length === 0 ? (
							<div className="fit-empty-state">
								<p>No workout history yet.</p>
								<p>Complete your first workout to see it here!</p>
							</div>
						) : filteredSessions.length === 0 ? (
							<div className="fit-empty-state">
								<p>{selectedDate ? 'No workouts on this day.' : 'No workouts this month.'}</p>
							</div>
						) : (
							<div className="fit-session-list">
								{filteredSessions.map((session) => (
									<div
										key={session.id}
										className="fit-session-card fit-session-card-detailed"
										onClick={() => {
											const file = app.vault.getAbstractFileByPath(session.path);
											if (file instanceof TFile) {
												void app.workspace.getLeaf().openFile(file);
											}
										}}
									>
										<div className="fit-session-card-header">
											<span className="fit-session-card-workout">{session.workout}</span>
											<span className="fit-session-card-date">{formatDateShort(session.date)}</span>
										</div>
										<div className="fit-session-card-meta">
											{session.exerciseCount !== undefined && (
												<span>{session.exerciseCount} exercises</span>
											)}
											{session.duration !== undefined && session.duration > 0 && (
												<span>{formatDuration(session.duration)}</span>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</>
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
 * Parse session stats from markdown content
 */
function parseSessionStats(content: string): { exerciseCount: number; duration: number } {
	// Count exercise headings (## Exercise Name)
	const exerciseMatches = content.match(/^## [^#\n]+$/gm);
	const exerciseCount = exerciseMatches?.length ?? 0;

	// Try to parse duration from metadata or content
	let duration = 0;
	const durationMatch = content.match(/duration:\s*(\d+)/i);
	if (durationMatch?.[1]) {
		duration = parseInt(durationMatch[1], 10);
	}

	return { exerciseCount, duration };
}

/**
 * Extract workout name from potential wikilink format
 */
function extractWorkoutName(workout: string | undefined): string | null {
	if (!workout) return null;

	const wikiMatch = workout.match(/\[\[.*?#(.*?)\]\]/);
	if (wikiMatch && wikiMatch[1]) {
		return wikiMatch[1];
	}

	return workout;
}

/**
 * Format date for short display (M/D/YYYY)
 */
function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	return date.toLocaleDateString(undefined, {
		month: 'numeric',
		day: 'numeric',
		year: 'numeric'
	});
}
