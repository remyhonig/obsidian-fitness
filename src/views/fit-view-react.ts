/**
 * FitView (React Version)
 *
 * Obsidian view that renders the React fitness app using React 18's createRoot API.
 * Replaces the vanilla TypeScript UI with a React-based interface.
 */

import { ItemView, Platform, WorkspaceLeaf } from 'obsidian';
import type MainPlugin from '../main';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { App } from '../ui/react/App';

export const VIEW_TYPE_FIT_REACT = 'obsidian-fitness-view-react';

/**
 * Main view for the workout tracker (React version)
 */
export class FitViewReact extends ItemView {
	private root: Root | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: MainPlugin
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_FIT_REACT;
	}

	getDisplayText(): string {
		return 'Workout (React)';
	}

	getIcon(): string {
		return 'dumbbell';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('fit-view-react');

		// Add mobile class if on mobile
		if (Platform.isMobile) {
			container.addClass('fit-view-mobile');
		}

		// Apply padding from settings
		this.applyPadding();

		// Create React root and render app
		this.root = createRoot(container);
		this.root.render(
			React.createElement(React.StrictMode, null,
				React.createElement(App, {
					app: this.app,
					plugin: this.plugin
				})
			)
		);
	}

	async onClose(): Promise<void> {
		// Unmount React app
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}

	/**
	 * Called when settings change - updates padding and re-renders
	 */
	onSettingsChanged(): void {
		this.applyPadding();
		// React components will automatically re-render when needed
		// because they access settings through the context
	}

	/**
	 * Applies padding CSS variables from settings
	 */
	private applyPadding(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.style.setProperty('--fit-top-padding', `${this.plugin.settings.topPadding}px`);
		container.style.setProperty('--fit-bottom-padding', `${this.plugin.settings.bottomPadding}px`);

		// Also set on document.body for overlays
		document.body.style.setProperty('--fit-top-padding', `${this.plugin.settings.topPadding}px`);
		document.body.style.setProperty('--fit-bottom-padding', `${this.plugin.settings.bottomPadding}px`);
	}
}
