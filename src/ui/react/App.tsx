/**
 * Main App Component
 *
 * Root React component that handles:
 * - Navigation between screens
 * - Bottom navigation tabs
 * - Context provider setup
 * - Screen rendering
 */

import React, { useState } from 'react';
import { App as ObsidianApp } from 'obsidian';
import type MainPlugin from '../../main';
import { FitnessDomainAdapter } from '../../domain/fitness-domain-adapter';
import { AppProvider, PluginProvider, DomainProvider } from './contexts';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { WorkoutPickerScreen } from './screens/WorkoutPickerScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { FinishScreen } from './screens/FinishScreen';
import { MoreScreen } from './screens/MoreScreen';

// Tab types for bottom navigation
type TabType = 'home' | 'workout' | 'history' | 'more';

// Screen types (tabs + full-screen modes)
type ScreenType = TabType | 'session' | 'finish' | 'exercise-library';

interface ScreenParams {
	[key: string]: unknown;
}

interface AppProps {
	app: ObsidianApp;
	plugin: MainPlugin;
}

// SVG Icons for bottom navigation
const NavIcons = {
	home: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	),
	workout: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M6.5 6.5h-2a1 1 0 00-1 1v9a1 1 0 001 1h2M17.5 6.5h2a1 1 0 011 1v9a1 1 0 01-1 1h-2" />
			<rect x="6.5" y="8.5" width="3" height="7" rx="0.5" />
			<rect x="14.5" y="8.5" width="3" height="7" rx="0.5" />
			<line x1="9.5" y1="12" x2="14.5" y2="12" />
		</svg>
	),
	history: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M3 3v5h5" />
			<path d="M3.05 13A9 9 0 106 5.3L3 8" />
			<path d="M12 7v5l4 2" />
		</svg>
	),
	more: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<circle cx="12" cy="12" r="1" fill="currentColor" />
			<circle cx="12" cy="5" r="1" fill="currentColor" />
			<circle cx="12" cy="19" r="1" fill="currentColor" />
		</svg>
	)
};

// Bottom navigation item component
interface BottomNavItemProps {
	tab: TabType;
	icon: React.ReactNode;
	label: string;
	isActive: boolean;
	onClick: () => void;
}

function BottomNavItem({ icon, label, isActive, onClick }: BottomNavItemProps) {
	return (
		<button
			className={`fit-bottom-nav-item ${isActive ? 'active' : ''}`}
			onClick={onClick}
		>
			<span className="fit-bottom-nav-icon">{icon}</span>
			<span className="fit-bottom-nav-label">{label}</span>
		</button>
	);
}

export function App({ app, plugin }: AppProps) {
	const [adapter] = useState(() => new FitnessDomainAdapter(app));
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
	const [screenParams, setScreenParams] = useState<ScreenParams>({});
	const [navigationStack, setNavigationStack] = useState<Array<{ screen: ScreenType; params: ScreenParams }>>([]);

	// Determine which tab is active based on current screen
	const getActiveTab = (): TabType => {
		if (currentScreen === 'home') return 'home';
		if (currentScreen === 'workout' || currentScreen === 'session') return 'workout';
		if (currentScreen === 'history') return 'history';
		if (currentScreen === 'more' || currentScreen === 'exercise-library') return 'more';
		return 'home';
	};

	const navigateTo = (screen: string, params: ScreenParams = {}) => {
		// Push current screen to stack (only for non-tab navigation)
		const tabScreens: ScreenType[] = ['home', 'workout', 'history', 'more'];
		if (!tabScreens.includes(screen as ScreenType)) {
			setNavigationStack([...navigationStack, { screen: currentScreen, params: screenParams }]);
		}
		setCurrentScreen(screen as ScreenType);
		setScreenParams(params);
	};

	const navigateToTab = (tab: TabType) => {
		// Clear navigation stack when switching tabs
		setNavigationStack([]);
		setCurrentScreen(tab);
		setScreenParams({});
	};

	const goBack = () => {
		const previous = navigationStack[navigationStack.length - 1];
		if (previous) {
			setCurrentScreen(previous.screen);
			setScreenParams(previous.params);
			setNavigationStack(navigationStack.slice(0, -1));
		} else {
			navigateToTab('home');
		}
	};

	// Always show bottom navigation for consistent layout
	const showBottomNav = true;

	const renderScreen = () => {
		switch (currentScreen) {
			case 'home':
				return <HomeScreen onNavigate={navigateTo} />;
			case 'session':
				return <SessionScreen onNavigate={navigateTo} />;
			case 'workout':
				return <WorkoutPickerScreen onNavigate={navigateTo} isTab={true} />;
			case 'history':
				return <HistoryScreen onNavigate={navigateTo} isTab={true} />;
			case 'more':
				return <MoreScreen onNavigate={navigateTo} />;
			case 'exercise-library':
				return (
					<div className="fit-placeholder-screen">
						<h2>Exercise Library</h2>
						<p>Coming soon...</p>
						<button className="fit-button-secondary" onClick={goBack}>Go Back</button>
					</div>
				);
			case 'finish':
				return <FinishScreen onNavigate={navigateTo} />;
			default:
				return <HomeScreen onNavigate={navigateTo} />;
		}
	};

	return (
		<AppProvider app={app}>
			<PluginProvider plugin={plugin}>
				<DomainProvider adapter={adapter}>
					<div className="fit-app">
						<div className="fit-main-content">
							{renderScreen()}
						</div>
						{showBottomNav && (
							<nav className="fit-bottom-nav">
								<BottomNavItem
									tab="home"
									icon={NavIcons.home}
									label="Home"
									isActive={getActiveTab() === 'home'}
									onClick={() => navigateToTab('home')}
								/>
								<BottomNavItem
									tab="workout"
									icon={NavIcons.workout}
									label="Workout"
									isActive={getActiveTab() === 'workout'}
									onClick={() => navigateToTab('workout')}
								/>
								<BottomNavItem
									tab="history"
									icon={NavIcons.history}
									label="History"
									isActive={getActiveTab() === 'history'}
									onClick={() => navigateToTab('history')}
								/>
								<BottomNavItem
									tab="more"
									icon={NavIcons.more}
									label="More"
									isActive={getActiveTab() === 'more'}
									onClick={() => navigateToTab('more')}
								/>
							</nav>
						)}
					</div>
				</DomainProvider>
			</PluginProvider>
		</AppProvider>
	);
}
