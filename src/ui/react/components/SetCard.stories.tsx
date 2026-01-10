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

// Cards with exercise name header
export const WithExerciseName: Story = {
	args: {
		weight: 80,
		reps: 10,
		rpe: 8,
		variant: 'done',
		exerciseName: 'Bench Press',
		showExerciseName: true,
		onClick: action('onClick'),
	},
};

export const WithExerciseNameNext: Story = {
	args: {
		weight: 70,
		reps: '8-10',
		rpe: 8,
		variant: 'next',
		exerciseName: 'Barbell Row',
		showExerciseName: true,
		onClick: action('onClick'),
	},
};

export const WithLongExerciseName: Story = {
	args: {
		weight: 100,
		reps: 5,
		rpe: 9,
		variant: 'done',
		exerciseName: 'Romanian Deadlift',
		showExerciseName: true,
		onClick: action('onClick'),
	},
};

// Superset preview - mixed exercises in a row
export const MixedExerciseRow: Story = {
	render: () => (
		<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
			<SetCard weight={80} reps={10} rpe={8} variant="done" exerciseName="Bench Press" showExerciseName />
			<SetCard weight={70} reps={10} rpe={7} variant="done" exerciseName="Barbell Row" showExerciseName />
			<SetCard weight={80} reps={9} rpe={8} variant="done" exerciseName="Bench Press" showExerciseName />
			<SetCard weight={70} reps={9} rpe={8} variant="done" exerciseName="Barbell Row" showExerciseName />
			<SetCard weight={80} reps="8-10" rpe={8} variant="next" exerciseName="Bench Press" showExerciseName />
			<SetCard weight={70} reps="8-10" rpe={8} variant="pending" exerciseName="Barbell Row" showExerciseName />
		</div>
	),
};

// Superset round layout preview
export const SupersetRounds: Story = {
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
			<div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Round 1</div>
			<div style={{ display: 'flex', gap: '8px' }}>
				<SetCard weight={80} reps={10} rpe={8} variant="done" exerciseName="Bench Press" showExerciseName />
				<SetCard weight={70} reps={10} rpe={7} variant="done" exerciseName="Barbell Row" showExerciseName />
			</div>
			<div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Round 2</div>
			<div style={{ display: 'flex', gap: '8px' }}>
				<SetCard weight={80} reps={9} rpe={8} variant="done" exerciseName="Bench Press" showExerciseName />
				<SetCard weight={70} reps={9} rpe={8} variant="done" exerciseName="Barbell Row" showExerciseName />
			</div>
			<div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Round 3</div>
			<div style={{ display: 'flex', gap: '8px' }}>
				<SetCard weight={80} reps="8-10" rpe={8} variant="next" exerciseName="Bench Press" showExerciseName />
				<SetCard weight={70} reps="8-10" rpe={8} variant="pending" exerciseName="Barbell Row" showExerciseName />
			</div>
		</div>
	),
};
