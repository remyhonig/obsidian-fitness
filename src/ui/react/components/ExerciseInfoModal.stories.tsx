import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ExerciseInfoModal } from './ExerciseInfoModal';

const meta: Meta<typeof ExerciseInfoModal> = {
	title: 'Components/ExerciseInfoModal',
	component: ExerciseInfoModal,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<div className="fit-app" style={{ height: '600px', position: 'relative' }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ExerciseInfoModal>;

export const WithAllContent: Story = {
	args: {
		exerciseName: 'Bench Press',
		imageUrl: 'https://picsum.photos/seed/bench/400/300',
		youtubeUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
		note: 'Keep shoulders retracted and maintain a slight arch in your lower back. Drive your feet into the floor for stability.',
		onClose: action('onClose'),
	},
};

export const WithImageOnly: Story = {
	args: {
		exerciseName: 'Barbell Row',
		imageUrl: 'https://picsum.photos/seed/row/400/300',
		onClose: action('onClose'),
	},
};

export const WithNoteOnly: Story = {
	args: {
		exerciseName: 'Squat',
		note: 'Focus on depth. Break parallel with your hip crease going below your knee. Keep your core braced throughout the movement.',
		onClose: action('onClose'),
	},
};

export const WithYouTubeOnly: Story = {
	args: {
		exerciseName: 'Deadlift',
		youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		onClose: action('onClose'),
	},
};

export const WithImageAndNote: Story = {
	args: {
		exerciseName: 'Overhead Press',
		imageUrl: 'https://picsum.photos/seed/ohp/400/300',
		note: 'Squeeze your glutes and brace your core. Press the bar in a slight arc around your face.',
		onClose: action('onClose'),
	},
};

export const EmptyContent: Story = {
	args: {
		exerciseName: 'Unknown Exercise',
		onClose: action('onClose'),
	},
};

export const LongExerciseName: Story = {
	args: {
		exerciseName: 'Dumbbell Romanian Deadlift with Pause',
		imageUrl: 'https://picsum.photos/seed/rdl/400/300',
		note: 'Hinge at the hips, keeping a slight bend in the knees. Pause for 2 seconds at the bottom of the movement.',
		youtubeUrl: 'https://www.youtube.com/watch?v=example',
		onClose: action('onClose'),
	},
};
