/**
 * React Context Providers
 *
 * Makes Obsidian App, Plugin instance, and Fitness Domain available
 * to all React components throughout the app.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { App } from 'obsidian';
import type MainPlugin from '../../main';
import { FitnessDomainAdapter, ProgramData, SessionState } from '../../domain/fitness-domain-adapter';

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
// Domain Context
// ============================================================================

interface DomainContextValue {
	adapter: FitnessDomainAdapter;
	program: ProgramData | null;
	session: SessionState;
	loadProgram: (path: string) => Promise<void>;
	dispatch: (event: any) => void;
}

const DomainContext = createContext<DomainContextValue | null>(null);

export function DomainProvider({
	adapter,
	children
}: {
	adapter: FitnessDomainAdapter;
	children: ReactNode;
}) {
	const [program, setProgram] = React.useState<ProgramData | null>(adapter.getProgram());
	const [session, setSession] = React.useState<SessionState>(adapter.getSessionState());

	const loadProgram = async (path: string) => {
		const programData = await adapter.loadProgram(path);
		setProgram(programData);
	};

	const dispatch = (event: any) => {
		const newSession = adapter.dispatch(event);
		setSession(newSession);
	};

	const value: DomainContextValue = {
		adapter,
		program,
		session,
		loadProgram,
		dispatch
	};

	return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>;
}

export function useDomain(): DomainContextValue {
	const domain = useContext(DomainContext);
	if (!domain) {
		throw new Error('useDomain must be used within DomainProvider');
	}
	return domain;
}
