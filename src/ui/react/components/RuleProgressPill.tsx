/**
 * RuleProgressPill Component
 *
 * Compact visual indicator for rule progress using Phosphor crown icons.
 * Shows numbered crowns for completed sessions and empty crowns for remaining.
 */

import React from 'react';
import { CrownSimpleIcon as PhosphorCrown } from '@phosphor-icons/react';

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

	/** Rule description to display (e.g., "reps >= max, rpe <= 7") */
	description?: string;
}

interface StreakCrownProps {
	number?: number;
	variant: 'filled' | 'empty' | 'broken';
}

/**
 * Crown icon with optional number overlay using Phosphor Icons
 */
function StreakCrown({ number, variant }: StreakCrownProps) {
	const isFilled = variant === 'filled';
	const isBroken = variant === 'broken';

	// Colors based on variant: gold for filled, dark gray for broken, light gray for empty
	const iconColor = isFilled ? '#FFC800' : isBroken ? '#777777' : '#C4C4C4';
	const textColor = isFilled ? '#946800' : '#888888';

	return (
		<span className={`fit-crown-icon ${variant}`}>
			<PhosphorCrown
				size={32}
				weight="fill"
				color={iconColor}
			/>
			{isBroken && <span className="fit-crown-strikethrough" />}
			{number !== undefined && (
				<span className="fit-crown-number" style={{ color: textColor }}>
					{number}
				</span>
			)}
		</span>
	);
}

interface ProgressCrownsProps {
	current: number;
	required: number;
	variant: 'active' | 'complete' | 'broken';
	previousStreak?: number;
}

/**
 * Render progress indicators using Phosphor crown icons:
 * - Numbered crowns for sessions that contributed to the streak
 * - Broken crown for the session that broke the streak
 * - Empty crowns for remaining sessions
 */
function ProgressCrowns({ current, required, variant, previousStreak }: ProgressCrownsProps) {
	const indicators: React.ReactNode[] = [];
	const maxIndicators = Math.min(required, 6); // Cap at 6 for visual clarity

	for (let i = 0; i < maxIndicators; i++) {
		let crownVariant: 'filled' | 'empty' | 'broken';
		let showNumber: number | undefined;

		if (variant === 'broken') {
			// For broken streaks:
			// - Show numbered crowns for sessions that contributed (previousStreak)
			// - Show broken crown for the session that broke the streak
			// - Show empty crowns for remaining
			const successfulSessions = previousStreak ?? 0;
			if (i < successfulSessions) {
				crownVariant = 'filled';
				showNumber = i + 1;
			} else if (i === successfulSessions) {
				crownVariant = 'broken';
				showNumber = undefined;
			} else {
				crownVariant = 'empty';
				showNumber = undefined;
			}
		} else if (variant === 'complete') {
			// For complete variants (rule triggered):
			// - Show ALL crowns as filled with numbers
			crownVariant = 'filled';
			showNumber = i + 1;
		} else {
			// For active variants:
			// - Show numbered crowns for completed sessions
			// - Show empty crowns for remaining
			if (i < current) {
				crownVariant = 'filled';
				showNumber = i + 1;
			} else {
				crownVariant = 'empty';
				showNumber = undefined;
			}
		}

		indicators.push(
			<StreakCrown key={i} number={showNumber} variant={crownVariant} />
		);
	}

	return <span className="fit-progress-crowns">{indicators}</span>;
}

export function RuleProgressPill({
	current,
	required,
	variant,
	effect,
	previousStreak,
	description,
}: RuleProgressPillProps) {
	const classNames = [
		'fit-rule-progress-pill',
		variant,
	].filter(Boolean).join(' ');

	return (
		<div className={classNames}>
			<ProgressCrowns
				current={current}
				required={required}
				variant={variant}
				previousStreak={previousStreak}
			/>
			{description && (
				<span className="fit-progress-description">{description}</span>
			)}
			{effect && variant === 'complete' && (
				<span className="fit-progress-effect">→ {effect}</span>
			)}
		</div>
	);
}
