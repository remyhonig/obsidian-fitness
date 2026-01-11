/**
 * FinishScreen stories using the real rule engine.
 *
 * These stories demonstrate how to use engine-based decorators to get
 * realistic rule evaluation without manually constructing mock data.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FinishScreen, type FinishScreenProps } from './FinishScreen';
import { withCompletedEngineSession } from '../../../storybook/decorators/providers';
import {
	PROGRAM_WITH_RULES,
	SIMPLE_PROGRAM,
	BODYWEIGHT_PROGRAM,
} from '../../../storybook/programs';

const meta: Meta<typeof FinishScreen> = {
	title: 'Screens/FinishScreen',
	component: FinishScreen,
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<FinishScreenProps>;

/**
 * Default completed workout without any rule progress.
 * Uses simple program without progression rules.
 */
export const CompletedWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Upper Body', SIMPLE_PROGRAM, {
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 9, weight: 80, rpe: 8 },
				{ reps: 8, weight: 80, rpe: 9 },
			],
			'Barbell Row': [
				{ reps: 10, weight: 70, rpe: 7 },
				{ reps: 10, weight: 70, rpe: 8 },
				{ reps: 9, weight: 70, rpe: 8 },
			],
			'Overhead Press': [
				{ reps: 10, weight: 50, rpe: 7 },
				{ reps: 9, weight: 50, rpe: 8 },
				{ reps: 8, weight: 50, rpe: 9 },
			],
		}),
	],
};

/**
 * First session hitting progression criteria.
 *
 * The engine evaluates that we hit max reps (10) with low RPE (6-7),
 * which meets the rule condition for the first time (1/2 sessions).
 * Shows "1 of 2 sessions" progress towards the +2.5kg increase.
 */
export const FirstSessionMeetingCriteria: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Upper Body', PROGRAM_WITH_RULES, {
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 10, weight: 80, rpe: 7 },
			],
			'Barbell Row': [
				{ reps: 10, weight: 70, rpe: 7 },
				{ reps: 10, weight: 70, rpe: 7 },
				{ reps: 10, weight: 70, rpe: 7 },
			],
			'Overhead Press': [
				{ reps: 9, weight: 50, rpe: 8 },
				{ reps: 8, weight: 50, rpe: 8 },
				{ reps: 8, weight: 50, rpe: 9 },
			],
		}),
	],
};

/**
 * Second session triggering the progression rule.
 *
 * With session history showing we already hit the criteria once before,
 * this second session should trigger the rule and show "+2.5kg next session".
 */
export const SecondSessionTriggeringRule: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				'Bench Press': [
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 7 },
				],
				'Barbell Row': [
					{ reps: 10, weight: 70, rpe: 6 },
					{ reps: 10, weight: 70, rpe: 7 },
					{ reps: 9, weight: 70, rpe: 7 },
				],
				'Overhead Press': [
					{ reps: 8, weight: 50, rpe: 8 },
					{ reps: 8, weight: 50, rpe: 8 },
					{ reps: 8, weight: 50, rpe: 9 },
				],
			},
			// Previous session that met the criteria
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
						{
							name: 'Barbell Row',
							sets: [
								{ reps: 10, weight: 70, rpe: 7 },
								{ reps: 10, weight: 70, rpe: 7 },
								{ reps: 10, weight: 70, rpe: 7 },
							],
						},
					],
				},
			]
		),
	],
};

/**
 * Session with missed reps (deload scenario).
 *
 * When reps fall below minimum, the deload rule should be tracking.
 * First session missing reps shows "1 of 2 sessions" towards deload.
 */
export const SessionWithMissedReps: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Upper Body', PROGRAM_WITH_RULES, {
			'Bench Press': [
				{ reps: 7, weight: 80, rpe: 10 },
				{ reps: 6, weight: 80, rpe: 10 },
				{ reps: 5, weight: 80, rpe: 10 },
			],
			'Barbell Row': [
				{ reps: 10, weight: 70, rpe: 7 },
				{ reps: 10, weight: 70, rpe: 7 },
				{ reps: 10, weight: 70, rpe: 8 },
			],
			'Overhead Press': [
				{ reps: 8, weight: 50, rpe: 8 },
				{ reps: 8, weight: 50, rpe: 8 },
				{ reps: 8, weight: 50, rpe: 8 },
			],
		}),
	],
};

/**
 * Mixed results - some exercises progressing, some struggling.
 *
 * Shows a realistic scenario where different exercises are at
 * different points in their progression.
 */
export const MixedResults: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				// Bench: Second session of hitting criteria - should trigger +2.5kg
				'Bench Press': [
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 7 },
				],
				// Row: Just a normal session, no progress
				'Barbell Row': [
					{ reps: 9, weight: 70, rpe: 8 },
					{ reps: 8, weight: 70, rpe: 8 },
					{ reps: 8, weight: 70, rpe: 9 },
				],
				// OHP: Missed reps after missing last session too - deload triggered
				'Overhead Press': [
					{ reps: 7, weight: 50, rpe: 10 },
					{ reps: 6, weight: 50, rpe: 10 },
					{ reps: 5, weight: 50, rpe: 10 },
				],
			},
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
						{
							name: 'Overhead Press',
							sets: [
								{ reps: 7, weight: 50, rpe: 10 },
								{ reps: 6, weight: 50, rpe: 10 },
								{ reps: 6, weight: 50, rpe: 10 },
							],
						},
					],
				},
			]
		),
	],
};

/**
 * Lower body workout with different exercise patterns.
 *
 * Shows the engine working with a different workout in the same program.
 */
export const LowerBodySession: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Lower Body', PROGRAM_WITH_RULES, {
			'Squat': [
				{ reps: 5, weight: 100, rpe: 7 },
				{ reps: 5, weight: 100, rpe: 7 },
				{ reps: 5, weight: 100, rpe: 8 },
			],
			'Romanian Deadlift': [
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 7 },
				{ reps: 10, weight: 80, rpe: 7 },
			],
			'Leg Press': [
				{ reps: 15, weight: 150, rpe: 7 },
				{ reps: 14, weight: 150, rpe: 8 },
				{ reps: 12, weight: 150, rpe: 8 },
			],
		}),
	],
};

/**
 * Short bodyweight workout.
 * Shows minimal stats without volume.
 */
export const ShortWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Full Body', BODYWEIGHT_PROGRAM, {
			'Push-ups': [
				{ reps: 20, weight: 0, rpe: 6 },
				{ reps: 18, weight: 0, rpe: 7 },
				{ reps: 15, weight: 0, rpe: 8 },
			],
			'Pull-ups': [
				{ reps: 10, weight: 0, rpe: 7 },
				{ reps: 9, weight: 0, rpe: 8 },
				{ reps: 8, weight: 0, rpe: 9 },
			],
			'Squats': [
				{ reps: 25, weight: 0, rpe: 6 },
				{ reps: 23, weight: 0, rpe: 7 },
				{ reps: 20, weight: 0, rpe: 8 },
			],
			'Lunges': [
				{ reps: 12, weight: 0, rpe: 7 },
				{ reps: 12, weight: 0, rpe: 7 },
				{ reps: 12, weight: 0, rpe: 8 },
			],
		}),
	],
};

/**
 * High volume workout with heavy weights.
 * Shows large volume numbers.
 */
export const HighVolumeWorkout: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Lower Body', SIMPLE_PROGRAM, {
			'Squat': [
				{ reps: 5, weight: 120, rpe: 7 },
				{ reps: 5, weight: 120, rpe: 7 },
				{ reps: 5, weight: 120, rpe: 8 },
			],
			'Romanian Deadlift': [
				{ reps: 10, weight: 100, rpe: 7 },
				{ reps: 10, weight: 100, rpe: 7 },
				{ reps: 10, weight: 100, rpe: 8 },
			],
			'Leg Press': [
				{ reps: 15, weight: 200, rpe: 7 },
				{ reps: 15, weight: 200, rpe: 8 },
				{ reps: 15, weight: 200, rpe: 8 },
			],
		}),
	],
};

/**
 * Bodyweight-only workout.
 * No weight stats shown for individual exercises.
 */
export const BodyweightOnly: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Full Body', BODYWEIGHT_PROGRAM, {
			'Push-ups': [
				{ reps: 20, weight: 0, rpe: 6 },
				{ reps: 18, weight: 0, rpe: 7 },
				{ reps: 15, weight: 0, rpe: 8 },
			],
			'Pull-ups': [
				{ reps: 10, weight: 0, rpe: 7 },
				{ reps: 9, weight: 0, rpe: 8 },
				{ reps: 8, weight: 0, rpe: 9 },
			],
			'Squats': [
				{ reps: 25, weight: 0, rpe: 6 },
				{ reps: 23, weight: 0, rpe: 7 },
				{ reps: 20, weight: 0, rpe: 8 },
			],
			'Lunges': [
				{ reps: 12, weight: 0, rpe: 7 },
				{ reps: 12, weight: 0, rpe: 7 },
				{ reps: 12, weight: 0, rpe: 8 },
			],
		}),
	],
};

/**
 * Multiple streaks close to triggering.
 * Shows an exciting moment where user is building multiple streaks.
 */
export const MultipleStreaksClosing: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession('Upper Body', PROGRAM_WITH_RULES, {
			// All exercises meeting criteria for first time
			'Bench Press': [
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 6 },
				{ reps: 10, weight: 80, rpe: 7 },
			],
			'Barbell Row': [
				{ reps: 10, weight: 70, rpe: 6 },
				{ reps: 10, weight: 70, rpe: 7 },
				{ reps: 10, weight: 70, rpe: 7 },
			],
			'Overhead Press': [
				{ reps: 10, weight: 50, rpe: 6 },
				{ reps: 10, weight: 50, rpe: 7 },
				{ reps: 10, weight: 50, rpe: 7 },
			],
		}),
	],
};

/**
 * Multiple exercises triggering different rules.
 * Shows variety of progression types.
 */
export const MultipleTriggeredRules: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				'Bench Press': [
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 6 },
					{ reps: 10, weight: 80, rpe: 7 },
				],
				'Barbell Row': [
					{ reps: 10, weight: 70, rpe: 6 },
					{ reps: 10, weight: 70, rpe: 7 },
					{ reps: 10, weight: 70, rpe: 7 },
				],
				'Overhead Press': [
					{ reps: 10, weight: 50, rpe: 6 },
					{ reps: 10, weight: 50, rpe: 7 },
					{ reps: 10, weight: 50, rpe: 7 },
				],
			},
			// All exercises had previous sessions meeting criteria
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
						{
							name: 'Barbell Row',
							sets: [
								{ reps: 10, weight: 70, rpe: 6 },
								{ reps: 10, weight: 70, rpe: 7 },
								{ reps: 10, weight: 70, rpe: 7 },
							],
						},
						{
							name: 'Overhead Press',
							sets: [
								{ reps: 10, weight: 50, rpe: 6 },
								{ reps: 10, weight: 50, rpe: 7 },
								{ reps: 10, weight: 50, rpe: 7 },
							],
						},
					],
				},
			]
		),
	],
};

/**
 * Broken streak scenario.
 * User had built up a streak meeting criteria, but this session broke it
 * by not meeting the RPE requirement (RPE too high).
 */
export const BrokenStreak: Story = {
	args: {
		onNavigate: action('navigate'),
	},
	decorators: [
		withCompletedEngineSession(
			'Upper Body',
			PROGRAM_WITH_RULES,
			{
				// Current session: RPE too high, breaks the streak
				'Bench Press': [
					{ reps: 10, weight: 80, rpe: 9 },
					{ reps: 9, weight: 80, rpe: 9 },
					{ reps: 8, weight: 80, rpe: 10 },
				],
				'Barbell Row': [
					{ reps: 10, weight: 70, rpe: 6 },
					{ reps: 10, weight: 70, rpe: 7 },
					{ reps: 10, weight: 70, rpe: 7 },
				],
				'Overhead Press': [
					{ reps: 10, weight: 50, rpe: 6 },
					{ reps: 10, weight: 50, rpe: 7 },
					{ reps: 10, weight: 50, rpe: 7 },
				],
			},
			// Previous session where bench press met criteria (building streak)
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
						{
							name: 'Barbell Row',
							sets: [
								{ reps: 10, weight: 70, rpe: 6 },
								{ reps: 10, weight: 70, rpe: 7 },
								{ reps: 10, weight: 70, rpe: 7 },
							],
						},
						{
							name: 'Overhead Press',
							sets: [
								{ reps: 10, weight: 50, rpe: 6 },
								{ reps: 10, weight: 50, rpe: 7 },
								{ reps: 10, weight: 50, rpe: 7 },
							],
						},
					],
				},
			]
		),
	],
};
