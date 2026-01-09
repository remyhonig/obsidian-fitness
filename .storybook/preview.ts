import type { Preview, Decorator } from '@storybook/react';
import { useEffect } from 'react';
import { withProviders } from '../src/storybook/decorators/providers';

// Import obsidian base styles, then theme, then plugin styles to allow overrides
import './obsidian-app.css';
import './obsidian-theme.css';
import '../styles.css';

// Polyfill Obsidian's HTMLElement.prototype.empty() method
// Obsidian extends HTMLElement with this method to clear all children
declare global {
	interface HTMLElement {
		empty(): void;
	}
}

if (typeof HTMLElement.prototype.empty !== 'function') {
	HTMLElement.prototype.empty = function () {
		while (this.firstChild) {
			this.removeChild(this.firstChild);
		}
	};
}

// Theme decorator - applies theme class to document body
const withTheme: Decorator = (Story, context) => {
	const theme = context.globals.theme || 'dark';

	useEffect(() => {
		// Apply theme class to body and storybook root
		document.body.classList.remove('theme-light', 'theme-dark');
		document.body.classList.add(`theme-${theme}`);
		document.body.dataset.theme = theme;
	}, [theme]);

	return Story();
};

const preview: Preview = {
	decorators: [withTheme, withProviders],
	globalTypes: {
		theme: {
			name: 'Theme',
			description: 'Obsidian color theme',
			defaultValue: 'dark',
			toolbar: {
				icon: 'paintbrush',
				items: [
					{ value: 'dark', title: 'Dark', icon: 'moon' },
					{ value: 'light', title: 'Light', icon: 'sun' },
				],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		layout: 'fullscreen',
		// Disable backgrounds addon - we control background via CSS
		backgrounds: { disable: true },
		viewport: {
			viewports: {
				mobile: {
					name: 'Mobile',
					styles: { width: '375px', height: '812px' },
				},
				mobileLarge: {
					name: 'Mobile Large',
					styles: { width: '414px', height: '896px' },
				},
				tablet: {
					name: 'Tablet',
					styles: { width: '768px', height: '1024px' },
				},
			},
			defaultViewport: 'mobile',
		},
	},
};

export default preview;
