/**
 * FinishScreen stories using the real rule engine.
 *
 * These stories demonstrate how to use engine-based decorators to get
 * realistic rule evaluation without manually constructing mock data.
 *
 * Compare with FinishScreen.stories.tsx which uses manual mock data.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FinishScreen, type FinishScreenProps } from './FinishScreen';
import {
	withCompletedEngineSession,
	type SetData,
	type SessionHistoryEntry,
} from '../../../storybook/decorators/providers';

/**
 * Program with progression rules that trigger weight increases.
 *
 * Rule: if reps >= max AND rpe <= 7 for 2 sessions: +2.5kg
 *
 * This means if you hit max reps with easy RPE for 2 sessions in a row,
 * the engine will recommend increasing weight.
 */
const PROGRAM_WITH_RULES = `# Progressive Overload Program

A program demonstrating progression rules.

---

# Progression

## Global Rules

- if reps >= max AND rpe <= 7 for 2 sessions: +2.5kg "Easy progression"
- if reps < min for 2 sessions: -5kg "Deload due to missed reps"

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body

---

# Workouts

## Upper Body

Upper body workout with progression tracking.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s

---

## Lower Body

Lower body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
`;

const meta: Meta<typeof FinishScreen> = {
	title: 'Screens/FinishScreen/Engine',
	component: FinishScreen,
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<FinishScreenProps>;

/**
 * First session hitting the progression criteria.
 *
 * The engine evaluates that we hit max reps (10) with low RPE (6-7),
 * which meets the rule condition for the first time (1/2 sessions).
 *
 * Rule progress should show "1 of 2 sessions" towards the +2.5kg increase.
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
		}),
	],
};
