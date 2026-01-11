/**
 * ProgramSetupScreen stories.
 *
 * These stories test the program setup UI where users configure
 * training maxes before starting their program.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ProgramSetupScreen } from './ProgramSetupScreen';
import { withProviders } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';
import { PROGRAM_WITH_TMS, SIMPLE_PROGRAM } from '../../../storybook/programs';

const meta: Meta<typeof ProgramSetupScreen> = {
	title: 'Screens/ProgramSetupScreen',
	component: ProgramSetupScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('home'), withProviders],
};

export default meta;
type Story = StoryObj<typeof ProgramSetupScreen>;

/**
 * Program with training maxes.
 * Shows the TM input form for exercises that use percentage-based weights.
 */
export const WithTrainingMaxes: Story = {
	args: {
		programPath: 'Fitness/Programs/531.md',
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/531.md': PROGRAM_WITH_TMS,
		},
	} as Record<string, unknown>,
};

/**
 * Simple program without training maxes.
 * Should skip the TM setup and go straight to the home screen.
 */
export const SimpleProgram: Story = {
	args: {
		programPath: 'Fitness/Programs/Simple.md',
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/Simple.md': SIMPLE_PROGRAM,
		},
	} as Record<string, unknown>,
};

// 5/3/1 style program with 4 training maxes
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
- Ab Wheel: 3x10-15 @ bodyweight RPE 8, rest 60s

---

## Press

Main overhead press with accessories.

- Overhead Press: 3x5 @ 85% TM RPE 8, rest 180s
- Dumbbell Press: 3x10-12 @ 25kg RPE 7, rest 90s
- Lateral Raise: 3x12-15 @ 10kg RPE 7, rest 60s
`;

/**
 * Full 5/3/1 style program with four training maxes.
 */
export const FiveThreeOne: Story = {
	args: {
		programPath: 'Fitness/Programs/531.md',
		onNavigate: action('navigate'),
		files: {
			'Fitness/Programs/531.md': FIVE_THREE_ONE,
		},
	} as Record<string, unknown>,
};

/**
 * File not found error state.
 */
export const FileNotFound: Story = {
	args: {
		programPath: 'Fitness/Programs/NonExistent.md',
		onNavigate: action('navigate'),
		files: {},
	} as Record<string, unknown>,
};
