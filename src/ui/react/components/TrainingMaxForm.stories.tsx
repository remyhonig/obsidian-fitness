import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { TrainingMaxForm, TrainingMaxValue } from './TrainingMaxForm';

const meta: Meta<typeof TrainingMaxForm> = {
	title: 'Components/TrainingMaxForm',
	component: TrainingMaxForm,
	parameters: {
		layout: 'centered',
	},
	decorators: [
		(Story) => (
			<div style={{ width: '350px', padding: '20px', background: 'var(--background-primary)' }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof TrainingMaxForm>;

// Wrapper component to handle state
function TrainingMaxFormWrapper(props: {
	exercises: string[];
	initialValues?: Map<string, TrainingMaxValue>;
	defaultUnit?: 'kg' | 'lbs';
}) {
	const [values, setValues] = useState<Map<string, TrainingMaxValue>>(
		props.initialValues ?? new Map()
	);

	const handleChange = (exercise: string, value: number, unit: 'kg' | 'lbs') => {
		setValues((prev) => {
			const next = new Map(prev);
			next.set(exercise, { exercise, value, unit });
			return next;
		});
	};

	return (
		<TrainingMaxForm
			exercises={props.exercises}
			values={values}
			onChange={handleChange}
			defaultUnit={props.defaultUnit}
		/>
	);
}

export const Empty: Story = {
	render: () => (
		<TrainingMaxFormWrapper
			exercises={['Squat', 'Bench Press', 'Deadlift', 'Overhead Press']}
		/>
	),
};

export const WithValues: Story = {
	render: () => (
		<TrainingMaxFormWrapper
			exercises={['Squat', 'Bench Press', 'Deadlift', 'Overhead Press']}
			initialValues={
				new Map([
					['Squat', { exercise: 'Squat', value: 140, unit: 'kg' }],
					['Bench Press', { exercise: 'Bench Press', value: 100, unit: 'kg' }],
					['Deadlift', { exercise: 'Deadlift', value: 180, unit: 'kg' }],
					['Overhead Press', { exercise: 'Overhead Press', value: 60, unit: 'kg' }],
				])
			}
		/>
	),
};

export const WithPounds: Story = {
	render: () => (
		<TrainingMaxFormWrapper
			exercises={['Squat', 'Bench Press', 'Deadlift']}
			defaultUnit="lbs"
			initialValues={
				new Map([
					['Squat', { exercise: 'Squat', value: 315, unit: 'lbs' }],
					['Bench Press', { exercise: 'Bench Press', value: 225, unit: 'lbs' }],
					['Deadlift', { exercise: 'Deadlift', value: 405, unit: 'lbs' }],
				])
			}
		/>
	),
};

export const SingleExercise: Story = {
	render: () => (
		<TrainingMaxFormWrapper
			exercises={['Squat']}
			initialValues={new Map([['Squat', { exercise: 'Squat', value: 100, unit: 'kg' }]])}
		/>
	),
};

export const ManyExercises: Story = {
	render: () => (
		<TrainingMaxFormWrapper
			exercises={[
				'Squat',
				'Bench Press',
				'Deadlift',
				'Overhead Press',
				'Barbell Row',
				'Pull-ups',
				'Dips',
				'Leg Press',
			]}
		/>
	),
};
