import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
	addons: ['@storybook/addon-essentials'],
	staticDirs: [{ from: '../src/assets', to: '/assets' }],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
	viteFinal: async (config) => {
		config.resolve = config.resolve || {};
		config.resolve.alias = {
			...config.resolve.alias,
			// Alias obsidian module to our Storybook mock
			obsidian: path.resolve(__dirname, '../src/storybook/mocks/obsidian-storybook-mock.ts'),
		};

		// Force Vite to pre-bundle fitness-dsl (CJS → ESM conversion)
		config.optimizeDeps = config.optimizeDeps || {};
		config.optimizeDeps.include = [
			...(config.optimizeDeps.include || []),
			'fitness-dsl',
		];

		return config;
	},
};

export default config;
