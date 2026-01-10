/**
 * ExerciseInfoModal Component
 *
 * Overlay modal showing exercise details:
 * - Exercise thumbnail/image
 * - YouTube link button
 * - Exercise notes/coaching cues
 *
 * Triggered by info button [i] next to exercise name.
 */

import React from 'react';

export interface ExerciseInfoModalProps {
	/** Exercise name for the header */
	exerciseName: string;

	/** Image URL for exercise illustration */
	imageUrl?: string;

	/** YouTube video URL */
	youtubeUrl?: string;

	/** Coaching notes/cues for the exercise */
	note?: string;

	/** Close handler */
	onClose: () => void;
}

export function ExerciseInfoModal({
	exerciseName,
	imageUrl,
	youtubeUrl,
	note,
	onClose,
}: ExerciseInfoModalProps) {
	// Handle backdrop click
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	// Handle YouTube button click
	const handleYouTubeClick = () => {
		if (youtubeUrl) {
			window.open(youtubeUrl, '_blank');
		}
	};

	return (
		<div className="fit-info-modal-backdrop" onClick={handleBackdropClick}>
			<div className="fit-info-modal">
				{/* Header with close button */}
				<div className="fit-info-modal-header">
					<h3 className="fit-info-modal-title">{exerciseName}</h3>
					<button className="fit-info-modal-close" onClick={onClose}>
						×
					</button>
				</div>

				{/* Content */}
				<div className="fit-info-modal-content">
					{/* Exercise image */}
					{imageUrl && (
						<div className="fit-info-modal-image">
							<img src={imageUrl} alt={exerciseName} />
						</div>
					)}

					{/* Coaching notes */}
					{note && (
						<div className="fit-info-modal-note">
							<div className="fit-info-modal-note-label">Coaching Tip</div>
							<p>{note}</p>
						</div>
					)}

					{/* YouTube button */}
					{youtubeUrl && (
						<button className="fit-info-modal-youtube" onClick={handleYouTubeClick}>
							<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
								<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
							</svg>
							<span>Watch on YouTube</span>
						</button>
					)}

					{/* Empty state */}
					{!imageUrl && !note && !youtubeUrl && (
						<p className="fit-info-modal-empty">No additional information available for this exercise.</p>
					)}
				</div>
			</div>
		</div>
	);
}
