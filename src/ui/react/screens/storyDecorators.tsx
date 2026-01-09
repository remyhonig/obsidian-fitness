/**
 * Shared Storybook decorators for screen stories.
 * Provides consistent app shell with bottom navigation.
 */

import React, { useState } from 'react';
import { BottomNav, type DefaultTabType } from '../components/BottomNav';

interface ScreenWrapperProps {
	children: React.ReactNode;
	activeTab?: DefaultTabType;
}

/**
 * Wraps a screen component with the app shell including bottom navigation.
 */
export function ScreenWrapper({ children, activeTab = 'home' }: ScreenWrapperProps) {
	const [tab, setTab] = useState<DefaultTabType>(activeTab);

	return (
		<div className="fit-app" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
			<div className="fit-main-content" style={{ flex: 1, overflow: 'auto' }}>
				{children}
			</div>
			<BottomNav<DefaultTabType> activeTab={tab} onTabChange={setTab} />
		</div>
	);
}

/**
 * Creates a Storybook decorator that wraps the story with ScreenWrapper.
 */
export function withBottomNav(activeTab: DefaultTabType = 'home') {
	return function decorator(Story: React.ComponentType) {
		return (
			<ScreenWrapper activeTab={activeTab}>
				<Story />
			</ScreenWrapper>
		);
	};
}
