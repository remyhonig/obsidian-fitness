/**
 * RuleProgressPill Component
 *
 * Compact visual indicator for rule progress (e.g., "2/3 sessions").
 * Used to show progress towards triggering progression rules.
 */

import React from 'react';

export interface RuleProgressPillProps {
	/** Current progress count */
	current: number;

	/** Required count to trigger the rule */
	required: number;

	/** Unit of measurement */
	unit: 'sessions' | 'sets';

	/** Visual variant */
	variant: 'active' | 'complete' | 'broken';

	/** Effect that will be applied when triggered (e.g., "+2.5kg") */
	effect?: string;
}

/**
 * Render progress dots (filled for completed, empty for remaining)
 */
function ProgressDots({ current, required }: { current: number; required: number }) {
	const dots: React.ReactNode[] = [];
	const maxDots = Math.min(required, 5); // Cap at 5 dots for visual clarity
	const filledDots = Math.min(current, maxDots);

	for (let i = 0; i < maxDots; i++) {
		dots.push(
			<span
				key={i}
				className={`fit-progress-dot ${i < filledDots ? 'filled' : 'empty'}`}
			>
				●
			</span>
		);
	}

	return <span className="fit-progress-dots">{dots}</span>;
}

export function RuleProgressPill({
	current,
	required,
	unit,
	variant,
	effect,
}: RuleProgressPillProps) {
	const classNames = [
		'fit-rule-progress-pill',
		variant,
	].filter(Boolean).join(' ');

	const unitLabel = unit === 'sessions' ? 'sessions' : 'sets';
	const progressText = `${current}/${required} ${unitLabel}`;

	// Icon based on variant
	let icon = '';
	if (variant === 'complete') {
		icon = '✓';
	} else if (variant === 'broken') {
		icon = '💔';
	}

	return (
		<div className={classNames}>
			<ProgressDots current={current} required={required} />
			<span className="fit-progress-text">{progressText}</span>
			{icon && <span className="fit-progress-icon">{icon}</span>}
			{effect && variant === 'complete' && (
				<span className="fit-progress-effect">→ {effect}</span>
			)}
		</div>
	);
}
