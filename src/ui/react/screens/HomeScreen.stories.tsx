import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { HomeScreen } from './HomeScreen';
import { setStorybookFiles } from '../../../storybook/mocks/obsidian-storybook-mock';
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

**Exercises**
1. Squat - 3x5 @ 85% TM, RPE 8, rest 180s

### Bench Day
Bench press focus.

**Exercises**
1. Bench Press - 3x5 @ 85% TM, RPE 8, rest 180s

### Deadlift Day
Deadlift work.

**Exercises**
1. Deadlift - 3x5 @ 85% TM, RPE 8, rest 180s

### OHP Day
Overhead press work.

**Exercises**
1. Overhead Press - 3x5 @ 85% TM, RPE 8, rest 180s
`;

const meta: Meta<typeof HomeScreen> = {
	title: 'Screens/HomeScreen',
	component: HomeScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('home')],
};

export default meta;
type Story = StoryObj<typeof HomeScreen>;

export const NoProgramsAvailable: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		(Story) => {
			setStorybookFiles({});
			return <Story />;
		},
	],
};

export const WithPrograms: Story = {
	args: {
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
			'Fitness/Programs/StrongLifts.md': `# StrongLifts 5x5

Simple and effective beginner program.

## Schedule

### Weekly Schedule
- **Monday**: Workout A
- **Wednesday**: Workout B
- **Friday**: Workout A

## Workouts

### Workout A
Squat, bench, row.

**Exercises**
1. Squat - 5x5 @ 100kg, rest 180s
2. Bench Press - 5x5 @ 80kg, rest 180s
3. Barbell Row - 5x5 @ 70kg, rest 180s

### Workout B
Squat, press, deadlift.

**Exercises**
1. Squat - 5x5 @ 100kg, rest 180s
2. Overhead Press - 5x5 @ 50kg, rest 180s
3. Deadlift - 1x5 @ 120kg, rest 180s
`,
		},
	},
};

export const SingleProgram: Story = {
	args: {
		onNavigate: action('navigate'),
		programMarkdown: SAMPLE_PROGRAM,
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
	},
};

// Active session with countdown timer (resting)
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

// Active session with countup timer (rest complete, ready)
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
