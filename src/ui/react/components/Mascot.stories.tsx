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
			options: ['neutral', 'celebrating', 'thinking', 'taking_notes', 'posing'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		headOnly: {
			control: 'boolean',
		},
		bubblePosition: {
			control: 'select',
			options: ['top', 'left', 'right'],
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

export const TakingNotes: Story = {
	args: {
		mood: 'taking_notes',
		size: 'large',
	},
};

export const TakingNotesWithMessage: Story = {
	args: {
		mood: 'taking_notes',
		size: 'large',
		message: "pick a program to get started!",
	},
};

export const Posing: Story = {
	args: {
		mood: 'posing',
		size: 'large',
	},
};

export const PosingWithMessage: Story = {
	args: {
		mood: 'posing',
		size: 'large',
		message: "great workout! let's take a picture!",
		bubblePosition: 'right',
	},
};

// Bubble position variations
export const BubbleOnTop: Story = {
	args: {
		mood: 'neutral',
		size: 'large',
		message: "bubble on top!",
		bubblePosition: 'top',
	},
};

export const BubbleOnLeft: Story = {
	args: {
		mood: 'neutral',
		size: 'large',
		message: "bubble on left!",
		bubblePosition: 'left',
	},
};

export const BubbleOnRight: Story = {
	args: {
		mood: 'neutral',
		size: 'large',
		message: "bubble on right!",
		bubblePosition: 'right',
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
