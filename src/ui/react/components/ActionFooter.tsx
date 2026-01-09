/**
 * ActionFooter Component
 *
 * Fixed footer bar for action buttons with optional coaching tip.
 * Supports multiple layouts:
 * - Triple: left/center/right actions (e.g., Cancel/DONE/Skip)
 * - Single: one primary action button
 * - With coach tip: displays a coaching message above the action
 */

import React from 'react';

/** Coach tip configuration */
export interface CoachTip {
	/** Short change indicator (e.g., "+2.5kg", "-5kg") */
	change: string;
	/** Explanation for the change */
	reason: string;
}

/** Action button configuration */
export interface ActionButton {
	/** Button label */
	label: string;
	/** Click handler */
	onClick: () => void;
	/** Button variant */
	variant?: 'primary' | 'secondary' | 'success' | 'ghost';
	/** Whether button is disabled */
	disabled?: boolean;
}

export interface ActionFooterProps {
	/** Layout mode */
	layout: 'single' | 'triple';

	/** Primary/center action (required) */
	primaryAction: ActionButton;

	/** Left action (triple layout only) */
	leftAction?: ActionButton;

	/** Right action (triple layout only) */
	rightAction?: ActionButton;

	/** Optional coaching tip displayed above actions */
	coachTip?: CoachTip;

	/** Additional CSS class for styling variants */
	className?: string;
}

export function ActionFooter({
	layout,
	primaryAction,
	leftAction,
	rightAction,
	coachTip,
	className = '',
}: ActionFooterProps) {
	const getButtonClass = (variant: ActionButton['variant'] = 'primary', isLarge = false): string => {
		const base = isLarge ? 'fit-button-large' : '';
		switch (variant) {
			case 'primary':
				return `fit-button-primary ${base}`.trim();
			case 'secondary':
				return `fit-button-secondary ${base}`.trim();
			case 'success':
				return `fit-button-success ${base}`.trim();
			case 'ghost':
				return `fit-action-secondary ${base}`.trim();
			default:
				return `fit-button-primary ${base}`.trim();
		}
	};

	// Determine if adjustment is negative (for styling)
	const isAdjustmentDown = coachTip?.change.startsWith('-');

	const footerClasses = [
		'fit-action-footer',
		layout === 'triple' ? 'fit-action-footer-triple' : '',
		coachTip ? 'fit-action-footer-summary' : '',
		isAdjustmentDown ? 'adjustment-down' : '',
		className,
	].filter(Boolean).join(' ');

	return (
		<div className={footerClasses}>
			{/* Coach speech bubble */}
			{coachTip && (
				<div className="fit-coach-bubble">
					<div className="fit-coach-avatar">🏋️</div>
					<div className="fit-coach-speech">
						<span className="fit-coach-change">{coachTip.change}</span>
						<span className="fit-coach-reason">{coachTip.reason}</span>
					</div>
				</div>
			)}

			{layout === 'triple' ? (
				<>
					{leftAction ? (
						<button
							className={getButtonClass(leftAction.variant ?? 'ghost')}
							onClick={leftAction.onClick}
							disabled={leftAction.disabled}
						>
							{leftAction.label}
						</button>
					) : (
						<div className="fit-button-placeholder" />
					)}

					<button
						className={getButtonClass(primaryAction.variant, true)}
						onClick={primaryAction.onClick}
						disabled={primaryAction.disabled}
					>
						{primaryAction.label}
					</button>

					{rightAction ? (
						<button
							className={getButtonClass(rightAction.variant ?? 'ghost')}
							onClick={rightAction.onClick}
							disabled={rightAction.disabled}
						>
							{rightAction.label}
						</button>
					) : (
						<div className="fit-button-placeholder" />
					)}
				</>
			) : (
				<button
					className={getButtonClass(primaryAction.variant ?? 'success', true)}
					onClick={primaryAction.onClick}
					disabled={primaryAction.disabled}
				>
					{primaryAction.label}
				</button>
			)}
		</div>
	);
}
