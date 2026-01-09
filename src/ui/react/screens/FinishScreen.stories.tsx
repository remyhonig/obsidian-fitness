import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FinishScreen } from './FinishScreen';
import { withBottomNav } from './storyDecorators';

const meta: Meta<typeof FinishScreen> = {
	title: 'Screens/FinishScreen',
	component: FinishScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('workout')],
};

export default meta;
type Story = StoryObj<typeof FinishScreen>;

// Base session state for a completed workout
const completedSessionState = {
	isActive: false,
	id: '2024-01-15-upper-body',
	workout: 'Upper Body',
	programId: 'Simple Program',
	date: '2024-01-15',
	currentExerciseIndex: 2,
	currentSetIndex: 0,
	exercises: [
		{
			exercise: 'Bench Press',
			targetSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 10,
			targetWeight: 80,
			targetRPE: 8,
			restSeconds: 180,
			sets: [
				{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 7, timestamp: '2024-01-15T10:00:00Z' },
				{ exercise: 'Bench Press', setNumber: 2, reps: 9, weight: 80, rpe: 8, timestamp: '2024-01-15T10:03:00Z' },
				{ exercise: 'Bench Press', setNumber: 3, reps: 8, weight: 80, rpe: 9, timestamp: '2024-01-15T10:06:00Z' },
			],
			media: [],
			note: 'Keep shoulders retracted',
		},
		{
			exercise: 'Barbell Row',
			targetSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 10,
			targetWeight: 70,
			targetRPE: 8,
			restSeconds: 180,
			sets: [
				{ exercise: 'Barbell Row', setNumber: 1, reps: 10, weight: 70, rpe: 7, timestamp: '2024-01-15T10:09:00Z' },
				{ exercise: 'Barbell Row', setNumber: 2, reps: 10, weight: 70, rpe: 8, timestamp: '2024-01-15T10:12:00Z' },
				{ exercise: 'Barbell Row', setNumber: 3, reps: 9, weight: 70, rpe: 8, timestamp: '2024-01-15T10:15:00Z' },
			],
			media: [],
			note: null,
		},
		{
			exercise: 'Overhead Press',
			targetSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 10,
			targetWeight: 50,
			targetRPE: 8,
			restSeconds: 120,
			sets: [
				{ exercise: 'Overhead Press', setNumber: 1, reps: 10, weight: 50, rpe: 7, timestamp: '2024-01-15T10:18:00Z' },
				{ exercise: 'Overhead Press', setNumber: 2, reps: 9, weight: 50, rpe: 8, timestamp: '2024-01-15T10:21:00Z' },
				{ exercise: 'Overhead Press', setNumber: 3, reps: 8, weight: 50, rpe: 9, timestamp: '2024-01-15T10:24:00Z' },
			],
			media: [],
			note: null,
		},
	],
	startTime: '2024-01-15T10:00:00Z',
	endTime: '2024-01-15T10:45:00Z',
	status: 'completed',
	extraRestTime: 0,
	restStartTime: null,
};

export const CompletedWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
	},
};

export const ShortWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			...completedSessionState,
			id: '2024-01-15-quick',
			workout: 'Quick Session',
			exercises: [
				{
					exercise: 'Push-ups',
					targetSets: 3,
					targetRepsMin: 15,
					targetRepsMax: 20,
					targetWeight: 0,
					targetRPE: 7,
					restSeconds: 60,
					sets: [
						{ exercise: 'Push-ups', setNumber: 1, reps: 20, weight: 0, rpe: 6, timestamp: '2024-01-15T10:00:00Z' },
						{ exercise: 'Push-ups', setNumber: 2, reps: 18, weight: 0, rpe: 7, timestamp: '2024-01-15T10:02:00Z' },
						{ exercise: 'Push-ups', setNumber: 3, reps: 15, weight: 0, rpe: 8, timestamp: '2024-01-15T10:04:00Z' },
					],
					media: [],
					note: null,
				},
			],
			startTime: '2024-01-15T10:00:00Z',
			endTime: '2024-01-15T10:10:00Z',
		},
	},
};

export const HighVolumeWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			...completedSessionState,
			id: '2024-01-15-volume',
			workout: 'Volume Day',
			exercises: [
				{
					exercise: 'Squat',
					targetSets: 5,
					targetRepsMin: 5,
					targetRepsMax: 5,
					targetWeight: 120,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Squat', setNumber: 1, reps: 5, weight: 120, rpe: 7, timestamp: '2024-01-15T10:00:00Z' },
						{ exercise: 'Squat', setNumber: 2, reps: 5, weight: 120, rpe: 7, timestamp: '2024-01-15T10:04:00Z' },
						{ exercise: 'Squat', setNumber: 3, reps: 5, weight: 120, rpe: 8, timestamp: '2024-01-15T10:08:00Z' },
						{ exercise: 'Squat', setNumber: 4, reps: 5, weight: 120, rpe: 8, timestamp: '2024-01-15T10:12:00Z' },
						{ exercise: 'Squat', setNumber: 5, reps: 5, weight: 120, rpe: 9, timestamp: '2024-01-15T10:16:00Z' },
					],
					media: [],
					note: null,
				},
				{
					exercise: 'Bench Press',
					targetSets: 5,
					targetRepsMin: 5,
					targetRepsMax: 5,
					targetWeight: 100,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Bench Press', setNumber: 1, reps: 5, weight: 100, rpe: 7, timestamp: '2024-01-15T10:20:00Z' },
						{ exercise: 'Bench Press', setNumber: 2, reps: 5, weight: 100, rpe: 7, timestamp: '2024-01-15T10:24:00Z' },
						{ exercise: 'Bench Press', setNumber: 3, reps: 5, weight: 100, rpe: 8, timestamp: '2024-01-15T10:28:00Z' },
						{ exercise: 'Bench Press', setNumber: 4, reps: 5, weight: 100, rpe: 8, timestamp: '2024-01-15T10:32:00Z' },
						{ exercise: 'Bench Press', setNumber: 5, reps: 5, weight: 100, rpe: 9, timestamp: '2024-01-15T10:36:00Z' },
					],
					media: [],
					note: null,
				},
				{
					exercise: 'Deadlift',
					targetSets: 5,
					targetRepsMin: 5,
					targetRepsMax: 5,
					targetWeight: 140,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Deadlift', setNumber: 1, reps: 5, weight: 140, rpe: 7, timestamp: '2024-01-15T10:40:00Z' },
						{ exercise: 'Deadlift', setNumber: 2, reps: 5, weight: 140, rpe: 7, timestamp: '2024-01-15T10:44:00Z' },
						{ exercise: 'Deadlift', setNumber: 3, reps: 5, weight: 140, rpe: 8, timestamp: '2024-01-15T10:48:00Z' },
						{ exercise: 'Deadlift', setNumber: 4, reps: 5, weight: 140, rpe: 8, timestamp: '2024-01-15T10:52:00Z' },
						{ exercise: 'Deadlift', setNumber: 5, reps: 5, weight: 140, rpe: 9, timestamp: '2024-01-15T10:56:00Z' },
					],
					media: [],
					note: null,
				},
			],
			startTime: '2024-01-15T10:00:00Z',
			endTime: '2024-01-15T11:30:00Z',
		},
	},
};

export const BodyweightOnly: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			...completedSessionState,
			id: '2024-01-15-bodyweight',
			workout: 'Bodyweight Circuit',
			exercises: [
				{
					exercise: 'Push-ups',
					targetSets: 3,
					targetRepsMin: 15,
					targetRepsMax: 20,
					targetWeight: 0,
					targetRPE: 7,
					restSeconds: 60,
					sets: [
						{ exercise: 'Push-ups', setNumber: 1, reps: 20, weight: 0, rpe: 6, timestamp: '2024-01-15T10:00:00Z' },
						{ exercise: 'Push-ups', setNumber: 2, reps: 18, weight: 0, rpe: 7, timestamp: '2024-01-15T10:02:00Z' },
						{ exercise: 'Push-ups', setNumber: 3, reps: 15, weight: 0, rpe: 8, timestamp: '2024-01-15T10:04:00Z' },
					],
					media: [],
					note: null,
				},
				{
					exercise: 'Pull-ups',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 12,
					targetWeight: 0,
					targetRPE: 8,
					restSeconds: 90,
					sets: [
						{ exercise: 'Pull-ups', setNumber: 1, reps: 10, weight: 0, rpe: 7, timestamp: '2024-01-15T10:06:00Z' },
						{ exercise: 'Pull-ups', setNumber: 2, reps: 9, weight: 0, rpe: 8, timestamp: '2024-01-15T10:08:00Z' },
						{ exercise: 'Pull-ups', setNumber: 3, reps: 8, weight: 0, rpe: 9, timestamp: '2024-01-15T10:10:00Z' },
					],
					media: [],
					note: null,
				},
				{
					exercise: 'Squats',
					targetSets: 3,
					targetRepsMin: 20,
					targetRepsMax: 25,
					targetWeight: 0,
					targetRPE: 7,
					restSeconds: 60,
					sets: [
						{ exercise: 'Squats', setNumber: 1, reps: 25, weight: 0, rpe: 6, timestamp: '2024-01-15T10:12:00Z' },
						{ exercise: 'Squats', setNumber: 2, reps: 23, weight: 0, rpe: 7, timestamp: '2024-01-15T10:14:00Z' },
						{ exercise: 'Squats', setNumber: 3, reps: 20, weight: 0, rpe: 8, timestamp: '2024-01-15T10:16:00Z' },
					],
					media: [],
					note: null,
				},
			],
			startTime: '2024-01-15T10:00:00Z',
			endTime: '2024-01-15T10:25:00Z',
		},
	},
};
