/**
 * SettingsScreen stories
 *
 * Settings screen for configuring workout preferences.
 * Currently supports controls position (top/bottom).
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SettingsScreen } from './SettingsScreen';
import { withBottomNav } from './storyDecorators';

const meta: Meta<typeof SettingsScreen> = {
	title: 'Screens/SettingsScreen',
	component: SettingsScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('more')],
};

export default meta;
type Story = StoryObj<typeof SettingsScreen>;

/**
 * Default settings screen with bottom position selected.
 */
export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
};

/**
 * Settings screen showing the controls position setting.
 * Users can choose between bottom (default) and top placement.
 */
export const ControlsPositionSetting: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
};
