import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { WelcomeScreen } from './WelcomeScreen';
import { withProviders } from '../../../storybook/decorators/providers';

const meta: Meta<typeof WelcomeScreen> = {
	title: 'Screens/WelcomeScreen',
	component: WelcomeScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withProviders],
};

export default meta;
type Story = StoryObj<typeof WelcomeScreen>;

/**
 * Welcome screen - the first screen shown when the app launches
 * and no program has been selected yet. Shows the app title "Brorilla"
 * in the TopNav, mascot with welcome message, and a continue button
 * to proceed to program selection. No BottomNav on this screen.
 */
export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
	},
};
