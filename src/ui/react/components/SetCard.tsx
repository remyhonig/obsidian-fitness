/**
 * SetCard Component
 *
 * A single set card showing weight, reps, and RPE with multiple visual states.
 * Used in session views to display both completed and pending sets.
 */

import { motion } from 'framer-motion';
import { RuleBadge, type RuleBadgeProps } from './RuleBadge';

export interface SetCardProps {
	/** Weight in kg (0 = bodyweight) */
	weight: number;

	/** Actual reps (completed) or target range string "8-10" (pending) */
	reps: number | string;

	/** Rate of Perceived Exertion (1-10) */
	rpe: number;

	/** Visual state */
	variant: 'done' | 'next' | 'pending' | 'suggested';

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

	/** Override header content (bypasses weight formatting) */
	headerText?: React.ReactNode;

	/** Override details text (bypasses RPE formatting) */
	detailText?: string;

	/** Layout ID for shared element transitions (Framer Motion) */
	layoutId?: string;

	/** Show celebration effect for workouts done today */
	doneToday?: boolean;
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

/**
 * Celebration sparkles for workouts done today
 */
function CelebrationSparkles() {
	return (
		<div className="fit-celebration-sparkles">
			<span className="fit-sparkle fit-sparkle-1">✦</span>
			<span className="fit-sparkle fit-sparkle-2">★</span>
			<span className="fit-sparkle fit-sparkle-3">✦</span>
			<span className="fit-sparkle fit-sparkle-4">★</span>
			<span className="fit-sparkle fit-sparkle-5">✦</span>
			<span className="fit-sparkle fit-sparkle-6">★</span>
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
	headerText,
	detailText,
	layoutId,
	doneToday = false,
}: SetCardProps) {
	const classNames = [
		'fit-set-card',
		variant === 'done' ? 'done' : '',
		variant === 'next' ? 'next' : '',
		variant === 'pending' ? 'pending' : '',
		variant === 'suggested' ? 'suggested' : '',
		isSelected ? 'selected' : '',
		isAnimating ? 'just-completed' : '',
		exerciseName ? 'with-header-banner' : '',
		result ? `result-${result}` : '',
		doneToday ? 'done-today' : '',
	]
		.filter(Boolean)
		.join(' ');

	const isDone = variant === 'done';

	// Use override text or default formatting
	const displayHeader = headerText ?? formatWeight(weight);
	const displayDetails = detailText ?? `RPE ${rpe}`;

	// When exerciseName is provided, show header banner style (Duolingo-like)
	if (exerciseName) {
		return (
			<div className={classNames} onClick={onClick}>
				{doneToday && <CelebrationSparkles />}
				<div className="fit-set-card-banner">{exerciseName}</div>
				<div className="fit-set-card-body">
					{isAnimating && <StarBurst />}
					{isDone && <span className="fit-set-card-checkmark">✓</span>}
					<div className="fit-set-card-header">{displayHeader}</div>
					<div className="fit-set-card-content">
						<div className="fit-set-card-main">{reps}</div>
						{displayDetails && <div className="fit-set-card-details">{displayDetails}</div>}
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

	const isSuggested = variant === 'suggested';

	// Regular card without exercise name
	const cardContent = (
		<div className={classNames} onClick={onClick}>
			{doneToday && <CelebrationSparkles />}
			{isAnimating && <StarBurst />}
			{isDone && <span className="fit-set-card-checkmark">✓</span>}
			{isSuggested && <span className="fit-set-card-next-badge">next</span>}

			<div className="fit-set-card-header">{displayHeader}</div>

			<div className="fit-set-card-content">
				<div className="fit-set-card-main">{reps}</div>
				{displayDetails && <div className="fit-set-card-details">{displayDetails}</div>}
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

	// Wrap in motion.div for shared element transitions
	if (layoutId) {
		return (
			<motion.div
				layoutId={layoutId}
				layout="position"
				style={{ zIndex: 100, position: 'relative' }}
				transition={{
					type: 'spring' as const,
					stiffness: 300,
					damping: 30,
				}}
			>
				{cardContent}
			</motion.div>
		);
	}

	return cardContent;
}
