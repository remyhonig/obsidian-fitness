import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SetCard } from './SetCard';

const meta: Meta<typeof SetCard> = {
	title: 'Components/SetCard',
	component: SetCard,
	parameters: {
		layout: 'centered',
	},
	decorators: [
		(Story) => (
			<div style={{ padding: '20px', background: 'var(--background-primary)' }}>
				<Story />
			</div>
		),
	],
	argTypes: {
		variant: {
			control: 'select',
			options: ['done', 'next', 'pending'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof SetCard>;

export const Done: Story = {
	args: {
		weight: 80,
		reps: 10,
		rpe: 8,
		variant: 'done',
		onClick: action('onClick'),
	},
};

export const Next: Story = {
	args: {
		weight: 80,
		reps: '8-10',
		rpe: 8,
		variant: 'next',
		onClick: action('onClick'),
	},
};

export const Pending: Story = {
	args: {
		weight: 80,
		reps: '8-10',
		rpe: 8,
		variant: 'pending',
		onClick: action('onClick'),
	},
};

export const Selected: Story = {
	args: {
		weight: 80,
		reps: 10,
		rpe: 8,
		variant: 'done',
		isSelected: true,
		onClick: action('onClick'),
	},
};

export const Animating: Story = {
	args: {
		weight: 80,
		reps: 10,
		rpe: 8,
		variant: 'done',
		isAnimating: true,
		onClick: action('onClick'),
	},
};

export const Bodyweight: Story = {
	args: {
		weight: 0,
		reps: 12,
		rpe: 7,
		variant: 'done',
		onClick: action('onClick'),
	},
};

export const HighWeight: Story = {
	args: {
		weight: 150,
		reps: 5,
		rpe: 9,
		variant: 'done',
		onClick: action('onClick'),
	},
};

export const AMRAP: Story = {
	args: {
		weight: 60,
		reps: 'AMRAP',
		rpe: 10,
		variant: 'next',
		onClick: action('onClick'),
	},
};

// Multiple cards in a row to show how they look together
export const SetRow: Story = {
	render: () => (
		<div style={{ display: 'flex', gap: '8px' }}>
			<SetCard weight={80} reps={10} rpe={8} variant="done" />
			<SetCard weight={80} reps={9} rpe={8} variant="done" />
			<SetCard weight={80} reps="8-10" rpe={8} variant="next" />
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
			<SetCard weight={80} reps={10} rpe={8} variant="done" />
			<SetCard weight={80} reps={9} rpe={8} variant="done" isSelected />
			<SetCard weight={80} reps="8-10" rpe={8} variant="next" />
			<SetCard weight={80} reps="8-10" rpe={8} variant="pending" />
			<SetCard weight={0} reps={15} rpe={7} variant="done" />
		</div>
	),
};
