import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { HistoryScreen } from './HistoryScreen';
import { withBottomNav } from './storyDecorators';

// Helper to generate session markdown
function createSessionMarkdown(options: {
	date: string;
	workout: string;
	duration: number;
	exercises: Array<{ name: string; sets: number }>;
}): string {
	const exerciseSections = options.exercises
		.map(ex => `## ${ex.name}\n\n${'| Set | Reps | Weight |\n|-----|------|--------|\n' + Array(ex.sets).fill(0).map((_, i) => `| ${i + 1} | 8 | 80kg |`).join('\n')}`)
		.join('\n\n');

	return `---
date: "${options.date}"
workout: "${options.workout}"
duration: ${options.duration}
---

# ${options.workout}

${exerciseSections}
`;
}

// Generate sessions for the current month
function generateCurrentMonthSessions(): Record<string, string> {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	const files: Record<string, string> = {};

	// Add a few sessions this month
	const workouts = ['Upper Body', 'Lower Body', 'Full Body'];

	// Session on the 5th
	const date1 = `${year}-${String(month + 1).padStart(2, '0')}-05`;
	files[`Fitness/Sessions/${date1}-upper-body.md`] = createSessionMarkdown({
		date: date1,
		workout: 'Upper Body',
		duration: 2700, // 45 min
		exercises: [
			{ name: 'Bench Press', sets: 3 },
			{ name: 'Barbell Row', sets: 3 },
			{ name: 'Overhead Press', sets: 3 },
		],
	});

	// Session on the 8th
	const date2 = `${year}-${String(month + 1).padStart(2, '0')}-08`;
	files[`Fitness/Sessions/${date2}-lower-body.md`] = createSessionMarkdown({
		date: date2,
		workout: 'Lower Body',
		duration: 3600, // 60 min
		exercises: [
			{ name: 'Squat', sets: 5 },
			{ name: 'Romanian Deadlift', sets: 3 },
			{ name: 'Leg Press', sets: 3 },
		],
	});

	// Session on the 12th
	const date3 = `${year}-${String(month + 1).padStart(2, '0')}-12`;
	files[`Fitness/Sessions/${date3}-full-body.md`] = createSessionMarkdown({
		date: date3,
		workout: 'Full Body',
		duration: 4200, // 70 min
		exercises: [
			{ name: 'Squat', sets: 3 },
			{ name: 'Bench Press', sets: 3 },
			{ name: 'Barbell Row', sets: 3 },
			{ name: 'Overhead Press', sets: 3 },
		],
	});

	return files;
}

// Generate a full month of sessions
function generateFullMonthSessions(): Record<string, string> {
	const files: Record<string, string> = {};
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();

	const workoutTypes = [
		{ name: 'Upper Body', exercises: [{ name: 'Bench Press', sets: 3 }, { name: 'Barbell Row', sets: 3 }] },
		{ name: 'Lower Body', exercises: [{ name: 'Squat', sets: 5 }, { name: 'RDL', sets: 3 }] },
		{ name: 'Full Body', exercises: [{ name: 'Squat', sets: 3 }, { name: 'Bench', sets: 3 }, { name: 'Row', sets: 3 }] },
	];

	// Monday, Wednesday, Friday schedule
	for (let day = 1; day <= 28; day++) {
		const date = new Date(year, month, day);
		const dayOfWeek = date.getDay();

		// Only Mon (1), Wed (3), Fri (5)
		if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
			const workoutIndex = dayOfWeek === 1 ? 0 : dayOfWeek === 3 ? 1 : 2;
			const workout = workoutTypes[workoutIndex];
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const slug = workout.name.toLowerCase().replace(/\s+/g, '-');

			files[`Fitness/Sessions/${dateStr}-${slug}.md`] = createSessionMarkdown({
				date: dateStr,
				workout: workout.name,
				duration: 2700 + Math.floor(Math.random() * 1800),
				exercises: workout.exercises,
			});
		}
	}

	return files;
}

const meta: Meta<typeof HistoryScreen> = {
	title: 'Screens/HistoryScreen',
	component: HistoryScreen,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [withBottomNav('history')],
};

export default meta;
type Story = StoryObj<typeof HistoryScreen>;

export const WithSessions: Story = {
	args: {
		onNavigate: action('navigate'),
		files: generateCurrentMonthSessions(),
	},
};

export const FullMonth: Story = {
	args: {
		onNavigate: action('navigate'),
		files: generateFullMonthSessions(),
	},
};

export const EmptyHistory: Story = {
	args: {
		onNavigate: action('navigate'),
		files: {},
	},
};

export const AsTab: Story = {
	args: {
		onNavigate: action('navigate'),
		isTab: true,
		files: generateCurrentMonthSessions(),
	},
};

// Sessions from previous months only
export const PreviousMonthOnly: Story = {
	args: {
		onNavigate: action('navigate'),
		files: (() => {
			const files: Record<string, string> = {};
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth() - 1; // Previous month
			const adjustedMonth = month < 0 ? 11 : month;
			const adjustedYear = month < 0 ? year - 1 : year;

			for (let i = 0; i < 5; i++) {
				const day = 5 + i * 3;
				const dateStr = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
				files[`Fitness/Sessions/${dateStr}-workout.md`] = createSessionMarkdown({
					date: dateStr,
					workout: 'Upper Body',
					duration: 3000,
					exercises: [{ name: 'Bench Press', sets: 3 }],
				});
			}

			return files;
		})(),
	},
};
