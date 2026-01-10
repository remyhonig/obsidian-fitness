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
	const getSuggestedWorkout = (): { name: string; subtitle?: string } | null => {
		if (!program) return null;

		// Use nextSession if available
		if (program.nextSession) {
			return {
				name: program.nextSession.workout,
				subtitle: program.nextSession.scheduledFor
					? `scheduled: ${program.nextSession.scheduledFor.toLowerCase()}`
					: undefined
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
						sets={program.schedule.weeklyPattern.map((entry) => {
							const isSuggested = suggestedWorkout && entry.workouts.includes(suggestedWorkout.name);
							const isInProgress = session.isActive && entry.workouts.includes(session.workout ?? '');
							const variant = isInProgress ? 'next' as const : isSuggested ? 'suggested' as const : 'pending' as const;
							return {
								weight: 0,
								reps: entry.workouts.join(', '),
								rpe: 0,
								variant,
								headerText: entry.day,
								detailText: 'not done yet',
								onClick: () => entry.workouts[0] && onNavigate('workout-detail', { workoutName: entry.workouts[0] }),
							};
						})}
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
							return {
								weight: 0,
								reps: entry.workout,
								rpe: 0,
								variant,
								headerText: `Day ${index + 1}`,
								detailText: 'not done yet',
								onClick: () => onNavigate('workout-detail', { workoutName: entry.workout }),
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
