import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, 'src/test/obsidian-mock.ts')
		}
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		setupFiles: ['src/test/setup.ts'],
		passWithNoTests: true,
	},
});
