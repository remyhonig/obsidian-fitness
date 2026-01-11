import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FinishScreen, type FinishScreenProps } from './FinishScreen';
import { withProviders, type StoryArgs } from '../../../storybook/decorators/providers';
import {
	createMockRuleProgress,
	createMockExerciseRuleProgress,
} from '../../../storybook/mocks/domain-mock';

const meta: Meta<typeof FinishScreen> = {
	title: 'Screens/FinishScreen',
	component: FinishScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withProviders],
};

export default meta;

/** Story type that includes both component props and decorator args */
type Story = StoryObj<FinishScreenProps & StoryArgs>;

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

/**
 * Default completed workout without any rule progress or triggered rules.
 */
export const CompletedWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
	},
};

/**
 * Workout with streaks building towards progression.
 * Shows the 🔥 streaks section.
 */
export const WithStreaks: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
		exerciseCompletions: {
			'Bench Press': {
				ruleProgress: createMockExerciseRuleProgress([
					createMockRuleProgress({
						ruleSource: 'if reps >= max AND rpe < 8 for 2 sessions: +2.5kg',
						ruleDescription: 'Increase weight when consistently hitting max reps',
						currentlyMet: true,
						progress: { current: 1, required: 2, unit: 'sessions' },
						effect: '+2.5kg',
					}),
				]),
			},
			'Barbell Row': {
				ruleProgress: createMockExerciseRuleProgress([
					createMockRuleProgress({
						ruleSource: 'if reps >= max for 3 sessions: +2.5kg',
						ruleDescription: 'Progressive overload',
						currentlyMet: true,
						progress: { current: 2, required: 3, unit: 'sessions' },
						effect: '+2.5kg',
					}),
				]),
			},
		},
	},
};

/**
 * Workout where a progression rule triggered.
 * Shows the ⬆️ next session section.
 */
export const WithTriggeredRule: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
		exerciseCompletions: {
			'Bench Press': {
				adjustment: {
					change: '+2.5kg',
					reason: 'Completed 3x10 with RPE under target',
					timing: 'next_session',
				},
			},
		},
	},
};

/**
 * Workout with both streaks and triggered rules.
 * Shows both sections together.
 */
export const WithStreaksAndTriggeredRules: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
		exerciseCompletions: {
			'Bench Press': {
				adjustment: {
					change: '+2.5kg',
					reason: 'Hit max reps for 2 consecutive sessions',
					timing: 'next_session',
				},
			},
			'Barbell Row': {
				ruleProgress: createMockExerciseRuleProgress([
					createMockRuleProgress({
						ruleSource: 'if reps >= max for 3 sessions: +2.5kg',
						ruleDescription: 'Progressive overload',
						currentlyMet: true,
						progress: { current: 2, required: 3, unit: 'sessions' },
						effect: '+2.5kg',
					}),
				]),
			},
			'Overhead Press': {
				adjustment: {
					change: '-2.5kg (deload)',
					reason: 'Failed to hit minimum reps for 3 sessions',
					timing: 'next_session',
				},
			},
		},
	},
};

/**
 * Short bodyweight workout.
 * Shows minimal stats without volume.
 */
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

/**
 * High volume workout with heavy weights.
 * Shows large volume numbers in compact format (e.g. "10.5k kg").
 */
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

/**
 * Bodyweight-only workout.
 * No weight stats shown for individual exercises.
 */
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

/**
 * Multiple streaks close to triggering.
 * Shows an exciting moment where user is building multiple streaks.
 */
export const MultipleStreaksClosing: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
		exerciseCompletions: {
			'Bench Press': {
				ruleProgress: createMockExerciseRuleProgress([
					createMockRuleProgress({
						ruleSource: 'if reps >= max AND rpe < 8 for 2 sessions: +2.5kg',
						ruleDescription: 'Weight increase',
						currentlyMet: true,
						progress: { current: 1, required: 2, unit: 'sessions' },
						effect: '+2.5kg',
					}),
				]),
			},
			'Barbell Row': {
				ruleProgress: createMockExerciseRuleProgress([
					createMockRuleProgress({
						ruleSource: 'if reps >= max for 3 sessions: +2.5kg',
						ruleDescription: 'Progressive overload',
						currentlyMet: true,
						progress: { current: 2, required: 3, unit: 'sessions' },
						effect: '+2.5kg',
					}),
				]),
			},
			'Overhead Press': {
				ruleProgress: createMockExerciseRuleProgress([
					createMockRuleProgress({
						ruleSource: 'if reps >= max for 2 sessions: +1.25kg',
						ruleDescription: 'Slow progression',
						currentlyMet: true,
						progress: { current: 1, required: 2, unit: 'sessions' },
						effect: '+1.25kg',
					}),
				]),
			},
		},
	},
};

/**
 * Workout with multiple exercises triggering different rules.
 * Shows variety of progression types.
 */
export const MultipleTriggeredRules: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: completedSessionState,
		exerciseCompletions: {
			'Bench Press': {
				adjustment: {
					change: '+2.5kg',
					reason: 'Hit 3x10 with good RPE for 2 sessions',
					timing: 'next_session',
				},
			},
			'Barbell Row': {
				adjustment: {
					change: '+2.5kg',
					reason: 'Topped out at max reps for 3 sessions',
					timing: 'next_session',
				},
			},
			'Overhead Press': {
				adjustment: {
					change: '+1 set',
					reason: 'Easy RPE progression',
					timing: 'next_session',
				},
			},
		},
	},
};
