/**
 * RuleBadge Component
 *
 * A compact badge showing a rule result (e.g., "+2.5kg").
 * Used as the "landing spot" for the coach tip jump animation.
 * When the coach bubble animates from the footer to a set card,
 * it morphs into this compact badge.
 */

import { motion } from 'framer-motion';

export interface RuleBadgeProps {
	/** The change indicator (e.g., "+2.5kg", "-5kg", "streak broken") */
	change: string;

	/** Layout ID for shared element animation with coach bubble */
	layoutId?: string;

	/** Whether this is a negative change (shows orange instead of green) */
	isNegative?: boolean;

	/** Whether a streak was broken */
	isStreakBroken?: boolean;
}

export function RuleBadge({
	change,
	layoutId,
	isNegative = false,
	isStreakBroken = false,
}: RuleBadgeProps) {
	const classNames = [
		'fit-rule-badge',
		isStreakBroken ? 'streak-broken' : isNegative ? 'negative' : 'positive',
	].join(' ');

	const content = (
		<span className="fit-rule-badge-text">
			{isStreakBroken ? '💔' : '✓'} {change}
		</span>
	);

	// If layoutId is provided, wrap in motion.div for shared layout animation
	if (layoutId) {
		return (
			<motion.div
				className={classNames}
				layoutId={layoutId}
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				style={{ zIndex: 9999, position: 'relative' }}
				transition={{
					type: 'spring',
					stiffness: 500,
					damping: 30,
				}}
			>
				{content}
			</motion.div>
		);
	}

	return <div className={classNames}>{content}</div>;
}
