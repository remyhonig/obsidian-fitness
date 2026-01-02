import { App, Notice, requestUrl } from 'obsidian';
import { ensureFolder } from './file-utils';

/**
 * Starter exercises - minimal set for demo workouts
 */
const STARTER_EXERCISES = [
	{
		id: 'bench-press',
		name: 'Bench Press',
		category: 'Strength',
		equipment: 'Barbell',
		muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
		notes: 'Lie on a flat bench, grip the bar slightly wider than shoulder-width. Lower to chest, press up.'
	},
	{
		id: 'barbell-squat',
		name: 'Barbell Squat',
		category: 'Strength',
		equipment: 'Barbell',
		muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
		notes: 'Bar on upper back, feet shoulder-width apart. Squat down until thighs are parallel, drive up.'
	},
	{
		id: 'deadlift',
		name: 'Deadlift',
		category: 'Strength',
		equipment: 'Barbell',
		muscleGroups: ['Lower Back', 'Glutes', 'Hamstrings', 'Traps'],
		notes: 'Stand with feet hip-width, grip bar outside knees. Keep back flat, drive through heels to stand.'
	},
	{
		id: 'overhead-press',
		name: 'Overhead Press',
		category: 'Strength',
		equipment: 'Barbell',
		muscleGroups: ['Shoulders', 'Triceps'],
		notes: 'Bar at shoulder height, press overhead until arms are locked out.'
	},
	{
		id: 'barbell-row',
		name: 'Barbell Row',
		category: 'Strength',
		equipment: 'Barbell',
		muscleGroups: ['Back', 'Biceps', 'Rear Delts'],
		notes: 'Hinge at hips, pull bar to lower chest, squeeze shoulder blades together.'
	},
	{
		id: 'pull-up',
		name: 'Pull-up',
		category: 'Strength',
		equipment: 'Body Only',
		muscleGroups: ['Lats', 'Biceps', 'Rear Delts'],
		notes: 'Hang from bar with overhand grip, pull up until chin clears bar.'
	},
	{
		id: 'dumbbell-curl',
		name: 'Dumbbell Curl',
		category: 'Strength',
		equipment: 'Dumbbell',
		muscleGroups: ['Biceps'],
		notes: 'Stand with dumbbells at sides, curl up while keeping elbows stationary.'
	},
	{
		id: 'tricep-pushdown',
		name: 'Tricep Pushdown',
		category: 'Strength',
		equipment: 'Cable',
		muscleGroups: ['Triceps'],
		notes: 'At cable machine, push bar down until arms are straight, control the return.'
	},
	{
		id: 'leg-press',
		name: 'Leg Press',
		category: 'Strength',
		equipment: 'Machine',
		muscleGroups: ['Quadriceps', 'Glutes'],
		notes: 'Feet shoulder-width on platform, lower until knees are at 90 degrees, press up.'
	},
	{
		id: 'lateral-raise',
		name: 'Lateral Raise',
		category: 'Strength',
		equipment: 'Dumbbell',
		muscleGroups: ['Shoulders'],
		notes: 'Raise dumbbells to sides until arms are parallel to floor.'
	},
	{
		id: 'face-pull',
		name: 'Face Pull',
		category: 'Strength',
		equipment: 'Cable',
		muscleGroups: ['Rear Delts', 'Traps'],
		notes: 'Pull rope attachment to face, externally rotate at the end.'
	},
	{
		id: 'leg-curl',
		name: 'Leg Curl',
		category: 'Strength',
		equipment: 'Machine',
		muscleGroups: ['Hamstrings'],
		notes: 'Lie face down, curl weight up by bending knees.'
	}
];

/**
 * Templates - files users can copy and customize
 * Prefixed with underscore to sort to top and indicate they're templates
 */
const TEMPLATES = {
	exercise: {
		id: '_template-exercise',
		content: `---
name: My Exercise Name
category: Strength
equipment: Barbell
muscleGroups: [Primary Muscle, Secondary Muscle]
---

Describe how to perform this exercise. Include:
- Starting position
- Movement pattern
- Key form cues
- Common mistakes to avoid

**Copy this file and rename it to create your own exercise.**
`
	},
	program: {
		id: '_template-program',
		content: `---
name: My Program Name
description: Brief description of this training program
---

## Workouts

### Workout A
| Exercise | Sets | Reps | Rest |
| -------- | ---- | ---- | ---- |
| [[exercise-name]] | 3 | 8-10 | 120s |
| exercise-from-database | 3 | 10-12 | 90s |

### Workout B
| Exercise | Sets | Reps | Rest |
| -------- | ---- | ---- | ---- |
| [[another-exercise]] | 4 | 6-8 | 180s |

**Notes:**
- Define workouts as ### sections with exercise tables
- The plugin cycles through workouts in order
- Use [[wikilinks]] for custom exercises in the Exercises folder
- Use plain text for exercises from the downloaded database

## Review

### energy-level
**How was your energy during the workout?**
- high: High energy, felt great
- normal: Normal, adequate
- low: Low energy, struggled

### progress-feeling
**Do you feel you made progress?**
- yes: Yes, definitely
- maybe: Maybe, not sure
- no: No, felt stuck

### notes
**Any additional notes?**
- no: No additional notes
- yes: Yes, I have notes | freeText: 200

**Copy this file and rename it to create your own program.**
`
	}
};

/**
 * Starter programs with inline workouts and review questions
 */
const STARTER_PROGRAMS = [
	{
		id: 'full-body-2x',
		name: 'Full Body 2x',
		description: 'Simple 2-day full body program for beginners',
		workouts: [
			{
				name: 'Full Body A',
				exercises: [
					{ exercise: 'barbell-squat', sets: 4, repsMin: 6, repsMax: 8, rest: 180 },
					{ exercise: 'bench-press', sets: 3, repsMin: 8, repsMax: 10, rest: 120 },
					{ exercise: 'barbell-row', sets: 3, repsMin: 8, repsMax: 10, rest: 120 },
					{ exercise: 'lateral-raise', sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
					{ exercise: 'dumbbell-curl', sets: 2, repsMin: 10, repsMax: 12, rest: 60 }
				]
			},
			{
				name: 'Full Body B',
				exercises: [
					{ exercise: 'deadlift', sets: 4, repsMin: 5, repsMax: 6, rest: 180 },
					{ exercise: 'overhead-press', sets: 3, repsMin: 8, repsMax: 10, rest: 120 },
					{ exercise: 'pull-up', sets: 3, repsMin: 6, repsMax: 10, rest: 120 },
					{ exercise: 'leg-curl', sets: 3, repsMin: 10, repsMax: 12, rest: 60 },
					{ exercise: 'tricep-pushdown', sets: 2, repsMin: 10, repsMax: 12, rest: 60 }
				]
			}
		],
		questions: [
			{
				id: 'training-effectiveness',
				text: 'Voelde de training effectief voor de doelspieren?',
				options: [
					{ id: 'ja', label: 'Ja, duidelijk' },
					{ id: 'matig', label: 'Matig' },
					{ id: 'nee', label: 'Nee / verkeerd gevoel' }
				]
			},
			{
				id: 'fatigue-level',
				text: 'Hoe vermoeid voel je je direct na de training?',
				options: [
					{ id: 'fris', label: 'Fris / licht geprikkeld' },
					{ id: 'goed', label: 'Goed gewerkt, lichte loomheid' },
					{ id: 'leeg', label: 'Leeg / te zwaar' }
				]
			},
			{
				id: 'recovery-expectation',
				text: 'Hoe schat je je herstel voor de volgende training?',
				options: [
					{ id: 'volledig', label: 'Volledig hersteld binnen 24-48u' },
					{ id: 'ok', label: 'Waarschijnlijk oké, maar scherp blijven' },
					{ id: 'twijfel', label: 'Twijfelachtig / voelt te veel' }
				]
			},
			{
				id: 'impulse-control',
				text: 'Heb je overwogen om extra oefeningen/sets toe te voegen?',
				options: [
					{ id: 'nee', label: 'Nee' },
					{ id: 'ja-niet', label: 'Ja, maar niet gedaan' },
					{ id: 'ja-gedaan', label: 'Ja, en gedaan' }
				]
			},
			{
				id: 'aesthetic-look',
				text: 'Hoe voelde je uiterlijk/\'look\' tijdens of na de training?',
				options: [
					{ id: 'vol', label: 'Vol & strak' },
					{ id: 'neutraal', label: 'Neutraal' },
					{ id: 'plat', label: 'Plat / opgeblazen' }
				]
			},
			{
				id: 'coach-feedback',
				text: 'Is er iets waar je expliciet feedback op wilt?',
				options: [
					{ id: 'nee', label: 'Nee' },
					{ id: 'ja', label: 'Ja' }
				],
				freeTextTrigger: 'ja',
				freeTextMaxLength: 120
			}
		]
	}
];

/**
 * Creates exercise markdown content
 */
function createExerciseContent(exercise: typeof STARTER_EXERCISES[0]): string {
	const lines = ['---'];
	lines.push(`name: ${exercise.name}`);
	if (exercise.category) lines.push(`category: ${exercise.category}`);
	if (exercise.equipment) lines.push(`equipment: ${exercise.equipment}`);
	if (exercise.muscleGroups.length > 0) {
		lines.push(`muscleGroups: [${exercise.muscleGroups.join(', ')}]`);
	}
	lines.push('---');
	lines.push('');
	if (exercise.notes) lines.push(exercise.notes);
	lines.push('');
	return lines.join('\n');
}

/**
 * Creates program markdown content with inline workouts and review questions
 */
function createProgramContent(program: typeof STARTER_PROGRAMS[0]): string {
	const lines = ['---'];
	lines.push(`name: ${program.name}`);
	if (program.description) lines.push(`description: ${program.description}`);
	lines.push('---');
	lines.push('');
	lines.push('## Workouts');
	lines.push('');

	// Add inline workouts as H3 sections with exercise tables
	for (const workout of program.workouts) {
		lines.push(`### ${workout.name}`);
		lines.push('| Exercise | Sets | Reps | Rest |');
		lines.push('| -------- | ---- | ---- | ---- |');
		for (const ex of workout.exercises) {
			const reps = ex.repsMin === ex.repsMax ? `${ex.repsMin}` : `${ex.repsMin}-${ex.repsMax}`;
			lines.push(`| ${ex.exercise} | ${ex.sets} | ${reps} | ${ex.rest}s |`);
		}
		lines.push('');
	}

	// Add Review section if questions exist
	if (program.questions && program.questions.length > 0) {
		lines.push('## Review');
		lines.push('');
		for (const question of program.questions) {
			lines.push(`### ${question.id}`);
			lines.push(`**${question.text}**`);
			for (const option of question.options) {
				if (question.freeTextTrigger === option.id && question.freeTextMaxLength) {
					lines.push(`- ${option.id}: ${option.label} | freeText: ${question.freeTextMaxLength}`);
				} else {
					lines.push(`- ${option.id}: ${option.label}`);
				}
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Bootstraps the data folder structure and starter content.
 * Recreates missing directories, templates, and starter programs on every startup.
 * Existing files are never overwritten.
 */
export async function bootstrapDataFolder(app: App, basePath: string): Promise<void> {
	const exercisesPath = `${basePath}/Exercises`;
	const programsPath = `${basePath}/Programs`;
	const sessionsPath = `${basePath}/Sessions`;

	// Always ensure folders exist
	await ensureFolder(app, exercisesPath);
	await ensureFolder(app, programsPath);
	await ensureFolder(app, sessionsPath);

	// Always create templates if missing
	let templatesCreated = 0;
	const templatePaths = [
		{ path: `${exercisesPath}/${TEMPLATES.exercise.id}.md`, content: TEMPLATES.exercise.content },
		{ path: `${programsPath}/${TEMPLATES.program.id}.md`, content: TEMPLATES.program.content }
	];
	for (const template of templatePaths) {
		if (!app.vault.getFileByPath(template.path)) {
			try {
				await app.vault.create(template.path, template.content);
				templatesCreated++;
			} catch {
				// File might already exist (cache miss), skip
			}
		}
	}
	if (templatesCreated > 0) {
		new Notice(`Created ${templatesCreated} template file(s)`);
	}

	// Create starter exercises (only if file doesn't exist)
	let exercisesCreated = 0;
	for (const exercise of STARTER_EXERCISES) {
		const path = `${exercisesPath}/${exercise.id}.md`;
		if (!app.vault.getFileByPath(path)) {
			try {
				await app.vault.create(path, createExerciseContent(exercise));
				exercisesCreated++;
			} catch {
				// File might already exist (cache miss), skip
			}
		}
	}

	// Create starter programs (with inline workouts)
	let programsCreated = 0;
	for (const program of STARTER_PROGRAMS) {
		const path = `${programsPath}/${program.id}.md`;
		if (!app.vault.getFileByPath(path)) {
			try {
				await app.vault.create(path, createProgramContent(program));
				programsCreated++;
			} catch {
				// File might already exist (cache miss), skip
			}
		}
	}

	if (exercisesCreated > 0 || programsCreated > 0) {
		new Notice(`Created starter content: ${exercisesCreated} exercises, ${programsCreated} programs`);
	}
}

/**
 * Imports exercises from the free-exercise-db
 */
export async function importExerciseDatabase(app: App, basePath: string): Promise<void> {
	const exercisesPath = `${basePath}/Exercises`;
	await ensureFolder(app, exercisesPath);

	const url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
	const imageBaseUrl = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

	new Notice('Fetching exercise database...');

	try {
		interface ExternalExercise {
			id: string;
			name: string;
			equipment: string | null;
			primaryMuscles: string[];
			secondaryMuscles: string[];
			instructions: string[];
			category: string;
			images: string[];
		}

		const response = await requestUrl({ url });
		const exercises = response.json as ExternalExercise[];

		let created = 0;
		let skipped = 0;

		for (const exercise of exercises) {
			const slug = exercise.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');
			const path = `${exercisesPath}/${slug}.md`;

			if (app.vault.getFileByPath(path)) {
				skipped++;
				continue;
			}

			const muscleGroups = [...exercise.primaryMuscles, ...exercise.secondaryMuscles]
				.map(m => m.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));

			const lines = ['---'];
			lines.push(`name: ${exercise.name}`);
			if (exercise.category) {
				lines.push(`category: ${exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}`);
			}
			if (exercise.equipment) {
				lines.push(`equipment: ${exercise.equipment.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}`);
			}
			if (muscleGroups.length > 0) {
				lines.push(`muscleGroups: [${muscleGroups.join(', ')}]`);
			}
			if (exercise.images && exercise.images.length > 0) {
				lines.push(`image0: ${imageBaseUrl}/${exercise.id}/0.jpg`);
				if (exercise.images.length > 1) {
					lines.push(`image1: ${imageBaseUrl}/${exercise.id}/1.jpg`);
				}
			}
			lines.push('---');
			lines.push('');
			if (exercise.instructions && exercise.instructions.length > 0) {
				lines.push(exercise.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n'));
			}
			lines.push('');

			await app.vault.create(path, lines.join('\n'));
			created++;
		}

		new Notice(`Imported ${created} exercises (${skipped} already existed)`);
	} catch (error) {
		console.error('[Fit] Failed to import exercises:', error);
		new Notice(`Failed to import exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
