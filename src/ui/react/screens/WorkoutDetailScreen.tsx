/**
 * WorkoutDetailScreen Component
 *
 * Shows a preview of a workout before starting it.
 * Uses ExerciseGroup components in summary mode to display exercises.
 *
 * Animation: The clicked card expands to fill the screen, then fades away
 * to reveal the exercises - showing the user that these exercises "came from" that card.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDomain } from '../contexts';
import { TopNav } from '../components/TopNav';
import { ExerciseGroup } from '../components/ExerciseGroup';

interface WorkoutDetailScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	workoutName: string;
	layoutId?: string;
	/** Card variant for the expanding backdrop color */
	cardVariant?: 'done' | 'next' | 'pending' | 'suggested';
	onBack?: () => void;
}

/** Get background color based on card variant */
function getVariantColor(variant: string | undefined): string {
	switch (variant) {
		case 'done': return '#4a4a4a';
		case 'next': return '#1CB0F6';
		case 'suggested': return '#B8E5FB';
		default: return '#e5e5e5';
	}
}

export function WorkoutDetailScreen({ onNavigate, workoutName, layoutId, cardVariant, onBack }: WorkoutDetailScreenProps) {
	const { program, dispatch } = useDomain();
	const workout = program?.workouts.find(w => w.name === workoutName);
	const [backdropVisible, setBackdropVisible] = useState(!!layoutId);

	const handleExerciseClick = (exerciseIndex: number) => {
		dispatch({
			type: 'start_workout',
			workoutName,
			programId: program?.program.name,
			startExerciseIndex: exerciseIndex
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

			<div className="fit-content" style={{ position: 'relative' }}>
				{/* Expanding backdrop - morphs from clicked card to fill content area, then fades */}
				<AnimatePresence>
					{layoutId && backdropVisible && (
						<motion.div
							className="fit-expanding-backdrop"
							layoutId={layoutId}
							initial={{ borderRadius: 14 }}
							animate={{
								borderRadius: 0,
								opacity: 1,
							}}
							exit={{ opacity: 0 }}
							transition={{
								type: 'spring',
								stiffness: 300,
								damping: 30,
							}}
							onAnimationComplete={() => {
								// Fade out after expansion completes
								setTimeout(() => setBackdropVisible(false), 100);
							}}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								backgroundColor: getVariantColor(cardVariant),
								zIndex: 50,
							}}
						/>
					)}
				</AnimatePresence>

				{/* Exercise List - starts appearing immediately, overlapping with backdrop expansion */}
				<motion.div
					className="fit-workout-exercises"
					initial="hidden"
					animate="visible"
					variants={{
						hidden: {},
						visible: {
							transition: {
								delayChildren: 0,
								staggerChildren: 0.04,
							},
						},
					}}
				>
					{workout.exercises.map((exercise, index) => {
						const repsDisplay = formatReps(exercise.reps);
						const targetRpe = exercise.intensity?.type === 'RPE' ? exercise.intensity.value : 7;
						// First exercise is suggested (light blue), others are pending
						const isFirst = index === 0;
						const groupVariant = isFirst ? 'next' : 'pending';
						const setVariant = isFirst ? 'suggested' : 'pending';

						return (
							<motion.div
								key={index}
								variants={{
									hidden: {
										opacity: 0,
										y: 20,
										scale: 0.95,
									},
									visible: {
										opacity: 1,
										y: 0,
										scale: 1,
										transition: {
											type: 'spring' as const,
											stiffness: 400,
											damping: 25,
										},
									},
								}}
								onClick={() => handleExerciseClick(index)}
								style={{ cursor: 'pointer' }}
							>
								<ExerciseGroup
									exerciseName={exercise.name + (exercise.optional ? ' (optional)' : '')}
									variant={groupVariant}
									width="100%"
									sets={[{
										weight: parseWeight(exercise.weight),
										reps: `${exercise.sets}×${repsDisplay}`,
										rpe: targetRpe,
										variant: setVariant,
									}]}
								/>
							</motion.div>
						);
					})}
				</motion.div>
			</div>
		</div>
	);
}
