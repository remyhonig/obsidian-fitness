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

	/** Previous streak count before it was broken (only for broken variant) */
	previousStreak?: number;
}

interface ProgressDotsProps {
	current: number;
	required: number;
	variant: 'active' | 'complete' | 'broken';
	previousStreak?: number;
}

/**
 * Render progress indicators:
 * - Checkmarks (✓) for sessions that contributed to the streak
 * - Cross (✗) for the session that broke the streak (broken variant only)
 * - Empty dots (○) for remaining sessions
 */
function ProgressDots({ current, required, variant, previousStreak }: ProgressDotsProps) {
	const indicators: React.ReactNode[] = [];
	const maxIndicators = Math.min(required, 5); // Cap at 5 for visual clarity

	for (let i = 0; i < maxIndicators; i++) {
		let symbol: string;
		let className: string;

		if (variant === 'broken') {
			// For broken streaks:
			// - Show checkmarks for sessions that contributed (previousStreak)
			// - Show cross for the broken session (the one after previousStreak)
			// - Show empty dots for remaining
			const successfulSessions = previousStreak ?? 0;
			if (i < successfulSessions) {
				symbol = '✓';
				className = 'fit-progress-dot success';
			} else if (i === successfulSessions) {
				symbol = '✗';
				className = 'fit-progress-dot broken';
			} else {
				symbol = '○';
				className = 'fit-progress-dot empty';
			}
		} else if (variant === 'complete') {
			// For complete variants (rule triggered):
			// - Show ALL dots as checkmarks since the rule was satisfied
			symbol = '✓';
			className = 'fit-progress-dot success';
		} else {
			// For active variants:
			// - Show checkmarks for completed sessions
			// - Show empty dots for remaining
			if (i < current) {
				symbol = '✓';
				className = 'fit-progress-dot success';
			} else {
				symbol = '○';
				className = 'fit-progress-dot empty';
			}
		}

		indicators.push(
			<span key={i} className={className}>
				{symbol}
			</span>
		);
	}

	return <span className="fit-progress-dots">{indicators}</span>;
}

export function RuleProgressPill({
	current,
	required,
	unit,
	variant,
	effect,
	previousStreak,
}: RuleProgressPillProps) {
	const classNames = [
		'fit-rule-progress-pill',
		variant,
	].filter(Boolean).join(' ');

	const unitLabel = unit === 'sessions' ? 'sessions' : 'sets';
	const progressText = `${current}/${required} ${unitLabel}`;

	// Icon based on variant (removed from here - now shown in dots)
	let icon = '';
	if (variant === 'complete') {
		icon = '✓';
	}

	return (
		<div className={classNames}>
			<ProgressDots
				current={current}
				required={required}
				variant={variant}
				previousStreak={previousStreak}
			/>
			<span className="fit-progress-text">{progressText}</span>
			{icon && <span className="fit-progress-icon">{icon}</span>}
			{effect && variant === 'complete' && (
				<span className="fit-progress-effect">→ {effect}</span>
			)}
		</div>
	);
}
