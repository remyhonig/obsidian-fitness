/**
 * Storybook decorators that wrap stories with required context providers
 */

import React from 'react';
import type { Decorator, StoryContext } from '@storybook/react';
import { App, Plugin, setStorybookFiles } from '../mocks/obsidian-storybook-mock';
import { createMockDomainAdapter } from '../mocks/domain-mock';
import { AppProvider, PluginProvider, DomainProvider } from '../../ui/react/contexts';
import type { FitnessDomainAdapter } from '../../domain/fitness-domain-adapter';

// Default example program for stories that don't provide their own
const DEFAULT_PROGRAM = `# Simple Workout Program

A simple program for testing.

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body
- Friday: Full Body

---

# Workouts

## Upper Body

Chest and back focused workout.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s

---

## Lower Body

Leg focused workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s

---

## Full Body

Full body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 120s
`;

interface StoryArgs {
	programMarkdown?: string;
	sessionState?: Record<string, unknown>;
	files?: Record<string, string>;
}

/**
 * Main decorator that provides all required contexts for stories
 */
export const withProviders: Decorator = (Story, context: StoryContext) => {
	const args = context.args as StoryArgs;
	const programMarkdown = args.programMarkdown ?? DEFAULT_PROGRAM;
	const sessionState = args.sessionState;
	const files = args.files;

	// Set up mock files if provided
	if (files) {
		setStorybookFiles(files);
	} else {
		// Set up default files
		setStorybookFiles({
			'Fitness/Programs/Simple.md': programMarkdown,
		});
	}

	const app = new App();
	const plugin = new Plugin(app);
	const adapter = createMockDomainAdapter({
		programMarkdown,
		sessionState,
	});

	return (
		<AppProvider app={app as unknown as import('obsidian').App}>
			<PluginProvider plugin={plugin as unknown as import('../../main').default}>
				<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter}>
					<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
						<Story />
					</div>
				</DomainProvider>
			</PluginProvider>
		</AppProvider>
	);
};

/**
 * Decorator for stories that only need App context (no domain)
 */
export const withAppProvider: Decorator = (Story) => {
	const app = new App();

	return (
		<AppProvider app={app as unknown as import('obsidian').App}>
			<Story />
		</AppProvider>
	);
};

/**
 * Helper to create a decorator with custom program markdown
 */
export function withProgram(programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);
		const adapter = createMockDomainAdapter({ programMarkdown });

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter}>
						<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
							<Story />
						</div>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Helper to create a decorator with an active session
 */
export function withActiveSession(workoutName: string, programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);
		const adapter = createMockDomainAdapter({ programMarkdown });

		// Start the workout session
		adapter.dispatch({ type: 'start_workout', workoutName });

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter}>
						<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
							<Story />
						</div>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}

/**
 * Helper to create a decorator with a loaded program (no active session)
 */
export function withLoadedProgram(programMarkdown: string): Decorator {
	return (Story) => {
		const app = new App();
		const plugin = new Plugin(app);
		const adapter = createMockDomainAdapter({ programMarkdown });

		// Verify program was loaded
		const program = adapter.getProgram();
		if (!program) {
			console.error('[withLoadedProgram] Failed to parse program markdown');
		}

		setStorybookFiles({
			'Fitness/Programs/Custom.md': programMarkdown,
		});

		return (
			<AppProvider app={app as unknown as import('obsidian').App}>
				<PluginProvider plugin={plugin as unknown as import('../../main').default}>
					<DomainProvider adapter={adapter as unknown as FitnessDomainAdapter}>
						<div className="fit-app fit-view fit-view-mobile" style={{ height: '100vh' }}>
							<Story />
						</div>
					</DomainProvider>
				</PluginProvider>
			</AppProvider>
		);
	};
}
