/**
 * Mascot Component
 *
 * Displays the gorilla coach mascot with an optional speech bubble.
 * Duolingo-style welcome/feedback UI element.
 */

import React from 'react';
import { getMascotImage, type MascotMood } from '../../../assets/mascot-images';

export type { MascotMood };

export type BubblePosition = 'top' | 'left' | 'right';

interface MascotProps {
	/** Mood affects which illustration is shown */
	mood?: MascotMood;
	/** Whether to show just the head or full body */
	headOnly?: boolean;
	/** Optional message to display in speech bubble */
	message?: string;
	/** Position of the speech bubble */
	bubblePosition?: BubblePosition;
	/** Size of the mascot */
	size?: 'small' | 'medium' | 'large';
	/** Additional CSS class */
	className?: string;
}

export function Mascot({
	mood = 'neutral',
	headOnly = false,
	message,
	bubblePosition = 'top',
	size = 'medium',
	className = ''
}: MascotProps) {
	// Get the bundled image URL (base64 data URL)
	const imageUrl = getMascotImage(mood, headOnly);

	const containerClass = `fit-mascot-container fit-mascot-${size} fit-mascot-bubble-${bubblePosition} ${className}`;

	return (
		<div className={containerClass}>
			{message && (
				<div className={`fit-speech-bubble fit-speech-bubble-${bubblePosition}`}>
					<p>{message}</p>
					<div className="fit-speech-bubble-tail" />
				</div>
			)}
			<img
				src={imageUrl}
				alt="Gorilla Coach"
				className="fit-mascot-image"
				onError={(e) => {
					console.error('[Mascot] Failed to load image:', imageUrl);
					// Fallback to a placeholder or hide the broken image
					(e.target as HTMLImageElement).style.display = 'none';
				}}
			/>
		</div>
	);
}

/**
 * Standalone speech bubble component for cases where the mascot
 * is rendered separately or for different layouts
 */
interface SpeechBubbleProps {
	message: string;
	position?: 'above' | 'left' | 'right';
	className?: string;
}

export function SpeechBubble({
	message,
	position = 'above',
	className = ''
}: SpeechBubbleProps) {
	return (
		<div className={`fit-speech-bubble fit-speech-bubble-${position} ${className}`}>
			<p>{message}</p>
			<div className="fit-speech-bubble-tail" />
		</div>
	);
}
