/**
 * WorkoutPickerScreen stories using the real rule engine.
 *
 * These stories load programs via the engine adapter to ensure
 * the parsed program state matches what the engine produces.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { WorkoutPickerScreen } from './WorkoutPickerScreen';
import { withEngineProgram, withProviders } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';
import { PROGRAM_WITH_TMS } from '../../../storybook/programs';

// Program with many workouts to test scrolling
const FULL_PROGRAM = `# Full Program

A comprehensive workout program with many workouts.

---

# Schedule

## Weekly Pattern

- Monday: Push Day
- Tuesday: Pull Day
- Wednesday: Legs
- Thursday: Upper Body
- Friday: Lower Body
- Saturday: Full Body

---

# Workouts

## Push Day

Chest, shoulders, triceps.

- Bench Press: 4x6-8 @ 80kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s
- Incline Dumbbell Press: 3x10-12 @ 30kg RPE 7, rest 90s
- Tricep Dips: 3x12-15 @ bodyweight RPE 7, rest 60s

---

## Pull Day

Back and biceps.

- Barbell Row: 4x6-8 @ 70kg RPE 8, rest 180s
- Pull-ups: 3x8-10 @ bodyweight RPE 8, rest 120s
- Face Pulls: 3x15-20 @ 20kg RPE 7, rest 60s
- Barbell Curls: 3x10-12 @ 30kg RPE 7, rest 60s

---

## Legs

Full leg workout.

- Squat: 4x5 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s
- Leg Curls: 3x12-15 @ 40kg RPE 7, rest 60s

---

## Upper Body

Balanced upper body.

- Bench Press: 3x8-10 @ 75kg RPE 7, rest 150s
- Barbell Row: 3x8-10 @ 65kg RPE 7, rest 150s
- Overhead Press: 3x10-12 @ 45kg RPE 7, rest 90s

---

## Lower Body

Focused leg work.

- Squat: 3x8-10 @ 90kg RPE 7, rest 180s
- Leg Press: 4x10-12 @ 140kg RPE 7, rest 90s
- Walking Lunges: 3x12 @ 20kg RPE 7, rest 60s

---

## Full Body

Complete workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8 @ 80kg RPE 8, rest 150s
- Deadlift: 1x5 @ 120kg RPE 8, rest 180s
`;

const SINGLE_WORKOUT = `# Simple Program

One workout only.

---

# Schedule

## Weekly Pattern

- Monday: Full Body

---

# Workouts

## Full Body

Complete workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8 @ 80kg RPE 8, rest 150s
- Deadlift: 1x5 @ 120kg RPE 8, rest 180s
`;

const meta: Meta<typeof WorkoutPickerScreen> = {
	title: 'Screens/WorkoutPickerScreen',
	component: WorkoutPickerScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('workout')],
};

export default meta;
type Story = StoryObj<typeof WorkoutPickerScreen>;

export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [withEngineProgram(FULL_PROGRAM)],
};

export const AsTab: Story = {
	args: {
		onNavigate: action('navigate'),
		isTab: true,
	},
	decorators: [withEngineProgram(FULL_PROGRAM)],
};

export const NoProgram: Story = {
	args: {
		onNavigate: action('navigate'),
		noProgram: true,
	} as Record<string, unknown>,
	decorators: [withProviders],
};

export const SingleWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [withEngineProgram(SINGLE_WORKOUT)],
};

/**
 * Program with training maxes.
 * Shows computed weights in workout list.
 */
export const WithTrainingMaxes: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [withEngineProgram(PROGRAM_WITH_TMS)],
};
