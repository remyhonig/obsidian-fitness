import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MoreScreen } from './MoreScreen';

const meta: Meta<typeof MoreScreen> = {
	title: 'Screens/MoreScreen',
	component: MoreScreen,
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof MoreScreen>;

export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
	},
};
