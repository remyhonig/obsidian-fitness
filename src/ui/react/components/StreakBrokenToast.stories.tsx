import type { Meta, StoryObj } from '@storybook/react';
import { StreakBrokenToast } from './StreakBrokenToast';

const meta: Meta<typeof StreakBrokenToast> = {
	title: 'Components/StreakBrokenToast',
	component: StreakBrokenToast,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Default streak broken toast */
export const Default: Story = {
	args: {
		previousStreak: 2,
		ruleDescription: '+2.5kg when RPE < 8',
		onDismiss: () => console.log('Toast dismissed'),
	},
};

/** Long streak broken */
export const LongStreak: Story = {
	args: {
		previousStreak: 5,
		ruleDescription: 'complete all sets at target reps',
		onDismiss: () => console.log('Toast dismissed'),
	},
};

/** Short description */
export const ShortDescription: Story = {
	args: {
		previousStreak: 3,
		ruleDescription: '+5kg',
		onDismiss: () => console.log('Toast dismissed'),
	},
};

/** No auto-dismiss (for testing) */
export const NoAutoDismiss: Story = {
	args: {
		previousStreak: 2,
		ruleDescription: '+2.5kg when RPE < 8',
		onDismiss: () => console.log('Toast dismissed'),
		autoDismissDelay: 999999, // Very long delay for testing
	},
};
