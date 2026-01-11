/**
 * HomeScreen Component
 *
 * Main landing screen showing:
 * - Active program schedule
 * - Next workout recommendation
 * - Quick actions (start workout, view history, etc.)
 *
 * Note: This screen requires a program to be loaded.
 * Use WelcomeScreen for the initial no-program state.
 */

import { useState, useEffect, useMemo } from 'react';
import { useDomain, useFullscreen } from '../contexts';
import { TopNav, type TimerConfig } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ExerciseGroup } from '../components/ExerciseGroup';
import type { Session } from '../../../types';

/**
 * Calculate the number of days between two dates (ignoring time)
 */
function daysBetween(date1: Date, date2: Date): number {
	const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
	const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
	const diffTime = Math.abs(d2.getTime() - d1.getTime());
	return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format days ago as human-readable text
 */
function formatDaysAgo(days: number): string {
	if (days === 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 14) return '1 week ago';
	const weeks = Math.floor(days / 7);
	return `${weeks} weeks ago`;
}

/**
 * Parse recovery time string (e.g., "24h", "36h", "48h") to hours
 */
function parseRecoveryHours(recovery: string | null | undefined): number {
	if (!recovery) return 24; // Default to 24 hours
	const match = recovery.match(/^(\d+)h$/i);
	if (match && match[1]) {
		return parseInt(match[1], 10);
	}
	return 24; // Default fallback
}

/**
 * Format a future date with time as recovery message
 */
function formatFutureDate(date: Date): string {
	// Round to nearest hour first
	const roundedDate = new Date(date);
	if (roundedDate.getMinutes() >= 30) {
		roundedDate.setHours(roundedDate.getHours() + 1);
	}
	roundedDate.setMinutes(0, 0, 0);
	const hour = roundedDate.getHours();

	// Calculate days difference using rounded date
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const targetDay = new Date(roundedDate.getFullYear(), roundedDate.getMonth(), roundedDate.getDate());
	const diffDays = Math.ceil((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) return `first recover until today ${hour}h`;
	if (diffDays === 1) return `first recover until tomorrow ${hour}h`;

	// Return day of week for dates within the next week
	const dayNames: string[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	if (diffDays < 7) {
		const dayName = dayNames[roundedDate.getDay()] ?? `in ${diffDays} days`;
		return `first recover until ${dayName} ${hour}h`;
	}

	return `first recover until in ${diffDays} days`;
}

interface HomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const { program, session, dispatch, getCompletedSessions } = useDomain();
	const { isFullscreen, toggleFullscreen } = useFullscreen();
	const [restElapsed, setRestElapsed] = useState(0);
	const [completedSessions, setCompletedSessions] = useState<Session[]>([]);

	// Get current exercise for rest target calculation
	const currentExercise = session.isActive
		? session.exercises[session.currentExerciseIndex]
		: null;
	const restTarget = (currentExercise?.restSeconds ?? 120) + session.extraRestTime;

	// Start a workout and go directly to session (skip workout detail screen)
	// Note: Session starts with no active exercise - user must click to select first exercise
	const handleStartWorkout = (workoutName: string) => {
		dispatch({
			type: 'start_workout',
			workoutName,
			programId: program?.program.name
		});
		onNavigate('session');
	};

	// Load completed sessions on mount
	useEffect(() => {
		getCompletedSessions().then(setCompletedSessions);
	}, [getCompletedSessions]);

	// Timer effect - calculates elapsed time from session.restStartTime
	useEffect(() => {
		if (!session.isActive || !session.restStartTime) {
			setRestElapsed(0);
			return;
		}

		const updateElapsed = () => {
			const elapsed = Math.floor((Date.now() - session.restStartTime!) / 1000);
			setRestElapsed(elapsed);
		};

		updateElapsed();
		const interval = setInterval(updateElapsed, 1000);
		return () => clearInterval(interval);
	}, [session.isActive, session.restStartTime]);

	// Build timer config for active session
	// Only show timer after first set is completed (session actually started)
	const getTimerConfig = (): TimerConfig | undefined => {
		if (!session.isActive || !session.restStartTime) return undefined;

		const isRestComplete = restElapsed >= restTarget;
		const restRemaining = Math.max(0, restTarget - restElapsed);
		const overageTime = restElapsed - restTarget;

		return isRestComplete
			? { type: 'countup', seconds: overageTime, label: 'Ready' }
			: { type: 'countdown', seconds: restRemaining, totalSeconds: restTarget, label: 'Rest' };
	};

	// Build a map of workoutRef -> last completed date
	// Uses workoutRef (raw wikilink) for exact matching
	const workoutLastDone = useMemo(() => {
		const map = new Map<string, Date>();

		// Sessions are sorted newest first, so first occurrence is most recent
		for (const s of completedSessions) {
			const key = s.workoutRef ?? s.workout ?? '';
			if (key && !map.has(key)) {
				map.set(key, new Date(s.date));
			}
		}
		return map;
	}, [completedSessions]);

	/**
	 * Get the last date a workout was done, or null if never
	 */
	const getLastDoneDate = (workoutName: string): Date | null => {
		// Generate the same wikilink format used in session frontmatter
		// Format: [[Programs/programId#Workout Name]]
		const key = program?.program.name
			? `[[Programs/${program.program.name}#${workoutName}]]`
			: workoutName;

		return workoutLastDone.get(key) ?? null;
	};

	/**
	 * Get the "X days ago" text for a workout, or "not done yet"
	 */
	const getLastDoneText = (workoutName: string): string => {
		const lastDate = getLastDoneDate(workoutName);
		if (!lastDate) return 'not done yet';
		const days = daysBetween(lastDate, new Date());
		return formatDaysAgo(days);
	};

	/**
	 * Check if a workout was done today
	 */
	const wasDoneToday = (workoutName: string): boolean => {
		const lastDate = getLastDoneDate(workoutName);
		if (!lastDate) return false;
		return daysBetween(lastDate, new Date()) === 0;
	};

	/**
	 * Get the most recently completed session
	 */
	const getMostRecentSession = () => {
		if (completedSessions.length === 0) return null;
		// Sessions are sorted newest first
		return completedSessions[0];
	};

	/**
	 * Calculate when the next workout is available based on recovery time
	 */
	const getNextAvailableDate = (): { date: Date; formatted: string } | null => {
		if (!program) return null;

		const lastSession = getMostRecentSession();
		if (!lastSession) return null;

		// Find the recovery time for the last completed workout
		const lastWorkoutName = lastSession.workout;
		const cycleEntry = program.schedule.cyclePattern.find(
			c => c.workout === lastWorkoutName
		);
		const recoveryHours = parseRecoveryHours(cycleEntry?.recovery);

		// Calculate when recovery is complete
		const lastCompletedTime = new Date(lastSession.endTime ?? lastSession.startTime);
		const nextAvailableDate = new Date(lastCompletedTime.getTime() + recoveryHours * 60 * 60 * 1000);

		return {
			date: nextAvailableDate,
			formatted: formatFutureDate(nextAvailableDate)
		};
	};

	// Determine suggested workout for highlighting
	// Returns exactly ONE workout+day combination to highlight
	// Skips workouts that were already done today
	const getSuggestedWorkout = (): { name: string; day?: string; subtitle?: string } | null => {
		if (!program) return null;

		// Helper to find the first day for a workout from weekly pattern
		const findDayForWorkout = (workoutName: string): string | undefined => {
			const weeklyEntry = program.schedule.weeklyPattern.find(
				entry => entry.workouts.includes(workoutName)
			);
			return weeklyEntry?.day;
		};

		// Use nextSession if available, but skip if done today
		if (program.nextSession && !wasDoneToday(program.nextSession.workout)) {
			const workoutName = program.nextSession.workout;
			const day = program.nextSession.scheduledFor ?? findDayForWorkout(workoutName);

			// Calculate subtitle based on recovery time
			const nextAvailable = getNextAvailableDate();
			const subtitle = nextAvailable
				? nextAvailable.formatted
				: (day ? day.toLowerCase() : undefined);

			return {
				name: workoutName,
				day,
				subtitle
			};
		}

		// Fallback: find first workout NOT done today from cycle pattern or workouts list
		const cycleWorkoutNames = program.schedule.cyclePattern.map(c => c.workout);
		const workoutsWithExercises = program.workouts.filter(w => w.exercises.length > 0);

		// Prefer cycle order, but only if workout has exercises and not done today
		const firstAvailableCycleWorkout = cycleWorkoutNames
			.map(name => workoutsWithExercises.find(w => w.name === name))
			.find(w => w !== undefined && !wasDoneToday(w.name));

		// If no cycle workout available, find any workout not done today
		const firstAvailableWorkout = firstAvailableCycleWorkout
			?? workoutsWithExercises.find(w => !wasDoneToday(w.name));

		if (firstAvailableWorkout) {
			// Calculate subtitle based on recovery time
			const nextAvailable = getNextAvailableDate();
			const subtitle = nextAvailable
				? nextAvailable.formatted
				: undefined;

			return {
				name: firstAvailableWorkout.name,
				day: findDayForWorkout(firstAvailableWorkout.name),
				subtitle
			};
		}

		return null;
	};

	// No program loaded - should use WelcomeScreen instead
	if (!program) {
		return null;
	}

	const suggestedWorkout = getSuggestedWorkout();

	// Fullscreen toggle button
	const fullscreenButton = (
		<button
			className="fit-fullscreen-toggle"
			onClick={toggleFullscreen}
			aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
		>
			{isFullscreen ? '⊖' : '⊕'}
		</button>
	);

	return (
		<div className="fit-home-screen">
			<TopNav
				title="Brorilla"
				variant="actions"
				rightAction={fullscreenButton}
				timer={getTimerConfig()}
				onTitleClick={session.isActive ? () => onNavigate('session') : undefined}
			/>

			<div className="fit-content">
				{/* Mascot Greeting */}
				<Mascot
					mood="neutral"
					message="Ready to get stronger? Let's do this!"
					bubblePosition="left"
					className="fit-home-mascot"
				/>

				{/* Schedule Overview - uses ExerciseGroup with SetCard items */}
				{program.schedule.weeklyPattern.length > 0 ? (
					<ExerciseGroup
						exerciseName={program.program.name}
						variant="next"
						width="100%"
						sets={(() => {
							// Find the index of the first entry to suggest (only ONE should be suggested)
							let suggestedIndex = -1;
							if (suggestedWorkout) {
								suggestedIndex = program.schedule.weeklyPattern.findIndex((entry) => {
									// If we have a specific day, match it exactly
									if (suggestedWorkout.day) {
										return entry.day === suggestedWorkout.day && entry.workouts.includes(suggestedWorkout.name);
									}
									// Otherwise just find the first entry with this workout
									return entry.workouts.includes(suggestedWorkout.name);
								});
							}

							return program.schedule.weeklyPattern.map((entry, index) => {
								const isSuggested = index === suggestedIndex;
								const isInProgress = session.isActive && entry.workouts.includes(session.workout ?? '');
								const workoutName = entry.workouts[0];
								const isDoneToday = workoutName ? wasDoneToday(workoutName) : false;
								const variant = isDoneToday ? 'done' as const
									: isInProgress ? 'next' as const
									: isSuggested ? 'suggested' as const
									: 'pending' as const;
								const layoutId = workoutName ? `workout-card-${workoutName}` : undefined;
								// For suggested workout, show scheduled date; otherwise show last done
								const detailText = isSuggested && suggestedWorkout?.subtitle
									? suggestedWorkout.subtitle
									: (workoutName ? getLastDoneText(workoutName) : 'not done yet');
								return {
									weight: 0,
									reps: entry.workouts.join(', '),
									rpe: 0,
									variant,
									headerText: entry.day,
									detailText,
									layoutId,
									onClick: () => workoutName && handleStartWorkout(workoutName),
									doneToday: isDoneToday,
								};
							});
						})()}
					/>
				) : program.schedule.cyclePattern.length > 0 ? (
					<ExerciseGroup
						exerciseName={program.program.name}
						variant="next"
						width="100%"
						sets={program.schedule.cyclePattern.map((entry, index) => {
							const isSuggested = suggestedWorkout && entry.workout === suggestedWorkout.name;
							const isInProgress = session.isActive && session.workout === entry.workout;
							const isDoneToday = wasDoneToday(entry.workout);
							const variant = isDoneToday ? 'done' as const
								: isInProgress ? 'next' as const
								: isSuggested ? 'suggested' as const
								: 'pending' as const;
							const layoutId = `workout-card-${entry.workout}`;
							// For suggested workout, show scheduled date; otherwise show last done
							const detailText = isSuggested && suggestedWorkout?.subtitle
								? suggestedWorkout.subtitle
								: getLastDoneText(entry.workout);
							return {
								weight: 0,
								reps: entry.workout,
								rpe: 0,
								variant,
								headerText: `Day ${index + 1}`,
								detailText,
								layoutId,
								onClick: () => handleStartWorkout(entry.workout),
								doneToday: isDoneToday,
							};
						})}
					/>
				) : (
					<ExerciseGroup
						exerciseName={program.program.name}
						variant="next"
						width="100%"
						sets={[{
							weight: 0,
							reps: 'no schedule defined',
							rpe: 0,
							variant: 'pending' as const,
							headerText: '',
							detailText: '',
						}]}
					/>
				)}
			</div>
		</div>
	);
}
