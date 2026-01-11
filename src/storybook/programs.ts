/**
 * Shared program markdowns for Storybook stories.
 *
 * These programs are designed to work with the real rule engine and cover
 * different scenarios like progression rules, training maxes, cycle schedules, etc.
 */

/**
 * Basic program with progression rules for testing rule evaluation.
 *
 * Rules:
 * - if reps >= max AND rpe <= 7 for 2 sessions: +2.5kg
 * - if reps < min for 2 sessions: -5kg (deload)
 */
export const PROGRAM_WITH_RULES = `# Progressive Overload Program

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
- Friday: Full Body

---

# Workouts

## Upper Body

Upper body workout with progression tracking.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s "Keep shoulders retracted"
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s

---

## Lower Body

Lower body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s "Focus on depth"
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s

---

## Full Body

Full body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 120s
`;

/**
 * Program with training maxes and percentage-based weights.
 */
export const PROGRAM_WITH_TMS = `# 5/3/1 Style Program

A percentage-based strength program using training maxes.

---

# Progression

## Training Maxes

- Squat TM: 120kg
- Bench Press TM: 85kg
- Deadlift TM: 150kg
- Overhead Press TM: 55kg

## Global Rules

- if reps >= max AND rpe <= 7 for 2 sessions: +2.5kg

---

# Schedule

## Weekly Pattern

- Monday: Squat Day
- Tuesday: Bench Day
- Thursday: Deadlift Day
- Friday: OHP Day

---

# Workouts

## Squat Day

Main squat work with accessories.

- Squat: 3x5 @ 85% TM RPE 8, rest 180s "Brace hard, control descent"
- Romanian Deadlift: 3x10 @ 60kg RPE 7, rest 120s
- Leg Curl: 3x12-15 @ 40kg RPE 8, rest 90s

---

## Bench Day

Main bench work with accessories.

- Bench Press: 3x5 @ 85% TM RPE 8, rest 180s "Touch chest, pause briefly"
- Overhead Press: 3x8 @ 50kg RPE 7, rest 120s
- Tricep Pushdown: 3x12-15 @ 25kg RPE 7, rest 60s

---

## Deadlift Day

Main deadlift work with accessories.

- Deadlift: 3x5 @ 85% TM RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 7, rest 120s
- Lat Pulldown: 3x10-12 @ 60kg RPE 7, rest 90s

---

## OHP Day

Main overhead press work with accessories.

- Overhead Press: 3x5 @ 85% TM RPE 8, rest 180s
- Dumbbell Press: 3x10-12 @ 25kg RPE 7, rest 90s
- Lateral Raise: 3x12-15 @ 10kg RPE 7, rest 60s
`;

/**
 * Program with cycle schedule (not weekly pattern).
 */
export const PROGRAM_WITH_CYCLE = `# Push Pull Legs

A classic 6-day split using cycle pattern for muscle growth.

---

# Schedule

## Cycle Pattern

- Push, recovery 24h
- Pull, recovery 24h
- Legs, recovery 48h

---

# Workouts

## Push

Chest, shoulders, and triceps.

- Bench Press: 4x8-10 @ 80kg RPE 8, rest 120s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 90s
- Incline Dumbbell Press: 3x10-12 @ 30kg RPE 7, rest 90s

---

## Pull

Back and biceps.

- Barbell Row: 4x8-10 @ 70kg RPE 8, rest 120s
- Pull Ups: 3x8-10 @ bodyweight RPE 8, rest 90s
- Face Pulls: 3x15-20 @ 20kg RPE 7, rest 60s

---

## Legs

Quads, hamstrings, and glutes.

- Squat: 4x6-8 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s
`;

/**
 * Simple program without progression rules or training maxes.
 * Good for basic UI testing.
 */
export const SIMPLE_PROGRAM = `# Simple Workout Program

A straightforward program for basic testing.

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body
- Friday: Full Body

---

# Workouts

## Upper Body

Chest and back focused workout.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s "Keep shoulders retracted"
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s

---

## Lower Body

Leg focused workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s "Focus on depth"
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Leg Press: 3x12-15 @ 150kg RPE 8, rest 90s

---

## Full Body

Full body workout.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 120s
`;

/**
 * Bodyweight-only program for testing weight=0 scenarios.
 */
export const BODYWEIGHT_PROGRAM = `# Bodyweight Circuit

Bodyweight-only training for anywhere, anytime.

---

# Schedule

## Weekly Pattern

- Monday: Full Body
- Wednesday: Full Body
- Friday: Full Body

---

# Workouts

## Full Body

Complete bodyweight workout.

- Push-ups: 3x15-20 @ bodyweight RPE 7, rest 60s
- Pull-ups: 3x8-12 @ bodyweight RPE 8, rest 90s
- Squats: 3x20-25 @ bodyweight RPE 7, rest 60s
- Lunges: 3x12 @ bodyweight RPE 7, rest 60s
`;

/**
 * Program with AMRAP sets.
 */
export const AMRAP_PROGRAM = `# AMRAP Program

Program with AMRAP sets.

---

# Schedule

## Weekly Pattern

- Monday: Push Day

---

# Workouts

## Push Day

Push workout with AMRAP finisher.

- Bench Press: 3x5 @ 80kg RPE 8, rest 180s
- Overhead Press: 3x8-10 @ 50kg RPE 8, rest 120s
- Bench Press: 1xAMRAP @ 60kg RPE 10 "Go to failure"
`;

/**
 * Program with optional exercises.
 */
export const PROGRAM_WITH_OPTIONAL = `# Program with Optional Exercises

A program showing optional exercises.

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body

---

# Workouts

## Upper Body

Upper body with optional finishers.

- Bench Press: 3x8-10 @ 80kg RPE 8, rest 180s
- Barbell Row: 3x8-10 @ 70kg RPE 8, rest 180s
- Face Pulls (optional): 3x15-20 @ 15kg RPE 7, rest 60s

---

## Lower Body

Lower body with optional calf work.

- Squat: 3x5 @ 100kg RPE 8, rest 180s
- Romanian Deadlift: 3x8-10 @ 80kg RPE 7, rest 120s
- Calf Raises (optional): 3x15-20 @ 60kg RPE 7, rest 60s
`;
