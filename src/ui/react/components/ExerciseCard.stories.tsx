import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ExerciseCard } from './ExerciseCard';
import type { MediaReference } from '../../../domain/fitness-domain-adapter';

const meta: Meta<typeof ExerciseCard> = {
	title: 'Components/ExerciseCard',
	component: ExerciseCard,
	parameters: {
		layout: 'centered',
	},
	decorators: [
		(Story) => (
			<div style={{ width: '350px', padding: '20px', background: 'var(--background-primary)' }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ExerciseCard>;

// Mock media data
const mockImage: MediaReference = {
	type: 'image',
	url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop',
	description: 'Bench press demonstration',
};

const mockYouTube: MediaReference = {
	type: 'youtube-video',
	url: 'https://www.youtube.com/watch?v=example',
	videoId: 'example',
	description: 'How to bench press',
};

// ==================
// Preview Mode Stories
// ==================

export const Preview: Story = {
	args: {
		mode: 'preview',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		restSeconds: 180,
	},
};

export const PreviewOptional: Story = {
	args: {
		mode: 'preview',
		name: 'Face Pulls',
		targetSets: 3,
		targetReps: { min: 15, max: 20 },
		targetWeight: 15,
		targetRPE: 7,
		restSeconds: 60,
		optional: true,
	},
};

export const PreviewAMRAP: Story = {
	args: {
		mode: 'preview',
		name: 'Bench Press',
		targetSets: 1,
		targetReps: 'AMRAP',
		targetWeight: 60,
		targetRPE: 10,
	},
};

export const PreviewBodyweight: Story = {
	args: {
		mode: 'preview',
		name: 'Pull-ups',
		targetSets: 3,
		targetReps: { min: 8, max: 12 },
		targetWeight: 0,
		targetRPE: 8,
		restSeconds: 120,
	},
};

export const PreviewWithNote: Story = {
	args: {
		mode: 'preview',
		name: 'Squat',
		targetSets: 3,
		targetReps: { min: 5, max: 5 },
		targetWeight: 100,
		targetRPE: 8,
		restSeconds: 180,
		note: 'Focus on depth and bracing',
	},
};

// ==================
// Session Mode Stories
// ==================

export const SessionNoSets: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [],
		onSetClick: action('onSetClick'),
	},
};

export const SessionPartial: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [
			{ reps: 10, weight: 80, rpe: 7 },
			{ reps: 9, weight: 80, rpe: 8 },
		],
		selectedSetIndex: 2,
		onSetClick: action('onSetClick'),
	},
};

export const SessionComplete: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [
			{ reps: 10, weight: 80, rpe: 7 },
			{ reps: 9, weight: 80, rpe: 8 },
			{ reps: 8, weight: 80, rpe: 9 },
		],
		onSetClick: action('onSetClick'),
	},
};

export const SessionWithMedia: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [{ reps: 10, weight: 80, rpe: 7 }],
		media: [mockImage, mockYouTube],
		note: 'Keep shoulders retracted throughout the movement',
		onSetClick: action('onSetClick'),
		onImageClick: action('onImageClick'),
		onYouTubeClick: action('onYouTubeClick'),
	},
};

export const SessionWithYouTubeOnly: Story = {
	args: {
		mode: 'session',
		name: 'Romanian Deadlift',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 7,
		completedSets: [],
		media: [mockYouTube],
		onSetClick: action('onSetClick'),
		onYouTubeClick: action('onYouTubeClick'),
	},
};

export const SessionWithRuleAdjustment: Story = {
	args: {
		mode: 'session',
		name: 'Squat',
		targetSets: 3,
		targetReps: { min: 5, max: 5 },
		targetWeight: 105,
		targetRPE: 8,
		completedSets: [
			{ reps: 5, weight: 100, rpe: 7 },
			{ reps: 5, weight: 100, rpe: 7 },
		],
		adjustment: {
			type: 'rule_applied',
			reason: 'Increasing weight 5kg based on RPE performance',
			ruleSource: 'progressive_overload',
		},
		onSetClick: action('onSetClick'),
	},
};

export const SessionWithAutoMatch: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [{ reps: 10, weight: 80, rpe: 8 }],
		adjustment: {
			type: 'auto_matched',
			reason: 'Matching previous set weight',
		},
		onSetClick: action('onSetClick'),
	},
};

export const SessionSelected: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [
			{ reps: 10, weight: 80, rpe: 7 },
			{ reps: 9, weight: 80, rpe: 8 },
		],
		selectedSetIndex: 0,
		onSetClick: action('onSetClick'),
	},
};

export const SessionAnimating: Story = {
	args: {
		mode: 'session',
		name: 'Bench Press',
		targetSets: 3,
		targetReps: { min: 8, max: 10 },
		targetWeight: 80,
		targetRPE: 8,
		completedSets: [
			{ reps: 10, weight: 80, rpe: 7 },
			{ reps: 9, weight: 80, rpe: 8 },
		],
		animatingSetIndex: 1,
		onSetClick: action('onSetClick'),
	},
};

export const SessionFiveSets: Story = {
	args: {
		mode: 'session',
		name: 'Squat',
		targetSets: 5,
		targetReps: { min: 5, max: 5 },
		targetWeight: 100,
		targetRPE: 8,
		completedSets: [
			{ reps: 5, weight: 100, rpe: 7 },
			{ reps: 5, weight: 100, rpe: 7 },
			{ reps: 5, weight: 100, rpe: 8 },
		],
		onSetClick: action('onSetClick'),
	},
};
