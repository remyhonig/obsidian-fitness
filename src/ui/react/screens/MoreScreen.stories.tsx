import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MoreScreen } from './MoreScreen';
import { withBottomNav } from './storyDecorators';

const meta: Meta<typeof MoreScreen> = {
	title: 'Screens/MoreScreen',
	component: MoreScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('more')],
};

export default meta;
type Story = StoryObj<typeof MoreScreen>;

export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
	},
};
