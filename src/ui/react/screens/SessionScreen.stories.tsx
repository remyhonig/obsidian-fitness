import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { action } from '@storybook/addon-actions';
import { SessionScreen } from './SessionScreen';
import { withActiveSession } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';

const SAMPLE_PROGRAM = `# Simple Program

A simple program for testing.

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body

---

# Workouts

## Upper Body

Upper body focused workout.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s "Keep shoulders retracted"
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s

---

## Lower Body

Lower body focused workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s "Focus on depth"
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s
`;

const meta: Meta<typeof SessionScreen> = {
	title: 'Screens/SessionScreen',
	component: SessionScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('workout')],
};

export default meta;
type Story = StoryObj<typeof SessionScreen>;

export const ActiveWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [withActiveSession('Upper Body', SAMPLE_PROGRAM)],
};

export const MidWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 2,
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
						{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 7, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 9, weight: 80, rpe: 8, timestamp: new Date().toISOString() },
					],
					media: [
						{ type: 'image', url: 'https://picsum.photos/seed/bench/200/200', description: 'Bench Press' },
						{ type: 'youtube-video', url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', videoId: 'rT7DgCr-3pg', description: 'Bench Press Tutorial' }
					],
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
					sets: [],
					media: [{ type: 'image', url: 'https://picsum.photos/seed/row/200/200', description: 'Barbell Row' }],
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
					sets: [],
					media: [{ type: 'image', url: 'https://picsum.photos/seed/ohp/200/200', description: 'Overhead Press' }],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: Date.now() - 60 * 1000, // 1 minute ago
		},
	},
};

export const LastSetOfExercise: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 3,
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
						{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 7, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 9, weight: 80, rpe: 8, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 3, reps: 8, weight: 80, rpe: 9, timestamp: new Date().toISOString() },
					],
					media: [],
					note: 'Keep shoulders retracted',
				},
			],
			startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: Date.now() - 30 * 1000,
		},
	},
};

export const NoActiveSession: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: false,
			id: null,
			workout: null,
			programId: null,
			date: null,
			currentExerciseIndex: 0,
			currentSetIndex: 0,
			exercises: [],
			startTime: null,
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null,
		},
	},
};

export const ExerciseComplete: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 3,
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
						{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 7, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 9, weight: 80, rpe: 8, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 3, reps: 8, weight: 80, rpe: 9, timestamp: new Date().toISOString() },
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
					sets: [],
					media: [],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null,
		},
		initialExerciseSummary: {
			exerciseName: 'Bench Press',
			exerciseIndex: 0,
			completedSets: [
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 9, weight: 80, rpe: 8 },
				{ reps: 8, weight: 80, rpe: 9 },
			],
			nextTarget: { sets: 3, reps: '8-10', weight: '80kg', rpe: 8 },
			adjustment: null,
		},
	},
};

export const ExerciseCompleteWithCoachTip: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 3,
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
						{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 6, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 10, weight: 80, rpe: 6, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 3, reps: 10, weight: 80, rpe: 7, timestamp: new Date().toISOString() },
					],
					media: [{ type: 'image', url: 'https://picsum.photos/seed/bench/200/200', description: 'Bench Press' }],
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
					sets: [],
					media: [{ type: 'image', url: 'https://picsum.photos/seed/row/200/200', description: 'Barbell Row' }],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null,
		},
		initialExerciseSummary: {
			exerciseName: 'Bench Press',
			exerciseIndex: 0,
			completedSets: [
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 7 },
			],
			nextTarget: { sets: 3, reps: '8-10', weight: '82.5kg', rpe: 8 },
			adjustment: {
				change: '+2.5kg next session',
				reason: 'Great performance! RPE was below target across all sets.',
			},
		},
	},
};

export const ExerciseCompleteWithDownAdjustment: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 3,
			exercises: [
				{
					exercise: 'Bench Press',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					targetWeight: 85,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Bench Press', setNumber: 1, reps: 6, weight: 85, rpe: 10, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 5, weight: 85, rpe: 10, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 3, reps: 4, weight: 85, rpe: 10, timestamp: new Date().toISOString() },
					],
					media: [
						{ type: 'image', url: 'https://picsum.photos/seed/bench/200/200', description: 'Bench Press' },
						{ type: 'youtube-video', url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', videoId: 'rT7DgCr-3pg', description: 'Bench Press Tutorial' }
					],
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
					sets: [],
					media: [{ type: 'image', url: 'https://picsum.photos/seed/row/200/200', description: 'Barbell Row' }],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null,
		},
		initialExerciseSummary: {
			exerciseName: 'Bench Press',
			exerciseIndex: 0,
			completedSets: [
				{ reps: 6, weight: 85, rpe: 10 },
				{ reps: 5, weight: 85, rpe: 10 },
				{ reps: 4, weight: 85, rpe: 10 },
			],
			nextTarget: { sets: 3, reps: '8-10', weight: '80kg', rpe: 8 },
			adjustment: {
				change: '-5kg next session',
				reason: 'RPE was too high. Reducing weight to stay in the target range.',
			},
		},
	},
};

// Post-set question stories - shows the input flow after marking a set as done

const POST_SET_SESSION_STATE = {
	isActive: true,
	id: 'test-session',
	workout: 'Upper Body',
	programId: null,
	date: new Date().toISOString().split('T')[0],
	currentExerciseIndex: 0,
	currentSetIndex: 1,
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
				{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 7, timestamp: new Date().toISOString() },
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
			sets: [],
			media: [],
			note: null,
		},
	],
	startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
	endTime: null,
	status: 'active',
	extraRestTime: 0,
	restStartTime: Date.now() - 30 * 1000,
};

export const PostSetRepsQuestion: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: POST_SET_SESSION_STATE,
		initialDetailInputMode: 'reps',
		initialPendingSet: { reps: null, rpe: null, weight: 80 },
	},
};

export const PostSetRPEQuestion: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: POST_SET_SESSION_STATE,
		initialDetailInputMode: 'rpe',
		initialPendingSet: { reps: 9, rpe: null, weight: 80 },
	},
};

export const PostSetWeightConfirm: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: POST_SET_SESSION_STATE,
		initialDetailInputMode: 'weight',
		initialPendingSet: { reps: 9, rpe: 8, weight: 80 },
	},
};

// Story to test coach tip animation with rule progress
export const CoachTipWithRuleProgress: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 3,
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
						{ exercise: 'Bench Press', setNumber: 1, reps: 10, weight: 80, rpe: 6, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 10, weight: 80, rpe: 6, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 3, reps: 10, weight: 80, rpe: 6, timestamp: new Date().toISOString() },
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
					sets: [],
					media: [],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null,
		},
		initialExerciseSummary: {
			exerciseName: 'Bench Press',
			exerciseIndex: 0,
			completedSets: [
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 6 },
			],
			nextTarget: { sets: 3, reps: '8-10', weight: '82.5kg', rpe: 8 },
			adjustment: {
				change: '+2.5kg',
				reason: 'all sets hit max reps with low RPE',
				timing: 'next_session',
			},
			ruleProgress: {
				rules: [
					{
						ruleDescription: 'increase weight by 2.5kg',
						timing: 'next_session',
						currentlyMet: true,
						progress: { current: 2, required: 2, unit: 'sessions' as const },
					},
				],
			},
			streakBroken: null,
		},
	},
};

// Story to test streak broken animation
export const CoachTipStreakBroken: Story = {
	args: {
		onNavigate: action('navigate'),
		sessionState: {
			isActive: true,
			id: 'test-session',
			workout: 'Upper Body',
			programId: null,
			date: new Date().toISOString().split('T')[0],
			currentExerciseIndex: 0,
			currentSetIndex: 3,
			exercises: [
				{
					exercise: 'Bench Press',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					targetWeight: 85,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Bench Press', setNumber: 1, reps: 6, weight: 85, rpe: 10, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 2, reps: 5, weight: 85, rpe: 10, timestamp: new Date().toISOString() },
						{ exercise: 'Bench Press', setNumber: 3, reps: 4, weight: 85, rpe: 10, timestamp: new Date().toISOString() },
					],
					media: [],
					note: null,
				},
				{
					exercise: 'Barbell Row',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					targetWeight: 70,
					targetRPE: 8,
					restSeconds: 180,
					sets: [],
					media: [],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			restStartTime: null,
		},
		initialExerciseSummary: {
			exerciseName: 'Bench Press',
			exerciseIndex: 0,
			completedSets: [
				{ reps: 6, weight: 85, rpe: 10 },
				{ reps: 5, weight: 85, rpe: 10 },
				{ reps: 4, weight: 85, rpe: 10 },
			],
			nextTarget: { sets: 3, reps: '8-10', weight: '80kg', rpe: 8 },
			adjustment: null,
			ruleProgress: {
				rules: [
					{
						ruleDescription: 'increase weight by 2.5kg',
						timing: 'next_session',
						currentlyMet: false,
						progress: { current: 0, required: 2, unit: 'sessions' as const },
					},
				],
			},
			streakBroken: {
				wasBroken: true,
				previousStreak: 3,
				ruleDescription: 'increase weight by 2.5kg',
			},
		},
	},
};
