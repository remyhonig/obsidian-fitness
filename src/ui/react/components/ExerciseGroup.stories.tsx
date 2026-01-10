import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ExerciseGroup } from './ExerciseGroup';

const meta: Meta<typeof ExerciseGroup> = {
	title: 'Components/ExerciseGroup',
	component: ExerciseGroup,
	parameters: {
		layout: 'centered',
	},
	argTypes: {
		width: {
			control: { type: 'range', min: 150, max: 400, step: 10 },
			description: 'Width of the card in pixels',
		},
		variant: {
			control: 'select',
			options: ['pending', 'next', 'done'],
			description: 'Visual state of the group',
		},
	},
	decorators: [
		(Story) => (
			<div style={{ padding: '20px', background: 'var(--background-primary)', minWidth: '300px' }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ExerciseGroup>;

export const Default: Story = {
	args: {
		exerciseName: 'Bench Press',
		width: 280,
		variant: 'next',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 80, reps: 10, rpe: 7, variant: 'done', result: 'good', onClick: action('set-1-click') },
			{ weight: 80, reps: 9, rpe: 8, variant: 'done', result: 'ok', onClick: action('set-2-click') },
			{ weight: 80, reps: '8-10', rpe: 8, variant: 'next', onClick: action('set-3-click') },
		],
	},
};

export const Pending: Story = {
	args: {
		exerciseName: 'Overhead Press',
		width: 280,
		variant: 'pending',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 50, reps: '8-10', rpe: 7, variant: 'pending' },
			{ weight: 50, reps: '8-10', rpe: 8, variant: 'pending' },
			{ weight: 50, reps: '8-10', rpe: 8, variant: 'pending' },
		],
	},
};

export const Next: Story = {
	args: {
		exerciseName: 'Bench Press',
		width: 280,
		variant: 'next',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 80, reps: 10, rpe: 7, variant: 'done', result: 'good' },
			{ weight: 80, reps: '8-10', rpe: 8, variant: 'next' },
			{ weight: 80, reps: '8-10', rpe: 8, variant: 'pending' },
		],
	},
};

export const Done: Story = {
	args: {
		exerciseName: 'Squat',
		width: 280,
		variant: 'done',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 100, reps: 5, rpe: 7, variant: 'done', result: 'good' },
			{ weight: 100, reps: 5, rpe: 8, variant: 'done', result: 'good' },
			{ weight: 100, reps: 5, rpe: 9, variant: 'done', result: 'good' },
		],
	},
};

export const AllDone: Story = {
	args: {
		exerciseName: 'Squat',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 100, reps: 5, rpe: 7, variant: 'done', result: 'good' },
			{ weight: 100, reps: 5, rpe: 8, variant: 'done', result: 'good' },
			{ weight: 100, reps: 4, rpe: 9, variant: 'done', result: 'bad' },
		],
	},
};

export const AllPending: Story = {
	args: {
		exerciseName: 'Deadlift',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 120, reps: '5', rpe: 8, variant: 'next' },
			{ weight: 120, reps: '5', rpe: 8, variant: 'pending' },
			{ weight: 120, reps: '5', rpe: 8, variant: 'pending' },
		],
	},
};

export const Bodyweight: Story = {
	args: {
		exerciseName: 'Pull-ups',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 0, reps: 8, rpe: 7, variant: 'done', result: 'good' },
			{ weight: 0, reps: 7, rpe: 8, variant: 'done', result: 'ok' },
			{ weight: 0, reps: '6-8', rpe: 8, variant: 'next' },
			{ weight: 0, reps: '6-8', rpe: 8, variant: 'pending' },
		],
	},
};

export const MixedResults: Story = {
	args: {
		exerciseName: 'Romanian Deadlift',
		onInfoClick: action('info-click'),
		sets: [
			{ weight: 80, reps: 10, rpe: 7, variant: 'done', result: 'good' },
			{ weight: 80, reps: 9, rpe: 8, variant: 'done', result: 'ok' },
			{ weight: 80, reps: 6, rpe: 10, variant: 'done', result: 'bad' },
		],
	},
};

// All three group variants side by side
export const VariantComparison: Story = {
	render: () => (
		<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
			<ExerciseGroup
				exerciseName="Pending"
				variant="pending"
				width={200}
				sets={[
					{ weight: 60, reps: '8-10', rpe: 7, variant: 'pending' },
					{ weight: 60, reps: '8-10', rpe: 8, variant: 'pending' },
				]}
			/>
			<ExerciseGroup
				exerciseName="Next"
				variant="next"
				width={200}
				sets={[
					{ weight: 80, reps: 10, rpe: 7, variant: 'done', result: 'good' },
					{ weight: 80, reps: '8-10', rpe: 8, variant: 'next' },
				]}
			/>
			<ExerciseGroup
				exerciseName="Done"
				variant="done"
				width={200}
				sets={[
					{ weight: 100, reps: 5, rpe: 7, variant: 'done', result: 'good' },
					{ weight: 100, reps: 5, rpe: 8, variant: 'done', result: 'good' },
				]}
			/>
		</div>
	),
};
