/**
 * ExerciseInfoModal Component
 *
 * Overlay modal showing exercise illustration image.
 * Note and YouTube link are now shown directly in the ExerciseGroup header.
 *
 * Triggered by info button [i] next to exercise name.
 */

import React from 'react';

export interface ExerciseInfoModalProps {
	/** Exercise name for the header */
	exerciseName: string;

	/** Image URL for exercise illustration */
	imageUrl?: string;

	/** Close handler */
	onClose: () => void;
}

export function ExerciseInfoModal({
	exerciseName,
	imageUrl,
	onClose,
}: ExerciseInfoModalProps) {
	// Handle backdrop click
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
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

				{/* Content - just the image */}
				<div className="fit-info-modal-content">
					{imageUrl && (
						<div className="fit-info-modal-image">
							<img src={imageUrl} alt={exerciseName} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
