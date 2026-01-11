/**
 * Main App Component
 *
 * Root React component that handles:
 * - Navigation between screens
 * - Bottom navigation tabs
 * - Context provider setup
 * - Screen rendering
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup } from 'framer-motion';
import { App as ObsidianApp, Notice } from 'obsidian';
import { compileProgramFromString, dumpFullStateAsJSON } from 'fitness-dsl';
import type { SetResult } from 'fitness-dsl';
import type MainPlugin from '../../main';
import { FitnessDomainAdapter } from '../../domain/fitness-domain-adapter';
import { UserSettingsRepository } from '../../data/user-settings-repository';
import { AppProvider, PluginProvider, DomainProvider, FullscreenProvider, useDomain, useFullscreen } from './contexts';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { WorkoutPickerScreen } from './screens/WorkoutPickerScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { FinishScreen } from './screens/FinishScreen';
import { MoreScreen } from './screens/MoreScreen';
import { WorkoutDetailScreen } from './screens/WorkoutDetailScreen';
import { ProgramSetupScreen } from './screens/ProgramSetupScreen';
import { ProgramPickerScreen } from './screens/ProgramPickerScreen';
import { SessionDetailScreen } from './screens/SessionDetailScreen';
import { BottomNav, type DefaultTabType } from './components/BottomNav';

/** BottomNav wrapper that uses context for reactive progress updates */
function BottomNavWithProgress({
	activeTab,
	onTabChange
}: {
	activeTab: DefaultTabType;
	onTabChange: (tab: DefaultTabType) => void;
}) {
	const { session } = useDomain();

	// Calculate workout progress from session state (reactive)
	const workoutProgress = (() => {
		if (!session.isActive) return null;

		const completedSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
		const totalSets = session.exercises.reduce((sum, e) => sum + e.targetSets, 0);

		if (totalSets === 0) return 0;
		return completedSets / totalSets;
	})();

	return (
		<BottomNav
			activeTab={activeTab}
			onTabChange={onTabChange}
			workoutProgress={workoutProgress}
		/>
	);
}

/** App container that applies fullscreen class and uses portal for true fullscreen */
function AppContainer({ children }: { children: React.ReactNode }) {
	const { isFullscreen } = useFullscreen();

	const content = (
		<div className={`fit-app ${isFullscreen ? 'fit-app-fullscreen' : ''}`}>
			{children}
		</div>
	);

	// When fullscreen, render via portal to document.body to escape any containing blocks
	if (isFullscreen) {
		return createPortal(content, document.body);
	}

	return content;
}

// Tab types for bottom navigation
type TabType = DefaultTabType;

// Screen types (tabs + full-screen modes)
type ScreenType = TabType | 'session' | 'finish' | 'session-detail' | 'exercise-library' | 'workout-detail' | 'program-setup' | 'program-picker';

interface ScreenParams {
	[key: string]: unknown;
}

interface AppProps {
	app: ObsidianApp;
	plugin: MainPlugin;
}

export function App({ app, plugin }: AppProps) {
	const [adapter] = useState(() => new FitnessDomainAdapter(app));
	const [userSettings] = useState(() => new UserSettingsRepository(app, plugin.settings.basePath));
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

			// Truncate description for debugging readability
			const stateObj = JSON.parse(stateDump);
			if (stateObj.programDescription && stateObj.programDescription.length > 100) {
				stateObj.programDescription = stateObj.programDescription.substring(0, 100) + '...';
			}
			const truncatedDump = JSON.stringify(stateObj, null, 2);

			await navigator.clipboard.writeText(truncatedDump);
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

		// If navigating to workout tab
		if (tab === 'workout') {
			const session = adapter.getSessionState();

			// If there's an active session, go to session screen
			if (session.isActive) {
				setCurrentScreen('session');
				setScreenParams({});
				return;
			}

			// Otherwise, go to workout detail for the suggested workout
			const program = adapter.getProgram();
			if (program) {
				// Use nextSession if available
				let suggestedWorkout: string | null = null;

				if (program.nextSession) {
					suggestedWorkout = program.nextSession.workout;
				} else {
					// Fallback: find first workout with exercises from cycle pattern or workouts list
					const cycleWorkoutNames = program.schedule.cyclePattern.map(c => c.workout);
					const workoutsWithExercises = program.workouts.filter(w => w.exercises.length > 0);

					// Prefer cycle order, but only if workout has exercises
					const firstCycleWorkout = cycleWorkoutNames
						.map(name => workoutsWithExercises.find(w => w.name === name))
						.find(w => w !== undefined);

					suggestedWorkout = firstCycleWorkout?.name ?? workoutsWithExercises[0]?.name ?? null;
				}

				if (suggestedWorkout) {
					setCurrentScreen('workout-detail');
					setScreenParams({ workoutName: suggestedWorkout });
					return;
				}
			}
		}

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
			case 'workout-detail':
				return (
					<WorkoutDetailScreen
						onNavigate={navigateTo}
						workoutName={screenParams.workoutName as string}
						layoutId={screenParams.layoutId as string | undefined}
						cardVariant={screenParams.cardVariant as 'done' | 'next' | 'pending' | 'suggested' | undefined}
						onBack={goBack}
					/>
				);
			case 'program-setup':
				return (
					<ProgramSetupScreen
						programPath={screenParams.programPath as string}
						onNavigate={navigateTo}
					/>
				);
			case 'program-picker':
				return (
					<ProgramPickerScreen
						onNavigate={navigateTo}
						onBack={goBack}
						isChangingProgram={screenParams.isChangingProgram as boolean}
					/>
				);
			case 'finish':
				return <FinishScreen onNavigate={navigateTo} sessionPath={screenParams.sessionPath as string | undefined} />;
			case 'session-detail':
				return <SessionDetailScreen onNavigate={navigateTo} sessionPath={screenParams.sessionPath as string} />;
			default:
				return <HomeScreen onNavigate={navigateTo} />;
		}
	};

	return (
		<AppProvider app={app}>
			<PluginProvider plugin={plugin}>
				<DomainProvider adapter={adapter} userSettings={userSettings}>
					<FullscreenProvider>
						<LayoutGroup>
							<AppContainer>
								<div className="fit-main-content">
									{renderScreen()}
								</div>
								{showBottomNav && (
									<BottomNavWithProgress
										activeTab={getActiveTab()}
										onTabChange={navigateToTab}
									/>
								)}
							</AppContainer>
						</LayoutGroup>
					</FullscreenProvider>
				</DomainProvider>
			</PluginProvider>
		</AppProvider>
	);
}
