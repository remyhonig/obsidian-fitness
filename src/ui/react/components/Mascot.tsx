/**
 * Mascot Component
 *
 * Displays the gorilla coach mascot with an optional speech bubble.
 * Duolingo-style welcome/feedback UI element.
 */

import React from 'react';
import { usePlugin } from '../contexts';

export type MascotMood = 'neutral' | 'celebrating' | 'thinking' | 'taking_notes' | 'posing';

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

/**
 * Maps mood and headOnly to the correct image filename
 */
function getMascotFilename(mood: MascotMood, headOnly: boolean): string {
	// PNG variants (only full body available)
	if (mood === 'taking_notes') {
		return 'gorilla_coach_taking_notes.png';
	}
	if (mood === 'posing') {
		return 'gorillal_coach_posing_with_me.png';
	}

	if (headOnly) {
		switch (mood) {
			case 'celebrating':
				return 'gorilla_coach_celebrating_head.svg';
			case 'thinking':
				return 'gorilla_coach_thinking_head_hand.svg';
			case 'neutral':
			default:
				return 'gorilla_coach_neutral_head.svg';
		}
	} else {
		switch (mood) {
			case 'celebrating':
				return 'gorilla_coach_celebrating.svg';
			case 'thinking':
				return 'gorilla_coach_thinking.svg';
			case 'neutral':
			default:
				return 'gorilla_coach_neutral.svg';
		}
	}
}

export function Mascot({
	mood = 'neutral',
	headOnly = false,
	message,
	bubblePosition = 'top',
	size = 'medium',
	className = ''
}: MascotProps) {
	const plugin = usePlugin();

	// Construct the asset path using the plugin's manifest directory
	const filename = getMascotFilename(mood, headOnly);
	const assetPath = `${plugin.manifest.dir}/src/assets/illustrations/${filename}`;

	// Get the resource URL that Obsidian can serve
	// @ts-ignore - getResourcePath exists on FileSystemAdapter
	const imageUrl = plugin.app.vault.adapter.getResourcePath(assetPath);

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
