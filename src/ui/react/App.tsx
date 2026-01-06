/**
 * Main App Component
 *
 * Root React component that handles:
 * - Navigation between screens
 * - Bottom navigation tabs
 * - Context provider setup
 * - Screen rendering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { App as ObsidianApp, Notice } from 'obsidian';
import { compileProgramFromString, dumpFullStateAsJSON } from 'fitness-dsl';
import type { SetResult } from 'fitness-dsl';
import type MainPlugin from '../../main';
import { FitnessDomainAdapter } from '../../domain/fitness-domain-adapter';
import { AppProvider, PluginProvider, DomainProvider, useDomain } from './contexts';
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

// Session banner - shows on non-session screens when workout is active
interface SessionBannerProps {
	onClick: () => void;
}

function SessionBanner({ onClick }: SessionBannerProps) {
	const { session } = useDomain();
	const currentExercise = session.exercises[session.currentExerciseIndex];
	// Timer state - calculated from session.restStartTime
	const [restElapsed, setRestElapsed] = useState(0);
	// Include extra rest time from session state (added by tapping header in SessionScreen)
	const restTarget = (currentExercise?.restSeconds ?? 120) + session.extraRestTime;

	// Timer effect - calculates elapsed time from session.restStartTime
	useEffect(() => {
		if (!session.isActive || !session.restStartTime) return;

		const updateRest = () => {
			const elapsed = Math.floor((Date.now() - session.restStartTime!) / 1000);
			setRestElapsed(elapsed);
		};

		updateRest();
		const interval = setInterval(updateRest, 1000);
		return () => clearInterval(interval);
	}, [session.isActive, session.restStartTime]);

	if (!session.isActive) return null;

	const exerciseName = currentExercise?.exercise ?? 'Workout';

	// Format time as M:SS
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Calculate rest progress (0-100%)
	const isResting = restElapsed < restTarget;
	const restProgress = Math.min(100, (restElapsed / restTarget) * 100);

	// Show rest remaining if resting, otherwise show overage time
	const restRemaining = Math.max(0, restTarget - restElapsed);
	const overageTime = restElapsed - restTarget;
	const timeDisplay = isResting ? formatTime(restRemaining) : formatTime(overageTime);

	return (
		<div
			className={`fit-session-banner ${isResting ? 'resting' : 'ready'}`}
			onClick={onClick}
			style={{ '--rest-progress': `${restProgress}%` } as React.CSSProperties}
		>
			<span className="fit-session-banner-exercise">{exerciseName}</span>
			<span className="fit-session-banner-time">{timeDisplay}</span>
		</div>
	);
}

export function App({ app, plugin }: AppProps) {
	const [adapter] = useState(() => new FitnessDomainAdapter(app));
	const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
	const [screenParams, setScreenParams] = useState<ScreenParams>({});
	const [navigationStack, setNavigationStack] = useState<Array<{ screen: ScreenType; params: ScreenParams }>>([]);

	// Copy program state to clipboard (for debugging)
	const copyProgramState = useCallback(async () => {
		try {
			const programMarkdown = adapter.getProgramMarkdown();
			if (!programMarkdown) {
				new Notice('No program loaded');
				return;
			}

			const program = compileProgramFromString(programMarkdown);
			const session = adapter.getSessionState();

			// Convert current session to SetResult[] format
			// Each completed set becomes a separate SetResult entry
			const sessionResults: SetResult[] = [];
			if (session.isActive) {
				const date = session.date ?? new Date().toISOString().split('T')[0];
				const workout = session.workout ?? '';

				for (const ex of session.exercises) {
					// All sets in session.exercises are completed (logged) sets
					for (const set of ex.sets) {
						sessionResults.push({
							datetime: `${date} ${new Date().toTimeString().slice(0, 5)}`,
							workout,
							exercise: ex.exercise,
							reps: set.reps,
							weight: set.weight === 0 ? 'bodyweight' : `${set.weight}kg`,
							rpe: set.rpe ?? 0
						});
					}
				}
			}

			const stateDump = dumpFullStateAsJSON(program, { sessionResults });

			await navigator.clipboard.writeText(stateDump);
			new Notice('Program state copied to clipboard');

		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to copy: ${msg}`);
			console.error('Copy program state error:', error);
		}
	}, [adapter]);

	// Keyboard shortcut: 'C' to copy program state
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only 'c' key, not Cmd+C or Ctrl+C (preserve normal copy)
			if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
				// Don't trigger if user is typing in an input
				if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
					return;
				}
				void copyProgramState();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [copyProgramState]);

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

	// Show session banner on non-session screens
	const showSessionBanner = currentScreen !== 'session' && currentScreen !== 'finish';

	return (
		<AppProvider app={app}>
			<PluginProvider plugin={plugin}>
				<DomainProvider adapter={adapter}>
					<div className="fit-app">
						{showSessionBanner && (
							<SessionBanner onClick={() => navigateTo('session')} />
						)}
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
