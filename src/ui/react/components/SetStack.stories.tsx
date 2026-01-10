import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SetStack } from './SetStack';

const meta: Meta<typeof SetStack> = {
	title: 'Components/SetStack',
	component: SetStack,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<div className="fit-app" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, overflow: 'hidden' }}>
					<Story />
				</div>
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SetStack>;

// 5 sets, starting fresh (none completed)
export const AllPending: Story = {
	args: {
		sets: [
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 0,
		onSetClick: action('setClick'),
	},
};

// 5 sets, 2 completed
export const PartiallyComplete: Story = {
	args: {
		sets: [
			{ weight: 80, reps: 10, rpe: 7, isCompleted: true },
			{ weight: 80, reps: 9, rpe: 8, isCompleted: true },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 2,
		onSetClick: action('setClick'),
	},
};

// 5 sets, 4 completed (last set next)
export const NearlyComplete: Story = {
	args: {
		sets: [
			{ weight: 80, reps: 10, rpe: 7, isCompleted: true },
			{ weight: 80, reps: 10, rpe: 7, isCompleted: true },
			{ weight: 80, reps: 9, rpe: 8, isCompleted: true },
			{ weight: 80, reps: 8, rpe: 8, isCompleted: true },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 4,
		onSetClick: action('setClick'),
	},
};

// With selected set
export const WithSelection: Story = {
	args: {
		sets: [
			{ weight: 80, reps: 10, rpe: 7, isCompleted: true },
			{ weight: 80, reps: 9, rpe: 8, isCompleted: true },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 2,
		selectedSetIndex: 1,
		onSetClick: action('setClick'),
	},
};

// With animating set (just completed)
export const WithAnimation: Story = {
	args: {
		sets: [
			{ weight: 80, reps: 10, rpe: 7, isCompleted: true },
			{ weight: 80, reps: 9, rpe: 8, isCompleted: true },
			{ weight: 80, reps: 10, rpe: 8, isCompleted: true },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
			{ weight: 80, reps: '8-10', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 3,
		animatingSetIndex: 2,
		onSetClick: action('setClick'),
	},
};

// Bodyweight exercise
export const Bodyweight: Story = {
	args: {
		sets: [
			{ weight: 0, reps: 12, rpe: 6, isCompleted: true },
			{ weight: 0, reps: 10, rpe: 7, isCompleted: true },
			{ weight: 0, reps: '8-12', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 2,
		onSetClick: action('setClick'),
	},
};

// Many sets (8 sets for scrolling test)
export const ManySets: Story = {
	args: {
		sets: [
			{ weight: 100, reps: 5, rpe: 7, isCompleted: true },
			{ weight: 100, reps: 5, rpe: 7, isCompleted: true },
			{ weight: 100, reps: 5, rpe: 8, isCompleted: true },
			{ weight: 100, reps: 5, rpe: 8, isCompleted: true },
			{ weight: 100, reps: '5', rpe: 8, isCompleted: false },
			{ weight: 100, reps: '5', rpe: 8, isCompleted: false },
			{ weight: 100, reps: '5', rpe: 8, isCompleted: false },
			{ weight: 100, reps: '5', rpe: 8, isCompleted: false },
		],
		currentSetIndex: 4,
		onSetClick: action('setClick'),
	},
};
