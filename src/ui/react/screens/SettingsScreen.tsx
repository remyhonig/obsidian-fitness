/**
 * SettingsScreen Component
 *
 * In-app settings screen for configuring workout preferences.
 * Currently supports:
 * - Controls position (top/bottom) for session screen
 */

import { useState } from 'react';
import { TopNav } from '../components/TopNav';
import { usePlugin } from '../contexts';
import type { ControlsPosition } from '../../../settings';

interface SettingsScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
	onBack?: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
	const plugin = usePlugin();
	const [controlsPosition, setControlsPosition] = useState<ControlsPosition>(
		plugin.settings.controlsPosition
	);

	const handlePositionChange = async (position: ControlsPosition) => {
		setControlsPosition(position);
		plugin.settings.controlsPosition = position;
		await plugin.saveSettings();
	};

	return (
		<div className="fit-settings-screen">
			<TopNav
				title="settings"
				variant="back"
				onBack={onBack}
			/>

			<div className="fit-content">
				<div className="fit-settings-section">
					<h3 className="fit-settings-section-title">controls position</h3>
					<p className="fit-settings-section-desc">
						choose where the action buttons appear during your workout
					</p>

					<div className="fit-settings-position-options">
						{/* Bottom option */}
						<label className={`fit-settings-position-option ${controlsPosition === 'bottom' ? 'selected' : ''}`}>
							<input
								type="radio"
								name="controlsPosition"
								value="bottom"
								checked={controlsPosition === 'bottom'}
								onChange={() => handlePositionChange('bottom')}
							/>
							<div className="fit-settings-thumbnail">
								<div className="fit-thumbnail-phone">
									<div className="fit-thumbnail-topnav" />
									<div className="fit-thumbnail-content" />
									<div className="fit-thumbnail-controls" />
								</div>
							</div>
							<span className="fit-settings-option-label">bottom</span>
						</label>

						{/* Top option */}
						<label className={`fit-settings-position-option ${controlsPosition === 'top' ? 'selected' : ''}`}>
							<input
								type="radio"
								name="controlsPosition"
								value="top"
								checked={controlsPosition === 'top'}
								onChange={() => handlePositionChange('top')}
							/>
							<div className="fit-settings-thumbnail">
								<div className="fit-thumbnail-phone">
									<div className="fit-thumbnail-controls" />
									<div className="fit-thumbnail-topnav" />
									<div className="fit-thumbnail-content" />
								</div>
							</div>
							<span className="fit-settings-option-label">top</span>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}
