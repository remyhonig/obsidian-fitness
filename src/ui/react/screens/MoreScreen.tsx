/**
 * MoreScreen Component
 *
 * Settings and additional features menu accessed via bottom navigation.
 * Provides access to:
 * - Exercise Library
 * - Settings (future)
 * - About (future)
 */

import React from 'react';

interface MoreScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function MoreScreen({ onNavigate }: MoreScreenProps) {
	return (
		<div className="fit-more-screen">
			<header className="fit-screen-header">
				<h1>More</h1>
			</header>

			<div className="fit-content">
				<div className="fit-menu-list">
					<button
						className="fit-menu-item"
						onClick={() => onNavigate('exercise-library')}
					>
						<span className="fit-menu-icon">📚</span>
						<span>Exercise Library</span>
						<span className="fit-menu-chevron">›</span>
					</button>
				</div>

				<div className="fit-menu-list">
					<button className="fit-menu-item" disabled>
						<span className="fit-menu-icon">⚙️</span>
						<span>Settings</span>
						<span className="fit-menu-chevron">›</span>
					</button>
					<button className="fit-menu-item" disabled>
						<span className="fit-menu-icon">ℹ️</span>
						<span>About</span>
						<span className="fit-menu-chevron">›</span>
					</button>
				</div>
			</div>
		</div>
	);
}
