/**
 * WorkoutDetailScreen Component
 *
 * Shows a preview of a workout before starting it.
 * Uses ExerciseGroup components in summary mode to display exercises.
 */

import { useDomain } from '../contexts';
import { TopNav } from '../components/TopNav';
import { ExerciseGroup } from '../components/ExerciseGroup';
import { ActionFooter } from '../components/ActionFooter';

interface WorkoutDetailScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	workoutName: string;
	onBack?: () => void;
}

export function WorkoutDetailScreen({ onNavigate, workoutName, onBack }: WorkoutDetailScreenProps) {
	const { program, dispatch } = useDomain();
	const workout = program?.workouts.find(w => w.name === workoutName);

	const handleStartWorkout = () => {
		dispatch({
			type: 'start_workout',
			workoutName,
			programId: program?.program.name
		});
		onNavigate('session');
	};

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			onNavigate('home');
		}
	};

	const formatReps = (reps: { min: number; max: number } | 'AMRAP'): string => {
		if (reps === 'AMRAP') return 'AMRAP';
		if (reps.min === reps.max) return String(reps.min);
		return `${reps.min}-${reps.max}`;
	};

	if (!workout) {
		return (
			<div className="fit-workout-detail-screen">
				<TopNav title="workout" variant="back" onBack={handleBack} />
				<div className="fit-content">
					<div className="fit-empty-state">
						<p>workout "{workoutName}" not found</p>
						<button
							className="fit-button-secondary"
							onClick={handleBack}
						>
							go back
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Parse weight string to number (e.g., "80kg" -> 80, "bodyweight" -> 0)
	const parseWeight = (weight: string | null | undefined): number => {
		if (!weight || weight.toLowerCase().includes('body')) return 0;
		const match = weight.match(/(\d+(?:\.\d+)?)/);
		return match?.[1] ? parseFloat(match[1]) : 0;
	};

	return (
		<div className="fit-workout-detail-screen">
			<TopNav title={workout.name.toLowerCase()} variant="back" onBack={handleBack} />

			<div className="fit-content">
				{/* Exercise List using ExerciseGroup with single set showing target */}
				<div className="fit-workout-exercises">
					{workout.exercises.map((exercise, index) => {
						const repsDisplay = formatReps(exercise.reps);
						const targetRpe = exercise.intensity?.type === 'RPE' ? exercise.intensity.value : 7;

						return (
							<ExerciseGroup
								key={index}
								exerciseName={exercise.name + (exercise.optional ? ' (optional)' : '')}
								variant="pending"
								width="100%"
								sets={[{
									weight: parseWeight(exercise.weight),
									reps: `${exercise.sets}×${repsDisplay}`,
									rpe: targetRpe,
									variant: 'pending',
								}]}
							/>
						);
					})}
				</div>
			</div>

			{/* Start Button */}
			<ActionFooter
				layout="single"
				primaryAction={{
					label: 'start workout',
					onClick: handleStartWorkout,
					variant: 'success',
				}}
			/>
		</div>
	);
}
