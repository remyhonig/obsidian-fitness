/**
 * React Context Providers
 *
 * Makes Obsidian App, Plugin instance, and Fitness Domain available
 * to all React components throughout the app.
 */

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { App } from 'obsidian';
import type MainPlugin from '../../main';
import { FitnessDomainAdapter, ProgramData, SessionState } from '../../domain/fitness-domain-adapter';
import { UserSettingsRepository } from '../../data/user-settings-repository';

// ============================================================================
// App Context
// ============================================================================

const AppContext = createContext<App | null>(null);

export function AppProvider({ app, children }: { app: App; children: ReactNode }) {
	return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}

export function useApp(): App {
	const app = useContext(AppContext);
	if (!app) {
		throw new Error('useApp must be used within AppProvider');
	}
	return app;
}

// ============================================================================
// Plugin Context
// ============================================================================

const PluginContext = createContext<MainPlugin | null>(null);

export function PluginProvider({ plugin, children }: { plugin: MainPlugin; children: ReactNode }) {
	return <PluginContext.Provider value={plugin}>{children}</PluginContext.Provider>;
}

export function usePlugin(): MainPlugin {
	const plugin = useContext(PluginContext);
	if (!plugin) {
		throw new Error('usePlugin must be used within PluginProvider');
	}
	return plugin;
}

// ============================================================================
// User Settings Context
// ============================================================================

const UserSettingsContext = createContext<UserSettingsRepository | null>(null);

export function useUserSettings(): UserSettingsRepository {
	const userSettings = useContext(UserSettingsContext);
	if (!userSettings) {
		throw new Error('useUserSettings must be used within DomainProvider');
	}
	return userSettings;
}

// ============================================================================
// Domain Context
// ============================================================================

interface DomainContextValue {
	adapter: FitnessDomainAdapter;
	program: ProgramData | null;
	programPath: string | null;
	session: SessionState;
	isLoading: boolean;
	loadProgram: (path: string) => Promise<void>;
	loadProgramWithTMs: (path: string, trainingMaxes?: Array<{ exercise: string; value: number; unit: 'kg' | 'lbs' }>) => Promise<void>;
	clearProgram: () => void;
	dispatch: (event: any) => void;
	saveSession: () => Promise<string | null>;
	getSessionProgress: () => number;
	isSessionComplete: () => boolean;
}

const DomainContext = createContext<DomainContextValue | null>(null);

export function DomainProvider({
	adapter,
	userSettings,
	children
}: {
	adapter: FitnessDomainAdapter;
	userSettings: UserSettingsRepository;
	children: ReactNode;
}) {
	const [program, setProgram] = useState<ProgramData | null>(adapter.getProgram());
	const [programPath, setProgramPath] = useState<string | null>(null);
	const [session, setSession] = useState<SessionState>(adapter.getSessionState());
	const [isLoading, setIsLoading] = useState(true);

	// Auto-load active program on mount
	useEffect(() => {
		const loadActiveProgram = async () => {
			try {
				const activePath = await userSettings.getActiveProgram();
				if (activePath) {
					// Check if file exists
					const file = adapter['app'].vault.getAbstractFileByPath(activePath);
					if (file) {
						// Load program with saved TMs
						const programData = await adapter.loadProgram(activePath);
						setProgram(programData);
						setProgramPath(activePath);
					}
				}
			} catch (error) {
				console.error('[DomainProvider] Failed to load active program:', error);
			} finally {
				setIsLoading(false);
			}
		};

		loadActiveProgram();
	}, [adapter, userSettings]);

	const loadProgram = async (path: string) => {
		const programData = await adapter.loadProgram(path);
		setProgram(programData);
		setProgramPath(path);
		await userSettings.setActiveProgram(path);
	};

	const loadProgramWithTMs = async (
		path: string,
		trainingMaxes?: Array<{ exercise: string; value: number; unit: 'kg' | 'lbs' }>
	) => {
		const programData = await adapter.loadProgramWithTMs(path, trainingMaxes);
		setProgram(programData);
		setProgramPath(path);
		await userSettings.setActiveProgram(path);

		// Save TMs if provided
		if (trainingMaxes && trainingMaxes.length > 0 && programData) {
			await userSettings.saveTrainingMaxes(programData.program.name, trainingMaxes);
		}
	};

	const clearProgram = () => {
		setProgram(null);
		setProgramPath(null);
		void userSettings.setActiveProgram(null);
	};

	const dispatch = (event: any) => {
		const newSession = adapter.dispatch(event);
		// Deep clone to ensure all nested arrays get new references
		// This is needed for useMemo dependencies that track nested data
		setSession(JSON.parse(JSON.stringify(newSession)));
	};

	const saveSession = async () => {
		const path = await adapter.saveSession();
		return path;
	};

	const getSessionProgress = () => adapter.getSessionProgress();
	const isSessionComplete = () => adapter.isSessionComplete();

	const value: DomainContextValue = {
		adapter,
		program,
		programPath,
		session,
		isLoading,
		loadProgram,
		loadProgramWithTMs,
		clearProgram,
		dispatch,
		saveSession,
		getSessionProgress,
		isSessionComplete
	};

	return (
		<UserSettingsContext.Provider value={userSettings}>
			<DomainContext.Provider value={value}>{children}</DomainContext.Provider>
		</UserSettingsContext.Provider>
	);
}

export function useDomain(): DomainContextValue {
	const domain = useContext(DomainContext);
	if (!domain) {
		throw new Error('useDomain must be used within DomainProvider');
	}
	return domain;
}

// ============================================================================
// Fullscreen Context
// ============================================================================

interface FullscreenContextValue {
	isFullscreen: boolean;
	toggleFullscreen: () => void;
}

const FullscreenContext = createContext<FullscreenContextValue | null>(null);

export function FullscreenProvider({
	children
}: {
	children: ReactNode;
}) {
	const [isFullscreen, setIsFullscreen] = useState(false);

	const toggleFullscreen = () => {
		setIsFullscreen(prev => !prev);
	};

	return (
		<FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen }}>
			{children}
		</FullscreenContext.Provider>
	);
}

export function useFullscreen(): FullscreenContextValue {
	const fullscreen = useContext(FullscreenContext);
	if (!fullscreen) {
		throw new Error('useFullscreen must be used within FullscreenProvider');
	}
	return fullscreen;
}
