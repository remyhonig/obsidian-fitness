/**
 * MoreScreen Component
 *
 * Settings and additional features menu accessed via bottom navigation.
 * Provides access to:
 * - Exercise Library
 * - Settings
 * - About (future)
 */

import { TopNav } from '../components/TopNav';

interface MoreScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function MoreScreen({ onNavigate }: MoreScreenProps) {
	const handleChangeProgram = () => {
		onNavigate('program-picker', { isChangingProgram: true });
	};

	return (
		<div className="fit-more-screen">
			<TopNav title="more" />

			<div className="fit-content">
				<div className="fit-menu-list">
					<button
						className="fit-menu-item"
						onClick={handleChangeProgram}
					>
						<span className="fit-menu-icon">🔄</span>
						<span>Change Program</span>
						<span className="fit-menu-chevron">›</span>
					</button>
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
					<button
						className="fit-menu-item"
						onClick={() => onNavigate('settings')}
					>
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
