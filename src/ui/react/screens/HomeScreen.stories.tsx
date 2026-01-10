import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { HomeScreen } from './HomeScreen';
import { withProviders } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';

// Note: Welcome screen is now a separate component (WelcomeScreen)

const SAMPLE_PROGRAM = `# Jim Wendler's 5/3/1

The classic strength program focusing on the big 4 lifts with progressive overload.

---

# Progression

## Training Maxes

- Squat TM: 120kg
- Bench Press TM: 85kg
- Deadlift TM: 150kg
- Overhead Press TM: 55kg

---

# Schedule

## Weekly Pattern

- Monday: Squat Day
- Tuesday: Bench Day
- Thursday: Deadlift Day
- Friday: OHP Day

---

# Workouts

## Squat Day

Main squat work.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s

---

## Bench Day

Bench press focus.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s

---

## Deadlift Day

Deadlift work.

- Deadlift: 3x5 @ 85% TM RPE 8, rest 180s

---

## OHP Day

Overhead press work.

- Overhead Press: 3x5 @ 85% TM RPE 8, rest 180s
`;

const CYCLE_PROGRAM = `# Push Pull Legs

A classic 6-day split for building muscle with optimal recovery between sessions.

---

# Schedule

## Cycle Pattern

- Push, recovery 24h
- Pull, recovery 24h
- Legs, recovery 48h

---

# Workouts

## Push

Chest, shoulders, and triceps.

- Bench Press: 4x8-10 @ 80kg RPE 8, rest 120s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 90s

---

## Pull

Back and biceps.

- Barbell Row: 4x8-10 @ 70kg RPE 8, rest 120s
- Pull Ups: 3x8-10 @ bodyweight RPE 8, rest 90s

---

## Legs

Quads, hamstrings, and glutes.

- Squat: 4x6-8 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
`;

const meta: Meta<typeof HomeScreen> = {
	title: 'Screens/HomeScreen',
	component: HomeScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withProviders, withBottomNav('home')],
};

export default meta;
type Story = StoryObj<typeof HomeScreen>;

/**
 * Default - the main home screen shown when user
 * has already chosen and loaded a program. Shows program info,
 * next workout, and weekly schedule.
 */
export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: SAMPLE_PROGRAM,
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
	},
};

/**
 * With Cycle Schedule - shows a program using cycle pattern
 * instead of weekly pattern (e.g., Push/Pull/Legs rotation).
 */
export const WithCycleSchedule: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: CYCLE_PROGRAM,
		files: {
			'Fitness/Programs/PPL.md': CYCLE_PROGRAM,
		},
	},
};

/**
 * Active Session with Rest Countdown - home screen during
 * an active workout session while resting between sets.
 * Shows countdown timer in the header.
 */
export const WithRestCountdown: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: SAMPLE_PROGRAM,
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
		sessionState: {
			isActive: true,
			id: '2024-01-15-squat-day',
			workout: 'Squat Day',
			programId: "Jim Wendler's 5/3/1",
			date: '2024-01-15',
			currentExerciseIndex: 0,
			currentSetIndex: 1,
			exercises: [
				{
					exercise: 'Squat',
					targetSets: 3,
					targetRepsMin: 5,
					targetRepsMax: 5,
					targetWeight: 102,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Squat', setNumber: 1, reps: 5, weight: 102, rpe: 7, timestamp: new Date().toISOString() },
					],
					media: [],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			// Rest started 90 seconds ago (90 seconds remaining of 180s rest)
			restStartTime: Date.now() - 90 * 1000,
		},
	},
	// Uses global withProviders which reads sessionState from args
};

/**
 * Active Session with Rest Complete - home screen during
 * an active workout session when rest time has elapsed.
 * Shows count-up timer indicating user is ready for next set.
 */
export const WithRestComplete: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: SAMPLE_PROGRAM,
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
		sessionState: {
			isActive: true,
			id: '2024-01-15-squat-day',
			workout: 'Squat Day',
			programId: "Jim Wendler's 5/3/1",
			date: '2024-01-15',
			currentExerciseIndex: 0,
			currentSetIndex: 2,
			exercises: [
				{
					exercise: 'Squat',
					targetSets: 3,
					targetRepsMin: 5,
					targetRepsMax: 5,
					targetWeight: 102,
					targetRPE: 8,
					restSeconds: 180,
					sets: [
						{ exercise: 'Squat', setNumber: 1, reps: 5, weight: 102, rpe: 7, timestamp: new Date().toISOString() },
						{ exercise: 'Squat', setNumber: 2, reps: 5, weight: 102, rpe: 8, timestamp: new Date().toISOString() },
					],
					media: [],
					note: null,
				},
			],
			startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
			endTime: null,
			status: 'active',
			extraRestTime: 0,
			// Rest started 210 seconds ago (30 seconds overage after 180s rest)
			restStartTime: Date.now() - 210 * 1000,
		},
	},
	// Uses global withProviders which reads sessionState from args
};
