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
import { useDomain } from '../contexts';
import { TopNav, type TimerConfig } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ExerciseGroup } from '../components/ExerciseGroup';

interface HomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
	const { program, session } = useDomain();
	const [restElapsed, setRestElapsed] = useState(0);

	// Get current exercise for rest target calculation
	const currentExercise = session.isActive
		? session.exercises[session.currentExerciseIndex]
		: null;
	const restTarget = (currentExercise?.restSeconds ?? 120) + session.extraRestTime;

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
	const getTimerConfig = (): TimerConfig | undefined => {
		if (!session.isActive) return undefined;

		const isRestComplete = restElapsed >= restTarget;
		const restRemaining = Math.max(0, restTarget - restElapsed);
		const overageTime = restElapsed - restTarget;

		return isRestComplete
			? { type: 'countup', seconds: overageTime, label: 'Ready' }
			: { type: 'countdown', seconds: restRemaining, totalSeconds: restTarget, label: 'Rest' };
	};

	// Determine suggested workout for highlighting
	// Returns exactly ONE workout+day combination to highlight
	const getSuggestedWorkout = (): { name: string; day?: string; subtitle?: string } | null => {
		if (!program) return null;

		// Helper to find the first day for a workout from weekly pattern
		const findDayForWorkout = (workoutName: string): string | undefined => {
			const weeklyEntry = program.schedule.weeklyPattern.find(
				entry => entry.workouts.includes(workoutName)
			);
			return weeklyEntry?.day;
		};

		// Use nextSession if available
		if (program.nextSession) {
			const workoutName = program.nextSession.workout;
			// If scheduledFor is null, find the first day from the schedule
			const day = program.nextSession.scheduledFor ?? findDayForWorkout(workoutName);
			return {
				name: workoutName,
				day,
				subtitle: day ? `scheduled: ${day.toLowerCase()}` : undefined
			};
		}

		// Fallback: find first workout with exercises from cycle pattern or workouts list
		const cycleWorkoutNames = program.schedule.cyclePattern.map(c => c.workout);
		const workoutsWithExercises = program.workouts.filter(w => w.exercises.length > 0);

		// Prefer cycle order, but only if workout has exercises
		const firstCycleWorkout = cycleWorkoutNames
			.map(name => workoutsWithExercises.find(w => w.name === name))
			.find(w => w !== undefined);

		const suggestedWorkout = firstCycleWorkout ?? workoutsWithExercises[0];

		if (suggestedWorkout) {
			return {
				name: suggestedWorkout.name,
				day: findDayForWorkout(suggestedWorkout.name),
			};
		}

		return null;
	};

	// No program loaded - should use WelcomeScreen instead
	if (!program) {
		return null;
	}

	const suggestedWorkout = getSuggestedWorkout();

	return (
		<div className="fit-home-screen">
			<TopNav
				title="Brorilla"
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
								const variant = isInProgress ? 'next' as const : isSuggested ? 'suggested' as const : 'pending' as const;
								const workoutName = entry.workouts[0];
								const layoutId = workoutName ? `workout-card-${workoutName}` : undefined;
								return {
									weight: 0,
									reps: entry.workouts.join(', '),
									rpe: 0,
									variant,
									headerText: entry.day,
									detailText: 'not done yet',
									layoutId,
									onClick: () => workoutName && onNavigate('workout-detail', { workoutName, layoutId, cardVariant: variant }),
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
							const variant = isInProgress ? 'next' as const : isSuggested ? 'suggested' as const : 'pending' as const;
							const layoutId = `workout-card-${entry.workout}`;
							return {
								weight: 0,
								reps: entry.workout,
								rpe: 0,
								variant,
								headerText: `Day ${index + 1}`,
								detailText: 'not done yet',
								layoutId,
								onClick: () => onNavigate('workout-detail', { workoutName: entry.workout, layoutId, cardVariant: variant }),
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
