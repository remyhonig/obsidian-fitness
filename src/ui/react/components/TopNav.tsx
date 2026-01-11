/**
 * TopNav Component
 *
 * Flexible top navigation header with multiple variants:
 * - Simple: Title only
 * - Back: Title with back button
 * - Arrows: Title with left/right navigation arrows
 * - Actions: Title with custom action buttons
 */

import React from 'react';

export interface TimerConfig {
	/** Timer display mode */
	type: 'countdown' | 'countup';
	/** Current seconds (remaining for countdown, elapsed for countup) */
	seconds: number;
	/** Total seconds for countdown progress bar calculation */
	totalSeconds?: number;
	/** Label shown next to timer (e.g., "Rest", "Elapsed") */
	label?: string;
}

export interface TopNavProps {
	/** Screen title displayed in center */
	title: string;

	/** Navigation variant */
	variant?: 'simple' | 'back' | 'arrows' | 'actions';

	/** Back button handler (for 'back' variant) */
	onBack?: () => void;

	/** Back button label (default: "← Back") */
	backLabel?: string;

	/** Left arrow handler (for 'arrows' variant) */
	onPrev?: () => void;

	/** Right arrow handler (for 'arrows' variant) */
	onNext?: () => void;

	/** Disable left arrow */
	prevDisabled?: boolean;

	/** Disable right arrow */
	nextDisabled?: boolean;

	/** Left action element (for 'actions' variant) */
	leftAction?: React.ReactNode;

	/** Right action element (for 'actions' variant) */
	rightAction?: React.ReactNode;

	/** Optional subtitle below title */
	subtitle?: string;

	/** Click handler for title (e.g., to reset to current date) */
	onTitleClick?: () => void;

	/** Timer configuration for countdown or countup display */
	timer?: TimerConfig;

	/** Additional CSS class */
	className?: string;
}

/** Format seconds as MM:SS or H:MM:SS */
function formatTime(seconds: number): string {
	const absSeconds = Math.abs(Math.floor(seconds));
	const hours = Math.floor(absSeconds / 3600);
	const mins = Math.floor((absSeconds % 3600) / 60);
	const secs = absSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}
	return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function TopNav({
	title,
	variant = 'simple',
	onBack,
	backLabel = '← Back',
	onPrev,
	onNext,
	prevDisabled = false,
	nextDisabled = false,
	leftAction,
	rightAction,
	subtitle,
	onTitleClick,
	timer,
	className = ''
}: TopNavProps) {
	const baseClass = 'fit-top-nav';
	const hasTitle = title.trim().length > 0;
	const classes = [
		baseClass,
		`${baseClass}--${variant}`,
		!hasTitle ? `${baseClass}--compact` : '',
		className
	].filter(Boolean).join(' ');

	const renderLeftSlot = () => {
		switch (variant) {
			case 'back':
				return (
					<button className="fit-back-button" onClick={onBack}>
						{backLabel}
					</button>
				);
			case 'arrows':
				return (
					<button
						className="fit-nav-arrow fit-nav-arrow--prev"
						onClick={onPrev}
						disabled={prevDisabled}
						aria-label="Previous"
					>
						‹
					</button>
				);
			case 'actions':
				return leftAction ?? <div className="fit-top-nav-spacer" />;
			default:
				return <div className="fit-top-nav-spacer" />;
		}
	};

	const renderRightSlot = () => {
		switch (variant) {
			case 'back':
				return <div className="fit-top-nav-spacer" />;
			case 'arrows':
				return (
					<button
						className="fit-nav-arrow fit-nav-arrow--next"
						onClick={onNext}
						disabled={nextDisabled}
						aria-label="Next"
					>
						›
					</button>
				);
			case 'actions':
				return rightAction ?? <div className="fit-top-nav-spacer" />;
			default:
				return <div className="fit-top-nav-spacer" />;
		}
	};

	const renderTimer = () => {
		if (!timer) return null;

		const { type, seconds, totalSeconds, label } = timer;
		const progress = type === 'countdown' && totalSeconds
			? Math.max(0, Math.min(1, seconds / totalSeconds))
			: null;

		return (
			<div className={`fit-top-nav-timer fit-top-nav-timer--${type}`}>
				<div className="fit-top-nav-timer-content">
					{label && <span className="fit-top-nav-timer-label">{label}</span>}
					<span className="fit-top-nav-timer-time">{formatTime(seconds)}</span>
				</div>
				{progress !== null && (
					<div className="fit-top-nav-timer-track">
						<div
							className="fit-top-nav-timer-progress"
							style={{ width: `${progress * 100}%` }}
						/>
					</div>
				)}
			</div>
		);
	};

	return (
		<header className={classes}>
			{/* Only show main row with title when there's a title or subtitle */}
			{(hasTitle || subtitle) && (
				<div className="fit-top-nav-main">
					{renderLeftSlot()}
					<div
						className={`fit-top-nav-center ${onTitleClick ? 'fit-top-nav-center--clickable' : ''}`}
						onClick={onTitleClick}
					>
						{hasTitle && <h1 className="fit-top-nav-title">{title}</h1>}
						{subtitle && <span className="fit-top-nav-subtitle">{subtitle}</span>}
					</div>
					{renderRightSlot()}
				</div>
			)}
			{renderTimer()}
		</header>
	);
}
