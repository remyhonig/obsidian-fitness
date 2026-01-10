import type { Meta, StoryObj } from '@storybook/react';
import { Mascot, SpeechBubble } from './Mascot';

const meta: Meta<typeof Mascot> = {
	title: 'Components/Mascot',
	component: Mascot,
	parameters: {
		layout: 'centered',
		backgrounds: {
			default: 'dark',
		},
	},
	argTypes: {
		mood: {
			control: 'select',
			options: ['neutral', 'celebrating', 'thinking'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		headOnly: {
			control: 'boolean',
		},
	},
	decorators: [
		(Story) => (
			<div style={{ padding: '40px', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Mascot>;

// Basic variations
export const Neutral: Story = {
	args: {
		mood: 'neutral',
		size: 'large',
	},
};

export const Celebrating: Story = {
	args: {
		mood: 'celebrating',
		size: 'large',
	},
};

export const Thinking: Story = {
	args: {
		mood: 'thinking',
		size: 'large',
	},
};

// With speech bubble
export const WithWelcomeMessage: Story = {
	args: {
		mood: 'neutral',
		size: 'large',
		message: "Hey there! Ready to get strong? Create your first program to get started!",
	},
};

export const WithMotivationalMessage: Story = {
	args: {
		mood: 'celebrating',
		size: 'large',
		message: "Great job! You crushed that workout!",
	},
};

export const WithThinkingMessage: Story = {
	args: {
		mood: 'thinking',
		size: 'large',
		message: "Hmm, let me think about your next progression...",
	},
};

// Size variations
export const Small: Story = {
	args: {
		mood: 'neutral',
		size: 'small',
		message: "Small but mighty!",
	},
};

export const Medium: Story = {
	args: {
		mood: 'neutral',
		size: 'medium',
		message: "Just right!",
	},
};

export const Large: Story = {
	args: {
		mood: 'neutral',
		size: 'large',
		message: "Big and friendly!",
	},
};

// Head only variations
export const HeadOnlyNeutral: Story = {
	args: {
		mood: 'neutral',
		size: 'medium',
		headOnly: true,
	},
};

export const HeadOnlyCelebrating: Story = {
	args: {
		mood: 'celebrating',
		size: 'medium',
		headOnly: true,
		message: "Nice!",
	},
};

export const HeadOnlyThinking: Story = {
	args: {
		mood: 'thinking',
		size: 'medium',
		headOnly: true,
		message: "Hmm...",
	},
};

// Standalone Speech Bubble
export const StandaloneSpeechBubble: StoryObj<typeof SpeechBubble> = {
	render: () => (
		<SpeechBubble
			message="This is a standalone speech bubble that can be used independently!"
			position="above"
		/>
	),
};
