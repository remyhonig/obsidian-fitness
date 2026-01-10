import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { WorkoutDetailScreen } from './WorkoutDetailScreen';
import { withLoadedProgram } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';

const SAMPLE_PROGRAM = `# Strength Program

A comprehensive strength training program.

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body
- Friday: Full Body

---

# Workouts

## Upper Body

Chest and back focused workout.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s "Keep shoulders retracted"
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s
- Face Pulls (optional): 3x15-20 @ 15kg RPE 7, rest 60s

---

## Lower Body

Leg focused workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s "Focus on depth"
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s
- Calf Raises (optional): 3x15-20 @ 60kg RPE 7, rest 60s

---

## Full Body

Full body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 120s
`;

const meta: Meta<typeof WorkoutDetailScreen> = {
	title: 'Screens/WorkoutDetailScreen',
	component: WorkoutDetailScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('workout')],
};

export default meta;
type Story = StoryObj<typeof WorkoutDetailScreen>;

export const UpperBody: Story = {
	args: {
		workoutName: 'Upper Body',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(SAMPLE_PROGRAM)],
};

export const LowerBody: Story = {
	args: {
		workoutName: 'Lower Body',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(SAMPLE_PROGRAM)],
};

export const FullBody: Story = {
	args: {
		workoutName: 'Full Body',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(SAMPLE_PROGRAM)],
};

export const WorkoutNotFound: Story = {
	args: {
		workoutName: 'Non-existent Workout',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(SAMPLE_PROGRAM)],
};

// Program with training max percentages
const PERCENTAGE_PROGRAM = `# 5/3/1 Style Program

A percentage-based strength program.

---

# Progression

## Training Maxes

- Squat TM: 100kg
- Bench Press TM: 80kg
- Deadlift TM: 120kg

---

# Schedule

## Weekly Pattern

- Monday: Squat Day
- Wednesday: Bench Day

---

# Workouts

## Squat Day

Heavy squat day with assistance.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s "Brace hard, control the descent"
- Romanian Deadlift: 3x10 @ 60kg RPE 7, rest 120s
- Leg Curl: 3x12-15 @ 40kg RPE 8, rest 90s

---

## Bench Day

Heavy bench day with assistance.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s "Touch chest, pause briefly"
- Overhead Press: 3x8 @ 50kg RPE 7, rest 120s
- Tricep Pushdown: 3x12-15 @ 25kg RPE 7, rest 60s
`;

export const WithPercentages: Story = {
	args: {
		workoutName: 'Squat Day',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(PERCENTAGE_PROGRAM)],
};

// Program with AMRAP sets
const AMRAP_PROGRAM = `# AMRAP Program

Program with AMRAP sets.

---

# Schedule

## Weekly Pattern

- Monday: Push Day

---

# Workouts

## Push Day

Push workout with AMRAP finisher.

- Bench Press: 3x5 @ 80kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s
- Bench Press: 1xAMRAP @ 60kg RPE 10 "Go to failure"
`;

export const WithAMRAP: Story = {
	args: {
		workoutName: 'Push Day',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(AMRAP_PROGRAM)],
};

export const NoBackHandler: Story = {
	args: {
		workoutName: 'Upper Body',
		onNavigate: action('navigate'),
		// No onBack - should fall back to onNavigate('home')
	},
	decorators: [withLoadedProgram(SAMPLE_PROGRAM)],
};

/** Story with expanding backdrop (simulates navigation from HomeScreen with layoutId) */
export const WithExpandingBackdrop: Story = {
	args: {
		workoutName: 'Upper Body',
		layoutId: 'workout-card-Upper Body',
		cardVariant: 'suggested',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withLoadedProgram(SAMPLE_PROGRAM)],
};
