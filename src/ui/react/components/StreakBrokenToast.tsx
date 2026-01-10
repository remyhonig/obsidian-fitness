/**
 * StreakBrokenToast Component
 *
 * Overlay notification that alerts users when a streak is broken.
 * Auto-dismisses after 4 seconds or can be dismissed by tapping.
 */

import { useEffect, useState } from 'react';

export interface StreakBrokenToastProps {
	/** The streak count before it was broken */
	previousStreak: number;

	/** Human-readable description of the rule */
	ruleDescription: string;

	/** Callback when toast is dismissed */
	onDismiss: () => void;

	/** Auto-dismiss delay in milliseconds (default: 4000) */
	autoDismissDelay?: number;
}

export function StreakBrokenToast({
	previousStreak,
	ruleDescription,
	onDismiss,
	autoDismissDelay = 4000,
}: StreakBrokenToastProps) {
	const [isExiting, setIsExiting] = useState(false);

	const handleDismiss = () => {
		setIsExiting(true);
		// Wait for exit animation to complete
		setTimeout(onDismiss, 200);
	};

	// Auto-dismiss after delay
	useEffect(() => {
		const timer = setTimeout(() => {
			handleDismiss();
		}, autoDismissDelay);

		return () => clearTimeout(timer);
	}, [autoDismissDelay]);

	const classNames = [
		'fit-streak-toast',
		isExiting ? 'exiting' : '',
	].filter(Boolean).join(' ');

	return (
		<div className={classNames} onClick={handleDismiss}>
			<div className="fit-streak-toast-header">
				<span className="fit-streak-toast-icon">💔</span>
				<h4 className="fit-streak-toast-title">streak broken</h4>
			</div>
			<p className="fit-streak-toast-message">
				{previousStreak} session streak for "{ruleDescription}" lost
			</p>
			<div className="fit-streak-toast-action">
				<button className="fit-streak-toast-button" onClick={handleDismiss}>
					keep going!
				</button>
			</div>
		</div>
	);
}
