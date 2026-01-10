/**
 * SetCard Component
 *
 * A single set card showing weight, reps, and RPE with multiple visual states.
 * Used in session views to display both completed and pending sets.
 */

import { RuleBadge, type RuleBadgeProps } from './RuleBadge';

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

	/** Exercise name - when provided, shows as a colored header banner (Duolingo style) */
	exerciseName?: string;

	/** Result indicator for completed sets - shows colored background */
	result?: 'good' | 'ok' | 'bad';

	/** Rule badge to show on this set (indicates a rule was triggered) */
	ruleBadge?: Omit<RuleBadgeProps, 'layoutId'> & { layoutId?: string };
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
	result,
	ruleBadge,
}: SetCardProps) {
	const classNames = [
		'fit-set-card',
		variant === 'done' ? 'done' : '',
		variant === 'next' ? 'next' : '',
		isSelected ? 'selected' : '',
		isAnimating ? 'just-completed' : '',
		exerciseName ? 'with-header-banner' : '',
		result ? `result-${result}` : '',
	]
		.filter(Boolean)
		.join(' ');

	const isDone = variant === 'done';

	// When exerciseName is provided, show header banner style (Duolingo-like)
	if (exerciseName) {
		return (
			<div className={classNames} onClick={onClick}>
				<div className="fit-set-card-banner">{exerciseName}</div>
				<div className="fit-set-card-body">
					{isAnimating && <StarBurst />}
					{isDone && <span className="fit-set-card-checkmark">✓</span>}
					<div className="fit-set-card-header">{formatWeight(weight)}</div>
					<div className="fit-set-card-content">
						<div className="fit-set-card-main">{reps}</div>
						<div className="fit-set-card-details">RPE {rpe}</div>
					</div>
					{/* Rule badge - shows when a rule was triggered by this set */}
					{ruleBadge && (
						<div className="fit-set-card-rule-badge">
							<RuleBadge
								change={ruleBadge.change}
								layoutId={ruleBadge.layoutId}
								isNegative={ruleBadge.isNegative}
								isStreakBroken={ruleBadge.isStreakBroken}
							/>
						</div>
					)}
				</div>
			</div>
		);
	}

	// Regular card without exercise name
	return (
		<div className={classNames} onClick={onClick}>
			{isAnimating && <StarBurst />}
			{isDone && <span className="fit-set-card-checkmark">✓</span>}

			<div className="fit-set-card-header">{formatWeight(weight)}</div>

			<div className="fit-set-card-content">
				<div className="fit-set-card-main">{reps}</div>
				<div className="fit-set-card-details">RPE {rpe}</div>
			</div>

			{/* Rule badge - shows when a rule was triggered by this set */}
			{ruleBadge && (
				<div className="fit-set-card-rule-badge">
					<RuleBadge
						change={ruleBadge.change}
						layoutId={ruleBadge.layoutId}
						isNegative={ruleBadge.isNegative}
						isStreakBroken={ruleBadge.isStreakBroken}
					/>
				</div>
			)}
		</div>
	);
}
