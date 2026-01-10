import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ProgramPickerScreen } from './ProgramPickerScreen';
import { withBottomNav } from './storyDecorators';

const SAMPLE_PROGRAM = `# Jim Wendler's 5/3/1

The classic strength program focusing on the big 4 lifts.

## Training Maxes

- Squat TM: 120kg
- Bench Press TM: 85kg
- Deadlift TM: 150kg
- Overhead Press TM: 55kg

## Schedule

### Cycle Pattern
1. Squat Day -> 48h recovery
2. Bench Day -> 48h recovery
3. Deadlift Day -> 48h recovery
4. OHP Day -> 72h recovery

## Workouts

### Squat Day
Main squat work.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s

### Bench Day
Bench press focus.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s

### Deadlift Day
Deadlift work.

- Deadlift: 3x5 @ 85% TM RPE 8, rest 180s

### OHP Day
Overhead press work.

- Overhead Press: 3x5 @ 85% TM RPE 8, rest 180s
`;

const STRONGLIFTS_PROGRAM = `# StrongLifts 5x5

Simple and effective beginner program focusing on compound lifts.

## Schedule

### Weekly Schedule
- Monday: Workout A
- Wednesday: Workout B
- Friday: Workout A

## Workouts

### Workout A
Squat, bench, row.

- Squat: 5x5 @ 100kg RPE 8, rest 180s
- Bench Press: 5x5 @ 80kg RPE 8, rest 180s
- Barbell Row: 5x5 @ 70kg RPE 8, rest 180s

### Workout B
Squat, press, deadlift.

- Squat: 5x5 @ 100kg RPE 8, rest 180s
- Overhead Press: 5x5 @ 50kg RPE 8, rest 180s
- Deadlift: 1x5 @ 120kg RPE 8, rest 180s
`;

const PUSH_PULL_LEGS = `# Push Pull Legs

A classic 6-day split for intermediate lifters.

## Schedule

### Weekly Schedule
- Monday: Push
- Tuesday: Pull
- Wednesday: Legs
- Thursday: Push
- Friday: Pull
- Saturday: Legs

## Workouts

### Push
Chest, shoulders, triceps.

- Bench Press: 4x8-10 @ 80kg RPE 8, rest 120s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s
- Dips: 3x10-12 @ bodyweight RPE 7, rest 90s

### Pull
Back, biceps, rear delts.

- Barbell Row: 4x8-10 @ 70kg RPE 8, rest 120s
- Pull Ups: 3x8-10 @ bodyweight RPE 8, rest 90s
- Face Pulls: 3x15-20 @ 15kg RPE 7, rest 60s

### Legs
Quads, hamstrings, glutes, calves.

- Squat: 4x6-8 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s
`;

const meta: Meta<typeof ProgramPickerScreen> = {
	title: 'Screens/ProgramPickerScreen',
	component: ProgramPickerScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('home')],
};

export default meta;
type Story = StoryObj<typeof ProgramPickerScreen>;

/**
 * Multiple programs available - shows a list of programs
 * for the user to choose from.
 */
export const MultiplePrograms: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
			'Fitness/Programs/StrongLifts.md': STRONGLIFTS_PROGRAM,
			'Fitness/Programs/PPL.md': PUSH_PULL_LEGS,
		},
	},
};

/**
 * Single program - when only one program exists.
 */
export const SingleProgram: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
	},
};
