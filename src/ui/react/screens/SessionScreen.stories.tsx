/**
 * SessionScreen stories using the real rule engine.
 *
 * These stories simulate workouts by dispatching events to the engine,
 * which generates realistic session state including rule progress.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SessionScreen } from './SessionScreen';
import { withEngineSession } from '../../../storybook/decorators/providers';
import { withBottomNav } from './storyDecorators';
import { PROGRAM_WITH_RULES, SIMPLE_PROGRAM } from '../../../storybook/programs';

const meta: Meta<typeof SessionScreen> = {
	title: 'Screens/SessionScreen',
	component: SessionScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('workout')],
};

export default meta;
type Story = StoryObj<typeof SessionScreen>;

/**
 * Fresh workout - just started, no exercise selected yet.
 * Shows the "suggested" (light blue) state for the first exercise.
 * User must tap to start working out.
 */
export const FreshWorkoutNoExerciseSelected: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [withEngineSession('Upper Body', SIMPLE_PROGRAM)],
};

/**
 * Mid-workout - first exercise has 2 sets completed, waiting for set 3.
 */
export const MidWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession('Upper Body', SIMPLE_PROGRAM, {
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 9, weight: 80, rpe: 8 },
			],
		}),
	],
};

/**
 * Last set of exercise just completed - shows all 3 sets done.
 */
export const LastSetOfExercise: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession('Upper Body', SIMPLE_PROGRAM, {
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 9, weight: 80, rpe: 8 },
				{ reps: 8, weight: 80, rpe: 9 },
			],
		}),
	],
};

/**
 * Exercise complete - all sets done for first exercise.
 * Uses program with rules so the engine can evaluate progression.
 */
export const ExerciseComplete: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession('Upper Body', PROGRAM_WITH_RULES, {
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 9, weight: 80, rpe: 8 },
				{ reps: 8, weight: 80, rpe: 9 },
			],
		}),
	],
};

/**
 * Exercise complete with coach tip showing weight increase.
 * The engine evaluates the rule and determines an adjustment.
 *
 * Session history + current session hitting criteria = rule triggers.
 */
export const ExerciseCompleteWithCoachTip: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				'Bench Press': [
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 7 },
				],
			},
			// Previous session that also met criteria
			[
				{
					date: '2024-01-08',
					workout: 'Upper Body',
					exercises: [
						{
							name: 'Bench Press',
							sets: [
								{ reps: 10, weight: 80, rpe: 6 },
								{ reps: 10, weight: 80, rpe: 7 },
								{ reps: 10, weight: 80, rpe: 7 },
							],
						},
					],
				},
			]
		),
	],
};

/**
 * Exercise complete with deload recommendation.
 * Missed reps triggers the deload rule.
 */
export const ExerciseCompleteWithDownAdjustment: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				'Bench Press': [
					{ reps: 6, weight: 85, rpe: 10 },
					{ reps: 5, weight: 85, rpe: 10 },
					{ reps: 4, weight: 85, rpe: 10 },
				],
			},
			// Previous session also missed reps
			[
				{
					date: '2024-01-08',
					workout: 'Upper Body',
					exercises: [
						{
							name: 'Bench Press',
							sets: [
								{ reps: 6, weight: 85, rpe: 10 },
								{ reps: 5, weight: 85, rpe: 10 },
								{ reps: 5, weight: 85, rpe: 10 },
							],
						},
					],
				},
			]
		),
	],
};

/**
 * Post-set reps question - after marking set done, asks for reps.
 */
export const PostSetRepsQuestion: Story = {
	args: {
		onNavigate: action('navigate'),
		initialDetailInputMode: 'reps',
		initialPendingSet: { reps: null, rpe: null, weight: 80 },
	},
	decorators: [
		withEngineSession('Upper Body', SIMPLE_PROGRAM, {
			'Bench Press': [{ reps: 10, weight: 80, rpe: 7 }],
		}),
	],
};

/**
 * Post-set RPE question - asking for RPE after reps entered.
 */
export const PostSetRPEQuestion: Story = {
	args: {
		onNavigate: action('navigate'),
		initialDetailInputMode: 'rpe',
		initialPendingSet: { reps: 9, rpe: null, weight: 80 },
	},
	decorators: [
		withEngineSession('Upper Body', SIMPLE_PROGRAM, {
			'Bench Press': [{ reps: 10, weight: 80, rpe: 7 }],
		}),
	],
};

/**
 * Post-set weight confirmation.
 */
export const PostSetWeightConfirm: Story = {
	args: {
		onNavigate: action('navigate'),
		initialDetailInputMode: 'weight',
		initialPendingSet: { reps: 9, rpe: 8, weight: 80 },
	},
	decorators: [
		withEngineSession('Upper Body', SIMPLE_PROGRAM, {
			'Bench Press': [{ reps: 10, weight: 80, rpe: 7 }],
		}),
	],
};

/**
 * Coach tip with rule progress showing streak building.
 * First session meeting criteria - shows "1 of 2 sessions" progress.
 */
export const CoachTipWithRuleProgress: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession('Upper Body', PROGRAM_WITH_RULES, {
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 6 },
			],
		}),
	],
};

/**
 * Coach tip showing a broken streak.
 * User was building progress but missed reps, resetting streak.
 */
export const CoachTipStreakBroken: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				'Bench Press': [
					{ reps: 6, weight: 85, rpe: 10 },
					{ reps: 5, weight: 85, rpe: 10 },
					{ reps: 4, weight: 85, rpe: 10 },
				],
			},
			// Previous session building a streak that now breaks
			[
				{
					date: '2024-01-01',
					workout: 'Upper Body',
					exercises: [
						{
							name: 'Bench Press',
							sets: [
								{ reps: 10, weight: 80, rpe: 6 },
								{ reps: 10, weight: 80, rpe: 7 },
								{ reps: 10, weight: 80, rpe: 7 },
							],
						},
					],
				},
			]
		),
	],
};

/**
 * Lower body workout session.
 */
export const LowerBodyWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [withEngineSession('Lower Body', SIMPLE_PROGRAM)],
};

/**
 * Lower body workout mid-progress.
 */
export const LowerBodyMidWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withEngineSession('Lower Body', SIMPLE_PROGRAM, {
			'Squat': [
				{ reps: 5, weight: 100, rpe: 7 },
				{ reps: 5, weight: 100, rpe: 8 },
			],
		}),
	],
};
