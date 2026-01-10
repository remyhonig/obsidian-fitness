import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ProgramPickerScreen } from './ProgramPickerScreen';
import { withProviders } from '../../../storybook/decorators/providers';

const SAMPLE_PROGRAM = `# Jim Wendler's 5/3/1

The classic strength program focusing on the big 4 lifts with progressive overload and deload weeks built in for optimal recovery and continuous gains.

---

# Progression

## Training Maxes

- Squat TM: 120kg
- Bench Press TM: 85kg
- Deadlift TM: 150kg
- Overhead Press TM: 55kg

---

# Schedule

## Cycle Pattern

1. Squat Day -> 48h recovery
2. Bench Day -> 48h recovery
3. Deadlift Day -> 48h recovery
4. OHP Day -> 72h recovery

---

# Workouts

## Squat Day

Main squat work.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s

---

## Bench Day

Bench press focus.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s

---

## Deadlift Day

Deadlift work.

- Deadlift: 3x5 @ 85% TM RPE 8, rest 180s

---

## OHP Day

Overhead press work.

- Overhead Press: 3x5 @ 85% TM RPE 8, rest 180s
`;

const STRONGLIFTS_PROGRAM = `# StrongLifts 5x5

Simple and effective beginner program focusing on compound lifts. Perfect for those new to weightlifting who want to build a solid foundation of strength using proven exercises.

---

# Schedule

## Weekly Pattern

- Monday: Workout A
- Wednesday: Workout B
- Friday: Workout A

---

# Workouts

## Workout A

Squat, bench, row.

- Squat: 5x5 @ 100kg RPE 8, rest 180s
- Bench Press: 5x5 @ 80kg RPE 8, rest 180s
- Barbell Row: 5x5 @ 70kg RPE 8, rest 180s

---

## Workout B

Squat, press, deadlift.

- Squat: 5x5 @ 100kg RPE 8, rest 180s
- Overhead Press: 5x5 @ 50kg RPE 8, rest 180s
- Deadlift: 1x5 @ 120kg RPE 8, rest 180s
`;

const PUSH_PULL_LEGS = `# Push Pull Legs

A classic 6-day split for intermediate lifters looking to maximize muscle growth through high frequency training. Each muscle group is hit twice per week with optimal volume.

---

# Schedule

## Weekly Pattern

- Monday: Push
- Tuesday: Pull
- Wednesday: Legs
- Thursday: Push
- Friday: Pull
- Saturday: Legs

---

# Workouts

## Push

Chest, shoulders, triceps.

- Bench Press: 4x8-10 @ 80kg RPE 8, rest 120s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s
- Dips: 3x10-12 @ bodyweight RPE 7, rest 90s

---

## Pull

Back, biceps, rear delts.

- Barbell Row: 4x8-10 @ 70kg RPE 8, rest 120s
- Pull Ups: 3x8-10 @ bodyweight RPE 8, rest 90s
- Face Pulls: 3x15-20 @ 15kg RPE 7, rest 60s

---

## Legs

Quads, hamstrings, glutes, calves.

- Squat: 4x6-8 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s
`;

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
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
			'Fitness/Programs/StrongLifts.md': STRONGLIFTS_PROGRAM,
			'Fitness/Programs/PPL.md': PUSH_PULL_LEGS,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: ['Fitness/Programs/531.md', 'Fitness/Programs/StrongLifts.md'],
			},
			{
				goal: 'Build muscle',
				programPaths: ['Fitness/Programs/PPL.md'],
			},
		],
	},
};

/**
 * Single category with one program.
 */
export const SingleProgram: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: ['Fitness/Programs/531.md'],
			},
		],
	},
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

const SHORT_NAME_PROGRAM = `# A

Minimal program.

---

# Schedule

## Weekly Pattern

- Monday: Day 1

---

# Workouts

## Day 1

Simple workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
`;

const VERY_LONG_NAME_PROGRAM = `# The Ultimate Hypertrophy Training Program for Maximum Muscle Growth

A comprehensive hypertrophy program.

---

# Schedule

## Weekly Pattern

- Monday: Push
- Tuesday: Pull

---

# Workouts

## Push

Push workout.

- Bench Press: 4x10 @ 70kg RPE 8, rest 90s

---

## Pull

Pull workout.

- Barbell Row: 4x10 @ 60kg RPE 8, rest 90s
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
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
			'Fitness/Programs/PPL.md': PUSH_PULL_LEGS,
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
	},
};

/**
 * Programs with varying name lengths to test title truncation.
 */
export const LongTitles: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/VeryLongName.md': VERY_LONG_NAME_PROGRAM,
			'Fitness/Programs/Short.md': SHORT_NAME_PROGRAM,
			'Fitness/Programs/531.md': SAMPLE_PROGRAM,
		},
		availablePrograms: [
			{
				goal: 'Test title lengths',
				programPaths: [
					'Fitness/Programs/VeryLongName.md',
					'Fitness/Programs/Short.md',
					'Fitness/Programs/531.md',
				],
			},
		],
	},
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
	},
};

// Real-world programs for testing the actual look (using correct DSL format)
const WENDLER_531 = `# Jim Wendler's 5/3/1 - Boring But Big

The classic 5/3/1 program by Jim Wendler with the Boring But Big accessory template for building strength and size.

---

# Schedule

## Weekly Pattern

- Monday: Squat
- Wednesday: Bench
- Friday: Deadlift

---

# Workouts

## Squat

Squat day.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s
`;

const BEACH_BODY = `# Beach Body Aesthetics

A physique-focused program emphasizing the mirror muscles for that beach-ready look with balanced development.

---

# Schedule

## Weekly Pattern

- Monday: Push
- Wednesday: Pull

---

# Workouts

## Push

Push workout.

- Bench Press: 4x10 @ 70kg RPE 8, rest 90s
`;

const FAT_LOSS_HIIT = `# Fat Loss HIIT - Shred Program

A high-intensity interval training program designed for maximum fat loss while preserving muscle mass.

---

# Schedule

## Weekly Pattern

- Monday: HIIT A
- Wednesday: HIIT B

---

# Workouts

## HIIT A

Circuit training.

- Burpees: 3x15 @ bodyweight RPE 9, rest 60s
`;

const FUNCTIONAL_FITNESS = `# Functional Fitness - CrossFit Style

A well-rounded program combining strength, conditioning, and mobility work for overall athletic performance.

---

# Schedule

## Weekly Pattern

- Monday: Strength
- Wednesday: Conditioning

---

# Workouts

## Strength

Strength work.

- Squat: 5x3 @ 100kg RPE 8, rest 180s
`;

const GREYSKULL = `# Greyskull LP - Phrak's Variant

A streamlined 3-day beginner program based on the Greyskull LP with Phrak's recommended modifications.

---

# Schedule

## Weekly Pattern

- Monday: Workout A
- Wednesday: Workout B
- Friday: Workout A

---

# Workouts

## Workout A

Full body A.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
`;

const GZCLP = `# GZCLP - Linear Progression Program

A beginner to intermediate linear progression program using the GZCL method's tiered approach to training.

---

# Schedule

## Weekly Pattern

- Monday: Day 1
- Thursday: Day 2

---

# Workouts

## Day 1

T1 and T2 work.

- Squat: 5x3 @ 100kg RPE 8, rest 180s
`;

const PPL_ADVANCED = `# Push Pull Legs - Advanced Hypertrophy

A 6-day PPL split for intermediate to advanced lifters focusing on maximizing muscle growth and strength.

---

# Schedule

## Weekly Pattern

- Monday: Push
- Tuesday: Pull
- Wednesday: Legs

---

# Workouts

## Push

Push day.

- Bench Press: 4x8 @ 80kg RPE 8, rest 120s
`;

const HYPERTROPHY_FOUNDATIONS = `# Hypertrophy Foundations - Beginner

A 3-day full body program designed to build muscle mass for beginners using proven hypertrophy principles.

---

# Schedule

## Weekly Pattern

- Monday: Full Body A
- Wednesday: Full Body B
- Friday: Full Body C

---

# Workouts

## Full Body A

Full body workout.

- Squat: 3x10 @ 80kg RPE 7, rest 90s
`;

/**
 * Real-world programs matching the actual plugin view.
 * Use this to test and improve the design.
 */
export const RealWorldPrograms: Story = {
	args: {
		onNavigate: action('navigate'),
		onBack: action('back'),
		files: {
			'Fitness/Programs/531-BBB.md': WENDLER_531,
			'Fitness/Programs/BeachBody.md': BEACH_BODY,
			'Fitness/Programs/FatLoss.md': FAT_LOSS_HIIT,
			'Fitness/Programs/Functional.md': FUNCTIONAL_FITNESS,
			'Fitness/Programs/Greyskull.md': GREYSKULL,
			'Fitness/Programs/GZCLP.md': GZCLP,
			'Fitness/Programs/PPL.md': PPL_ADVANCED,
			'Fitness/Programs/Hypertrophy.md': HYPERTROPHY_FOUNDATIONS,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: [
					'Fitness/Programs/531-BBB.md',
					'Fitness/Programs/Greyskull.md',
					'Fitness/Programs/GZCLP.md',
				],
			},
			{
				goal: 'Build muscle',
				programPaths: [
					'Fitness/Programs/PPL.md',
					'Fitness/Programs/Hypertrophy.md',
					'Fitness/Programs/BeachBody.md',
				],
			},
			{
				goal: 'Get lean',
				programPaths: ['Fitness/Programs/FatLoss.md'],
			},
			{
				goal: 'Move better',
				programPaths: ['Fitness/Programs/Functional.md'],
			},
		],
	},
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
			'Fitness/Programs/531-BBB.md': WENDLER_531,
			'Fitness/Programs/StrongLifts.md': STRONGLIFTS_PROGRAM,
			'Fitness/Programs/PPL.md': PUSH_PULL_LEGS,
		},
		availablePrograms: [
			{
				goal: 'Get strong',
				programPaths: ['Fitness/Programs/531-BBB.md', 'Fitness/Programs/StrongLifts.md'],
			},
			{
				goal: 'Build muscle',
				programPaths: ['Fitness/Programs/PPL.md'],
			},
		],
	},
};
