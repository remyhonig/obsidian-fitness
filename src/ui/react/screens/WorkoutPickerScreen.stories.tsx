import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { WorkoutPickerScreen } from './WorkoutPickerScreen';

const SAMPLE_PROGRAM = `# Full Program

A comprehensive workout program.

## Schedule

### Weekly Schedule
- **Monday**: Push Day
- **Tuesday**: Pull Day
- **Wednesday**: Legs
- **Thursday**: Rest
- **Friday**: Upper Body
- **Saturday**: Lower Body

## Workouts

### Push Day
Chest, shoulders, triceps.

**Exercises**
1. Bench Press - 4x6-8 @ 80kg, RPE 8, rest 180s
2. Overhead Press - 3x8-10 @ 50kg, RPE 8, rest 120s
3. Incline Dumbbell Press - 3x10-12 @ 30kg, RPE 7, rest 90s
4. Tricep Dips - 3x12-15 @ bodyweight, rest 60s

### Pull Day
Back and biceps.

**Exercises**
1. Barbell Row - 4x6-8 @ 70kg, RPE 8, rest 180s
2. Pull-ups - 3x8-10 @ bodyweight, RPE 8, rest 120s
3. Face Pulls - 3x15-20 @ 20kg, RPE 7, rest 60s
4. Barbell Curls - 3x10-12 @ 30kg, RPE 7, rest 60s

### Legs
Full leg workout.

**Exercises**
1. Squat - 4x5 @ 100kg, RPE 8, rest 180s
2. Romanian Deadlift - 3x8-10 @ 80kg, RPE 7, rest 120s
3. Leg Press - 3x12-15 @ 150kg, RPE 8, rest 90s
4. Leg Curls - 3x12-15 @ 40kg, RPE 7, rest 60s

### Upper Body
Balanced upper body.

**Exercises**
1. Bench Press - 3x8-10 @ 75kg, RPE 7, rest 150s
2. Barbell Row - 3x8-10 @ 65kg, RPE 7, rest 150s
3. Overhead Press - 3x10-12 @ 45kg, RPE 7, rest 90s

### Lower Body
Focused leg work.

**Exercises**
1. Squat - 3x8-10 @ 90kg, RPE 7, rest 180s
2. Leg Press - 4x10-12 @ 140kg, RPE 7, rest 90s
3. Walking Lunges - 3x12 each @ 20kg, rest 60s
`;

const meta: Meta<typeof WorkoutPickerScreen> = {
	title: 'Screens/WorkoutPickerScreen',
	component: WorkoutPickerScreen,
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof WorkoutPickerScreen>;

export const Default: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: SAMPLE_PROGRAM,
	},
};

export const AsTab: Story = {
	args: {
		onNavigate: action('navigate'),
		isTab: true,
		programMarkdown: SAMPLE_PROGRAM,
	},
};

export const NoProgram: Story = {
	args: {
		onNavigate: action('navigate'),
	},
};

export const SingleWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: `# Simple Program

One workout only.

## Workouts

### Full Body
Complete workout.

**Exercises**
1. Squat - 3x5 @ 100kg, rest 180s
2. Bench Press - 3x8 @ 80kg, rest 150s
3. Deadlift - 1x5 @ 120kg, rest 180s
`,
	},
};
