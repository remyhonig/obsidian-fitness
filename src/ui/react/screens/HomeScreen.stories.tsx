import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { HomeScreen } from './HomeScreen';
import { setStorybookFiles } from '../../../storybook/mocks/obsidian-storybook-mock';

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
