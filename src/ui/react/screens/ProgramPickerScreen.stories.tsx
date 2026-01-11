/**
 * ProgramPickerScreen stories.
 *
 * These stories test the program selection UI with various configurations
 * of available programs organized by goal categories.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ProgramPickerScreen } from './ProgramPickerScreen';
import { withProviders } from '../../../storybook/decorators/providers';
import {
	SIMPLE_PROGRAM,
	PROGRAM_WITH_TMS,
	PROGRAM_WITH_CYCLE,
	BODYWEIGHT_PROGRAM,
} from '../../../storybook/programs';

/** Decorator args that are extracted by withProviders */
interface DecoratorArgs {
	files?: Record<string, string>;
	availablePrograms?: Array<{ goal: string; programPaths: string[] }>;
}

const meta: Meta<typeof ProgramPickerScreen> = {
	title: 'Screens/ProgramPickerScreen',
	component: ProgramPickerScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withProviders],
};

export default meta;
type Story = StoryObj<typeof ProgramPickerScreen> & { args?: DecoratorArgs };

/**
 * Multiple programs organized by goal categories.
 */
export const MultiplePrograms: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/531.md': PROGRAM_WITH_TMS,
			'Fitness/Programs/Simple.md': SIMPLE_PROGRAM,
			'Fitness/Programs/PPL.md': PROGRAM_WITH_CYCLE,
			'Fitness/Programs/Bodyweight.md': BODYWEIGHT_PROGRAM,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: ['Fitness/Programs/531.md', 'Fitness/Programs/Simple.md'],
			},
			{
				goal: 'Build muscle',
				programPaths: ['Fitness/Programs/PPL.md'],
			},
			{
				goal: 'Train anywhere',
				programPaths: ['Fitness/Programs/Bodyweight.md'],
			},
		],
	} as Record<string, unknown>,
};

/**
 * Single category with one program.
 */
export const SingleProgram: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/531.md': PROGRAM_WITH_TMS,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: ['Fitness/Programs/531.md'],
			},
		],
	} as Record<string, unknown>,
};

// Program with very long description to test truncation
const LONG_DESCRIPTION_PROGRAM = `# Upper Lower Split

This is an extremely detailed program description that goes on and on to test the two-line truncation feature. It includes information about periodization, exercise selection, progressive overload strategies, deload protocols, and recovery recommendations that would never fit in two lines of text on a mobile screen.

---

# Schedule

## Weekly Pattern

- Monday: Upper
- Wednesday: Lower
- Friday: Upper

---

# Workouts

## Upper

Upper body work.

- Bench Press: 4x8 @ 80kg RPE 8, rest 120s

---

## Lower

Lower body work.

- Squat: 4x6 @ 100kg RPE 8, rest 180s
`;

/**
 * Programs with varying description lengths to test truncation.
 */
export const LongDescriptions: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/UpperLower.md': LONG_DESCRIPTION_PROGRAM,
			'Fitness/Programs/531.md': PROGRAM_WITH_TMS,
			'Fitness/Programs/PPL.md': PROGRAM_WITH_CYCLE,
		},
		availablePrograms: [
			{
				goal: 'Test truncation',
				programPaths: [
					'Fitness/Programs/UpperLower.md',
					'Fitness/Programs/531.md',
					'Fitness/Programs/PPL.md',
				],
			},
		],
	} as Record<string, unknown>,
};

/**
 * Empty state - no programs available.
 */
export const Empty: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {},
		availablePrograms: [],
	} as Record<string, unknown>,
};

/**
 * When the user is changing their program from the More screen.
 * Shows a supportive message about data being saved.
 */
export const ChangingProgram: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		isChangingProgram: true,
		files: {
			'Fitness/Programs/531.md': PROGRAM_WITH_TMS,
			'Fitness/Programs/Simple.md': SIMPLE_PROGRAM,
			'Fitness/Programs/PPL.md': PROGRAM_WITH_CYCLE,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: ['Fitness/Programs/531.md', 'Fitness/Programs/Simple.md'],
			},
			{
				goal: 'Build muscle',
				programPaths: ['Fitness/Programs/PPL.md'],
			},
		],
	} as Record<string, unknown>,
};
