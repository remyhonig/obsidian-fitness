/**
 * WorkoutDetailScreen stories using the real rule engine.
 *
 * These stories load programs via the engine adapter to ensure
 * the parsed program state is realistic.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { WorkoutDetailScreen } from './WorkoutDetailScreen';
import { withEngineProgram } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';
import {
	SIMPLE_PROGRAM,
	PROGRAM_WITH_TMS,
	AMRAP_PROGRAM,
	PROGRAM_WITH_OPTIONAL,
} from '../../../storybook/programs';

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
	decorators: [withEngineProgram(SIMPLE_PROGRAM)],
};

export const LowerBody: Story = {
	args: {
		workoutName: 'Lower Body',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withEngineProgram(SIMPLE_PROGRAM)],
};

export const FullBody: Story = {
	args: {
		workoutName: 'Full Body',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withEngineProgram(SIMPLE_PROGRAM)],
};

export const WorkoutNotFound: Story = {
	args: {
		workoutName: 'Non-existent Workout',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withEngineProgram(SIMPLE_PROGRAM)],
};

/**
 * Program with training max percentages.
 * Shows calculated weights from TM.
 */
export const WithPercentages: Story = {
	args: {
		workoutName: 'Squat Day',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withEngineProgram(PROGRAM_WITH_TMS)],
};

/**
 * Program with AMRAP sets.
 */
export const WithAMRAP: Story = {
	args: {
		workoutName: 'Push Day',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withEngineProgram(AMRAP_PROGRAM)],
};

/**
 * Program with optional exercises.
 */
export const WithOptionalExercises: Story = {
	args: {
		workoutName: 'Upper Body',
		onNavigate: action('navigate'),
		onBack: action('back'),
	},
	decorators: [withEngineProgram(PROGRAM_WITH_OPTIONAL)],
};

export const NoBackHandler: Story = {
	args: {
		workoutName: 'Upper Body',
		onNavigate: action('navigate'),
		// No onBack - should fall back to onNavigate('home')
	},
	decorators: [withEngineProgram(SIMPLE_PROGRAM)],
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
	decorators: [withEngineProgram(SIMPLE_PROGRAM)],
};
