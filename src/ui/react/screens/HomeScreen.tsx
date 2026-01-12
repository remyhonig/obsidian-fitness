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

import { useState, useEffect } from 'react';
import { useDomain, useFullscreen } from '../contexts';
import { TopNav, type TimerConfig } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ExerciseGroup } from '../components/ExerciseGroup';
import type { ScheduleStatus } from '../../../domain/fitness-domain-adapter';

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
 * Format recovery remaining time for display
 */
function formatRecoveryRemaining(recoveryRemaining: string | null): string {
	if (!recoveryRemaining) return '';
	// Parse format like "12h 30m" or "24h"
	const hours = recoveryRemaining.match(/(\d+)h/)?.[1];
	if (hours) {
		const h = parseInt(hours, 10);
		if (h < 24) return `recover for ${recoveryRemaining}`;
		return `recover for ~${Math.round(h / 24)} day${h >= 48 ? 's' : ''}`;
	}
	return `recover for ${recoveryRemaining}`;
}

interface HomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const { program, session, dispatch, getScheduleStatus } = useDomain();
	const { isFullscreen, toggleFullscreen } = useFullscreen();
	const [restElapsed, setRestElapsed] = useState(0);
	const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);

	// Get current exercise for rest target calculation
	const currentExercise = session.isActive
		? session.exercises[session.currentExerciseIndex]
		: null;
	const restTarget = (currentExercise?.restSeconds ?? 120) + session.extraRestTime;

	// Start a workout and go directly to session (skip workout detail screen)
	// Auto-selects the first exercise so user is ready to start immediately
	const handleStartWorkout = (workoutName: string) => {
		dispatch({
			type: 'start_workout',
			workoutName,
			programId: program?.program.name,
			startExerciseIndex: 0
		});
		onNavigate('session');
	};

	// Load schedule status on mount
	useEffect(() => {
		getScheduleStatus()
			.then(setScheduleStatus)
			.catch(error => {
				console.error('[HomeScreen] Failed to load schedule status:', error);
				// Schedule status will remain null, fallback UI will be shown
			});
	}, [getScheduleStatus]);

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
	// Hide when rest is complete (timer will slide away)
	const getTimerConfig = (): TimerConfig | undefined => {
		if (!session.isActive || !session.restStartTime) return undefined;

		const isRestComplete = restElapsed >= restTarget;
		if (isRestComplete) return undefined;

		const restRemaining = Math.max(0, restTarget - restElapsed);
		return { type: 'countdown', seconds: restRemaining, totalSeconds: restTarget, label: 'Rest' };
	};

	/**
	 * Get the "X days ago" text for a workout based on schedule status
	 */
	const getLastDoneText = (workoutName: string): string => {
		if (!scheduleStatus) return 'not done yet';
		const cycleWorkout = scheduleStatus.cycle.find(c => c.workout === workoutName);
		if (!cycleWorkout?.history.lastSessionDate) return 'not done yet';
		const lastDate = new Date(cycleWorkout.history.lastSessionDate);
		const days = daysBetween(lastDate, new Date());
		return formatDaysAgo(days);
	};

	/**
	 * Check if a workout was done today based on schedule status
	 */
	const wasDoneToday = (workoutName: string): boolean => {
		if (!scheduleStatus) return false;
		const cycleWorkout = scheduleStatus.cycle.find(c => c.workout === workoutName);
		if (!cycleWorkout?.history.lastSessionDate) return false;
		const lastDate = new Date(cycleWorkout.history.lastSessionDate);
		return daysBetween(lastDate, new Date()) === 0;
	};

	/**
	 * Get detail text for a workout (recovery info or last done)
	 */
	const getDetailText = (workoutName: string, isSuggested: boolean): string => {
		if (!scheduleStatus) return 'not done yet';
		const cycleWorkout = scheduleStatus.cycle.find(c => c.workout === workoutName);
		if (!cycleWorkout) return 'not done yet';

		// For suggested workout, show recovery info if not available now
		if (isSuggested && !cycleWorkout.isAvailableNow && cycleWorkout.recoveryRemaining) {
			return formatRecoveryRemaining(cycleWorkout.recoveryRemaining);
		}

		// Otherwise show last done text
		return getLastDoneText(workoutName);
	};

	// No program loaded - should use WelcomeScreen instead
	if (!program) {
		return null;
	}

	// Get suggested workout index from schedule status
	const suggestedIndex = scheduleStatus?.suggestedNextIndex ?? null;
	const suggestedWorkoutName = suggestedIndex !== null
		? scheduleStatus?.cycle[suggestedIndex]?.workout ?? null
		: null;

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

				{/* Schedule Overview - uses schedule status from DSL, with fallback to program data */}
				{scheduleStatus && scheduleStatus.cycle.length > 0 ? (
					<ExerciseGroup
						exerciseName={scheduleStatus.programName}
						variant="next"
						width="100%"
						sets={scheduleStatus.cycle.map((cycleEntry, index) => {
							const isSuggested = index === suggestedIndex;
							const isInProgress = session.isActive && session.workout === cycleEntry.workout;
							const isDoneToday = wasDoneToday(cycleEntry.workout);
							const variant = isDoneToday ? 'done' as const
								: isInProgress ? 'next' as const
								: isSuggested ? 'suggested' as const
								: 'pending' as const;
							const layoutId = `workout-card-${cycleEntry.workout}`;
							const detailText = getDetailText(cycleEntry.workout, isSuggested);
							return {
								weight: 0,
								reps: cycleEntry.workout,
								rpe: 0,
								variant,
								headerText: `Day ${cycleEntry.cyclePosition}`,
								detailText,
								layoutId,
								onClick: () => handleStartWorkout(cycleEntry.workout),
								doneToday: isDoneToday,
							};
						})}
					/>
				) : program.schedule.cyclePattern.length > 0 ? (
					// Fallback to program's cycle pattern when DSL schedule status isn't available
					<ExerciseGroup
						exerciseName={program.program.name}
						variant="next"
						width="100%"
						sets={program.schedule.cyclePattern.map((entry, index) => {
							const isInProgress = session.isActive && session.workout === entry.workout;
							// Without schedule status, suggest first workout
							const isSuggested = index === 0;
							const variant = isInProgress ? 'next' as const
								: isSuggested ? 'suggested' as const
								: 'pending' as const;
							const layoutId = `workout-card-${entry.workout}`;
							return {
								weight: 0,
								reps: entry.workout,
								rpe: 0,
								variant,
								headerText: `Day ${index + 1}`,
								detailText: 'loading...',
								layoutId,
								onClick: () => handleStartWorkout(entry.workout),
								doneToday: false,
							};
						})}
					/>
				) : program.schedule.weeklyPattern.length > 0 ? (
					// Fallback to weekly pattern if no cycle pattern
					<ExerciseGroup
						exerciseName={program.program.name}
						variant="next"
						width="100%"
						sets={program.schedule.weeklyPattern.map((entry) => {
							const workoutName = entry.workouts[0];
							const isSuggested = workoutName === suggestedWorkoutName;
							const isInProgress = session.isActive && entry.workouts.includes(session.workout ?? '');
							const isDoneToday = workoutName ? wasDoneToday(workoutName) : false;
							const variant = isDoneToday ? 'done' as const
								: isInProgress ? 'next' as const
								: isSuggested ? 'suggested' as const
								: 'pending' as const;
							const layoutId = workoutName ? `workout-card-${workoutName}` : undefined;
							const detailText = workoutName ? getDetailText(workoutName, isSuggested) : 'not done yet';
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
