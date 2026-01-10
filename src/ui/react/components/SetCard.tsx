/**
 * SetCard Component
 *
 * A single set card showing weight, reps, and RPE with multiple visual states.
 * Used in session views to display both completed and pending sets.
 */

import React from 'react';

export interface SetCardProps {
	/** Weight in kg (0 = bodyweight) */
	weight: number;

	/** Actual reps (completed) or target range string "8-10" (pending) */
	reps: number | string;

	/** Rate of Perceived Exertion (1-10) */
	rpe: number;

	/** Visual state */
	variant: 'done' | 'next' | 'pending';

	/** Selected for detail view */
	isSelected?: boolean;

	/** Trigger completion animation */
	isAnimating?: boolean;

	/** Click handler for selection */
	onClick?: () => void;

	/** Exercise name (optional, for superset/mixed displays) */
	exerciseName?: string;

	/** Whether to show the exercise name header (default: false) */
	showExerciseName?: boolean;
}

/**
 * Format weight for display
 */
function formatWeight(weight: number): string {
	if (weight === 0) return 'BW';
	return `${weight}kg`;
}

/**
 * Star burst animation overlay for completed sets
 */
function StarBurst() {
	return (
		<div className="fit-stars">
			<span className="fit-star fit-star-1">✦</span>
			<span className="fit-star fit-star-2">★</span>
			<span className="fit-star fit-star-3">✦</span>
			<span className="fit-star fit-star-4">★</span>
			<span className="fit-star fit-star-5">✦</span>
			<span className="fit-star fit-star-6">★</span>
			<span className="fit-star fit-star-7">✦</span>
			<span className="fit-star fit-star-8">★</span>
			<span className="fit-star fit-star-9">✦</span>
			<span className="fit-star fit-star-10">★</span>
		</div>
	);
}

export function SetCard({
	weight,
	reps,
	rpe,
	variant,
	isSelected = false,
	isAnimating = false,
	onClick,
	exerciseName,
	showExerciseName = false,
}: SetCardProps) {
	const classNames = [
		'fit-set-card',
		variant === 'done' ? 'done' : '',
		variant === 'next' ? 'next' : '',
		isSelected ? 'selected' : '',
		isAnimating ? 'just-completed' : '',
		showExerciseName && exerciseName ? 'with-name' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classNames} onClick={onClick}>
			{isAnimating && <StarBurst />}

			{showExerciseName && exerciseName && (
				<div className="fit-set-card-name">{exerciseName}</div>
			)}

			<div className="fit-set-card-header">{formatWeight(weight)}</div>

			<div className="fit-set-card-content">
				<div className="fit-set-card-main">{reps}</div>
				<div className="fit-set-card-details">RPE {rpe}</div>
			</div>
		</div>
	);
}
