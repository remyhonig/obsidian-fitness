/**
 * SetStack Component
 *
 * Vertical stack of set cards with auto-scroll to keep current set centered.
 * Replaces horizontal set row layout for better visibility of set progression.
 */

import React, { useRef, useEffect } from 'react';
import { SetCard } from './SetCard';

export interface SetData {
	/** Weight in kg (0 = bodyweight) */
	weight: number;
	/** Actual reps (completed) or target range string "8-10" (pending) */
	reps: number | string;
	/** Rate of Perceived Exertion (1-10) */
	rpe: number;
	/** Whether this set is completed */
	isCompleted: boolean;
}

export interface SetStackProps {
	/** Array of all sets (completed + pending) */
	sets: SetData[];

	/** Index of the current/next set to complete */
	currentSetIndex: number;

	/** Currently selected set index (for editing) */
	selectedSetIndex?: number | null;

	/** Index of set being animated (just completed) */
	animatingSetIndex?: number | null;

	/** Callback when a set is tapped */
	onSetClick?: (index: number) => void;
}

export function SetStack({
	sets,
	currentSetIndex,
	selectedSetIndex,
	animatingSetIndex,
	onSetClick,
}: SetStackProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const currentSetRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to keep current set centered
	useEffect(() => {
		if (currentSetRef.current && containerRef.current) {
			const container = containerRef.current;
			const currentSet = currentSetRef.current;

			// Calculate scroll position to center the current set
			const containerHeight = container.clientHeight;
			const setTop = currentSet.offsetTop;
			const setHeight = currentSet.clientHeight;

			const scrollTo = setTop - (containerHeight / 2) + (setHeight / 2);

			container.scrollTo({
				top: Math.max(0, scrollTo),
				behavior: 'smooth',
			});
		}
	}, [currentSetIndex]);

	const getSetVariant = (index: number): 'done' | 'next' | 'pending' => {
		if (index < currentSetIndex) return 'done';
		if (index === currentSetIndex) return 'next';
		return 'pending';
	};

	return (
		<div className="fit-set-stack" ref={containerRef}>
			<div className="fit-set-stack-inner">
				{sets.map((set, index) => {
					const variant = getSetVariant(index);
					const isSelected = selectedSetIndex === index;
					const isAnimating = animatingSetIndex === index;
					const isCurrent = index === currentSetIndex;

					return (
						<div
							key={index}
							ref={isCurrent ? currentSetRef : undefined}
							className={`fit-set-stack-item ${isCurrent ? 'current' : ''}`}
						>
							<SetCard
								weight={set.weight}
								reps={set.reps}
								rpe={set.rpe}
								variant={variant}
								isSelected={isSelected}
								isAnimating={isAnimating}
								onClick={() => onSetClick?.(index)}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}
