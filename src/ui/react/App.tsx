/**
 * Main App Component
 *
 * Root React component that handles:
 * - Navigation between screens
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

// Screen types
type ScreenType = 'home' | 'session' | 'workout-picker' | 'history' | 'exercise-library' | 'finish';

interface ScreenParams {
	[key: string]: any;
}

interface AppProps {
	app: ObsidianApp;
	plugin: MainPlugin;
}

export function App({ app, plugin }: AppProps) {
	const [adapter] = useState(() => new FitnessDomainAdapter(app));
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
	const [screenParams, setScreenParams] = useState<ScreenParams>({});
	const [navigationStack, setNavigationStack] = useState<Array<{ screen: ScreenType; params: ScreenParams }>>([]);

	const navigateTo = (screen: ScreenType, params: ScreenParams = {}) => {
		// Push current screen to stack
		if (currentScreen) {
			setNavigationStack([...navigationStack, { screen: currentScreen, params: screenParams }]);
		}
		setCurrentScreen(screen);
		setScreenParams(params);
	};

	const goBack = () => {
		const previous = navigationStack[navigationStack.length - 1];
		if (previous) {
			setCurrentScreen(previous.screen);
			setScreenParams(previous.params);
			setNavigationStack(navigationStack.slice(0, -1));
		} else {
			navigateTo('home');
		}
	};

	const renderScreen = () => {
		switch (currentScreen) {
			case 'home':
				return <HomeScreen onNavigate={navigateTo} />;
			case 'session':
				return <SessionScreen onNavigate={navigateTo} />;
			case 'workout-picker':
				return <WorkoutPickerScreen onNavigate={navigateTo} />;
			case 'history':
				return <HistoryScreen onNavigate={navigateTo} />;
			case 'exercise-library':
				return (
					<div className="fit-placeholder-screen">
						<h2>Exercise Library</h2>
						<p>Coming soon...</p>
						<button onClick={goBack}>Go Back</button>
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
						{renderScreen()}
					</div>
				</DomainProvider>
			</PluginProvider>
		</AppProvider>
	);
}
