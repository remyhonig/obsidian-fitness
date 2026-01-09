import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { action } from '@storybook/addon-actions';
import { SessionScreen } from './SessionScreen';
import { withActiveSession } from '../../../storybook/decorators/providers';

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
				{
					exercise: 'Overhead Press',
					targetSets: 3,
					targetRepsMin: 8,
					targetRepsMax: 10,
					targetWeight: 50,
					targetRPE: 8,
					restSeconds: 120,
					sets: [],
					media: [],
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
