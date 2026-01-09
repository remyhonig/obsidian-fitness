import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ProgramSetupScreen } from './ProgramSetupScreen';

// Program with training maxes
const PROGRAM_WITH_TMS = `# Strength Program

A comprehensive strength training program with training maxes.

---

# Progression

## Training Maxes

- Squat TM: 100kg
- Bench Press TM: 80kg
- Deadlift TM: 120kg
- Overhead Press TM: 50kg

---

# Schedule

## Weekly Pattern

- Monday: Squat Day
- Wednesday: Bench Day
- Friday: Deadlift Day

---

# Workouts

## Squat Day

Heavy squat day with assistance.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s
- Romanian Deadlift: 3x10 @ 60kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s

---

## Bench Day

Heavy bench day with assistance.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s
- Overhead Press: 3x8 @ 70% TM RPE 7, rest 120s
- Tricep Pushdown: 3x12-15 @ 25kg RPE 7, rest 60s

---

## Deadlift Day

Heavy deadlift day with assistance.

- Deadlift: 3x5 @ 85% TM RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 7, rest 120s
- Lat Pulldown: 3x10-12 @ 60kg RPE 7, rest 90s
`;

// Simple program without training maxes
const SIMPLE_PROGRAM = `# Simple Workout

A simple program without training maxes.

---

# Schedule

## Weekly Pattern

- Monday: Full Body

---

# Workouts

## Full Body

A complete full body workout.

- Push-ups: 3x15-20 @ BW RPE 7, rest 60s
- Squats: 3x15-20 @ BW RPE 7, rest 60s
- Pull-ups: 3x8-12 @ BW RPE 8, rest 90s
- Lunges: 3x12 @ BW RPE 7, rest 60s
`;

// 5/3/1 style program
const FIVE_THREE_ONE = `# 5/3/1 Forever

Jim Wendler's 5/3/1 program variation.
This program uses a training max approach where you work with 85-90% of your true 1RM.

---

# Progression

## Training Maxes

- Squat TM: 150kg
- Bench Press TM: 100kg
- Deadlift TM: 180kg
- Overhead Press TM: 65kg

---

# Schedule

## Weekly Pattern

- Monday: Squat
- Tuesday: Bench
- Thursday: Deadlift
- Friday: Press

---

# Workouts

## Squat

Main squat movement with accessories.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s
- Front Squat: 3x8 @ 60% TM RPE 7, rest 120s
- Leg Curl: 3x12-15 @ 50kg RPE 7, rest 60s

---

## Bench

Main bench movement with accessories.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s
- Close Grip Bench: 3x8 @ 70% TM RPE 7, rest 120s
- Dumbbell Row: 3x10-12 @ 35kg RPE 7, rest 90s

---

## Deadlift

Main deadlift movement with accessories.

- Deadlift: 3x5 @ 85% TM RPE 8, rest 180s
- Good Morning: 3x10 @ 60kg RPE 7, rest 120s
- Ab Wheel: 3x10-15 @ BW RPE 8, rest 60s

---

## Press

Main overhead press with accessories.

- Overhead Press: 3x5 @ 85% TM RPE 8, rest 180s
- Dumbbell Press: 3x10-12 @ 25kg RPE 7, rest 90s
- Lateral Raise: 3x12-15 @ 10kg RPE 7, rest 60s
`;

const meta: Meta<typeof ProgramSetupScreen> = {
	title: 'Screens/ProgramSetupScreen',
	component: ProgramSetupScreen,
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof ProgramSetupScreen>;

export const WithTrainingMaxes: Story = {
	args: {
		programPath: 'Fitness/Programs/Strength.md',
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/Strength.md': PROGRAM_WITH_TMS,
		},
	},
};

export const SimpleProgram: Story = {
	args: {
		programPath: 'Fitness/Programs/Simple.md',
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/Simple.md': SIMPLE_PROGRAM,
		},
	},
};

export const FiveThreeOne: Story = {
	args: {
		programPath: 'Fitness/Programs/531.md',
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/531.md': FIVE_THREE_ONE,
		},
	},
};

export const FileNotFound: Story = {
	args: {
		programPath: 'Fitness/Programs/NonExistent.md',
		onNavigate: action('navigate'),
		files: {},
	},
};
