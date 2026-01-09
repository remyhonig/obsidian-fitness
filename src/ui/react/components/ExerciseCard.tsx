/**
 * ExerciseCard Component
 *
 * Displays exercise information with two modes:
 * - preview: Static info for workout detail screens
 * - session: Interactive with set cards, media, and adjustments
 */

import React from 'react';
import { SetCard } from './SetCard';
import type { MediaReference } from '../../../domain/fitness-domain-adapter';

export interface CompletedSet {
	reps: number;
	weight: number;
	rpe: number;
}

export interface Adjustment {
	type: 'rule_applied' | 'auto_matched';
	reason: string;
	ruleSource?: string;
}

export interface ExerciseCardProps {
	/** Display mode */
	mode: 'preview' | 'session';

	/** Exercise name */
	name: string;

	/** Exercise description (preview mode) */
	description?: string;

	/** Target configuration */
	targetSets: number;
	targetReps: { min: number; max: number } | 'AMRAP';
	targetWeight?: number;
	targetRPE?: number;
	restSeconds?: number;

	/** Is exercise optional */
	optional?: boolean;

	/** Completed sets (session mode) */
	completedSets?: CompletedSet[];

	/** Media references */
	media?: MediaReference[];

	/** Coaching note */
	note?: string;

	/** Adjustment from progression rules (session mode) */
	adjustment?: Adjustment;

	/** Set selection (session mode) */
	selectedSetIndex?: number;
	onSetClick?: (index: number) => void;

	/** Set being animated */
	animatingSetIndex?: number;

	/** Media interaction */
	onImageClick?: () => void;
	onYouTubeClick?: () => void;
}

/**
 * Format reps for display
 */
function formatReps(reps: { min: number; max: number } | 'AMRAP'): string {
	if (reps === 'AMRAP') return 'AMRAP';
	if (reps.min === reps.max) return String(reps.min);
	return `${reps.min}-${reps.max}`;
}

/**
 * Format weight for display
 */
function formatWeight(weight: number | undefined): string {
	if (weight === undefined || weight === null) return '';
	if (weight === 0) return 'BW';
	return `${weight}kg`;
}

/**
 * Extract image from media references
 */
function getImage(media: MediaReference[]): { url: string; description: string | null } | null {
	for (const m of media) {
		if (m.type === 'image') {
			return { url: m.url, description: m.description };
		}
	}
	return null;
}

/**
 * Check if media has YouTube content
 */
function hasYouTube(media: MediaReference[]): boolean {
	return media.some(
		(m) => m.type === 'youtube-video' || m.type === 'youtube-shorts' || m.type === 'youtube-search'
	);
}

/**
 * YouTube button component
 */
function YouTubeButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			className="fit-youtube-btn"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			title="Watch exercise video"
		>
			<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
			</svg>
		</button>
	);
}

/**
 * Media row component for session mode
 */
function MediaRow({
	media,
	note,
	onImageClick,
	onYouTubeClick,
}: {
	media: MediaReference[];
	note: string | null;
	onImageClick?: () => void;
	onYouTubeClick?: () => void;
}) {
	const imageData = getImage(media);
	const showYouTube = hasYouTube(media);

	if (!imageData && !showYouTube && !note) return null;

	return (
		<div className="fit-exercise-media-row">
			{imageData ? (
				<div className="fit-exercise-preview" onClick={onImageClick}>
					<img src={imageData.url} alt={imageData.description || 'Exercise illustration'} />
					{showYouTube && onYouTubeClick && <YouTubeButton onClick={onYouTubeClick} />}
				</div>
			) : showYouTube && onYouTubeClick ? (
				<button className="fit-youtube-standalone" onClick={onYouTubeClick}>
					<span className="fit-youtube-icon">▶</span>
					<span>YouTube</span>
				</button>
			) : null}
			{note && <p className="fit-exercise-note">{note}</p>}
		</div>
	);
}

/**
 * Adjustments panel for progression rules
 */
function AdjustmentsPanel({ adjustment }: { adjustment: Adjustment }) {
	const isAutoMatched = adjustment.type === 'auto_matched';

	return (
		<div className={`fit-triggered-rules ${isAutoMatched ? 'auto-matched' : ''}`}>
			<div className="fit-rule-item">
				<span className="fit-rule-icon">{isAutoMatched ? '↔' : '⚡'}</span>
				<div className="fit-rule-content">
					<span className="fit-rule-reason">{adjustment.reason}</span>
					{adjustment.ruleSource && (
						<span className="fit-rule-source">{adjustment.ruleSource}</span>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Preview mode - static exercise info
 */
function ExerciseCardPreview({
	name,
	targetSets,
	targetReps,
	targetWeight,
	targetRPE,
	restSeconds,
	optional,
	note,
}: ExerciseCardProps) {
	return (
		<div className="fit-exercise-item">
			<div className="fit-exercise-name">
				{name}
				{optional && <span className="fit-optional-badge">Optional</span>}
			</div>
			<div className="fit-exercise-details">
				<span className="fit-exercise-sets">
					{targetSets} × {formatReps(targetReps)}
				</span>
				{targetWeight !== undefined && (
					<span className="fit-exercise-weight">@ {formatWeight(targetWeight)}</span>
				)}
				{targetRPE !== undefined && (
					<span className="fit-exercise-intensity">RPE {targetRPE}</span>
				)}
			</div>
			{restSeconds !== undefined && (
				<div className="fit-exercise-rest">Rest: {restSeconds}s</div>
			)}
			{note && <div className="fit-exercise-note">{note}</div>}
		</div>
	);
}

/**
 * Session mode - interactive with set cards
 */
function ExerciseCardSession({
	name,
	targetSets,
	targetReps,
	targetWeight,
	targetRPE,
	completedSets = [],
	media = [],
	note,
	adjustment,
	selectedSetIndex,
	onSetClick,
	animatingSetIndex,
	onImageClick,
	onYouTubeClick,
}: ExerciseCardProps) {
	const repsDisplay = formatReps(targetReps);
	const defaultRPE = targetRPE ?? 7;

	return (
		<div className="fit-exercise-card-session">
			{/* Media row */}
			<MediaRow
				media={media}
				note={note ?? null}
				onImageClick={onImageClick}
				onYouTubeClick={onYouTubeClick}
			/>

			{/* Set cards */}
			<div className="fit-set-tabs">
				{Array.from({ length: targetSets }, (_, i) => {
					const isDone = i < completedSets.length;
					const isNext = i === completedSets.length;
					const set = completedSets[i];

					return (
						<SetCard
							key={i}
							weight={isDone && set ? set.weight : targetWeight ?? 0}
							reps={isDone && set ? set.reps : repsDisplay}
							rpe={isDone && set ? set.rpe : defaultRPE}
							variant={isDone ? 'done' : isNext ? 'next' : 'pending'}
							isSelected={selectedSetIndex === i}
							isAnimating={animatingSetIndex === i}
							onClick={() => onSetClick?.(i)}
						/>
					);
				})}
			</div>

			{/* Adjustments panel */}
			{adjustment && <AdjustmentsPanel adjustment={adjustment} />}
		</div>
	);
}

export function ExerciseCard(props: ExerciseCardProps) {
	if (props.mode === 'preview') {
		return <ExerciseCardPreview {...props} />;
	}
	return <ExerciseCardSession {...props} />;
}
