/**
 * ExerciseGroup Component
 *
 * A group of sets under a single header banner.
 * Displays multiple sets of the same exercise as one connected visual unit.
 * Uses SetCard components for each set, maintaining the card-based look.
 */

import { YoutubeLogoIcon, ImageIcon } from '@phosphor-icons/react';
import { SetCard, type SetCardTimerConfig } from './SetCard';
import type { RuleBadgeProps } from './RuleBadge';

export interface ExerciseSetData {
	/** Weight in kg (0 = bodyweight) */
	weight: number;

	/** Actual reps (completed) or target range string "8-10" (pending) */
	reps: number | string;

	/** Rate of Perceived Exertion (1-10) */
	rpe: number;

	/** Visual state */
	variant: 'done' | 'next' | 'pending' | 'suggested';

	/** Result indicator for completed sets */
	result?: 'good' | 'ok' | 'bad';

	/** Click handler for this set */
	onClick?: () => void;

	/** Rule badge to show on this set (indicates a rule was triggered) */
	ruleBadge?: Omit<RuleBadgeProps, 'layoutId'> & { layoutId?: string };

	/** Override header content (bypasses weight formatting) */
	headerText?: React.ReactNode;

	/** Override details text (bypasses RPE formatting) */
	detailText?: string;

	/** Layout ID for shared element transitions */
	layoutId?: string;

	/** Show celebration effect for workouts done today */
	doneToday?: boolean;

	/** Timer configuration for countdown display */
	timer?: SetCardTimerConfig;

	/** Instruction text shown on the right side (e.g., "tap to complete", "rest") */
	instruction?: string;
}

export interface ExerciseGroupProps {
	/** Exercise name shown in the header banner */
	exerciseName: string;

	/** Array of sets to display */
	sets: ExerciseSetData[];

	/** Callback when info button is clicked (shows image modal) */
	onInfoClick?: () => void;

	/** YouTube URL - shows YouTube icon in header that opens video */
	youtubeUrl?: string;

	/** Note/coaching cue shown as quote under the header */
	note?: string;

	/** Width of the card (default: 280px) */
	width?: number | string;

	/** Visual state of the group (affects border/header color) */
	variant?: 'pending' | 'next' | 'done';
}

export function ExerciseGroup({ exerciseName, sets, onInfoClick, youtubeUrl, note, width = 280, variant = 'pending' }: ExerciseGroupProps) {
	const style = {
		width: typeof width === 'number' ? `${width}px` : width,
		maxWidth: typeof width === 'number' ? `${width}px` : width,
	};

	const classNames = [
		'fit-exercise-group',
		`fit-exercise-group-${variant}`,
	].join(' ');

	const handleYouTubeClick = () => {
		if (youtubeUrl) {
			window.open(youtubeUrl, '_blank');
		}
	};

	return (
		<div className={classNames} style={style}>
			<div className="fit-exercise-group-header">
				<span className="fit-exercise-group-header-title">{exerciseName}</span>
				<div className="fit-exercise-group-header-actions">
					{youtubeUrl && (
						<button
							className="fit-exercise-group-youtube-btn"
							onClick={handleYouTubeClick}
							aria-label="Watch on YouTube"
						>
							<YoutubeLogoIcon size={18} weight="fill" />
						</button>
					)}
					{onInfoClick && (
						<button
							className="fit-exercise-group-info-btn"
							onClick={onInfoClick}
							aria-label="View exercise image"
						>
							<ImageIcon size={18} weight="regular" />
						</button>
					)}
				</div>
			</div>
			{note && (
				<div className="fit-exercise-group-note">
					{note}
				</div>
			)}
			<div className="fit-exercise-group-body">
				{sets.map((set, index) => (
					<SetCard
						key={index}
						weight={set.weight}
						reps={set.reps}
						rpe={set.rpe}
						variant={set.variant}
						result={set.result}
						onClick={set.onClick}
						ruleBadge={set.ruleBadge}
						headerText={set.headerText}
						detailText={set.detailText}
						layoutId={set.layoutId}
						doneToday={set.doneToday}
						timer={set.timer}
						instruction={set.instruction}
					/>
				))}
			</div>
		</div>
	);
}
