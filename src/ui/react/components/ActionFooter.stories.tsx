import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ActionFooter } from './ActionFooter';

const meta: Meta<typeof ActionFooter> = {
	title: 'Components/ActionFooter',
	component: ActionFooter,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<div className="fit-app" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, padding: '16px', background: 'var(--fit-bg)' }}>
					<p style={{ color: 'var(--fit-text-secondary)' }}>Content area above the footer</p>
				</div>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ActionFooter>;

// Triple layout - Cancel/DONE/Skip
export const TripleDone: Story = {
	args: {
		layout: 'triple',
		leftAction: {
			label: 'Cancel',
			onClick: action('cancel'),
			variant: 'ghost',
		},
		primaryAction: {
			label: 'DONE',
			onClick: action('done'),
			variant: 'primary',
		},
		rightAction: {
			label: 'Skip',
			onClick: action('skip'),
			variant: 'ghost',
		},
	},
};

// Triple layout - Cancel/Edit Set/Skip
export const TripleEdit: Story = {
	args: {
		layout: 'triple',
		leftAction: {
			label: 'Cancel',
			onClick: action('cancel'),
			variant: 'ghost',
		},
		primaryAction: {
			label: 'Edit Set',
			onClick: action('edit'),
			variant: 'secondary',
		},
		rightAction: {
			label: 'Skip',
			onClick: action('skip'),
			variant: 'ghost',
		},
	},
};

// Triple layout - with placeholder center (no action available)
export const TripleNoCenter: Story = {
	args: {
		layout: 'triple',
		leftAction: {
			label: 'Cancel',
			onClick: action('cancel'),
			variant: 'ghost',
		},
		primaryAction: {
			label: '',
			onClick: () => {},
			disabled: true,
		},
		rightAction: {
			label: 'Skip',
			onClick: action('skip'),
			variant: 'ghost',
		},
	},
};

// Single action - Continue
export const SingleContinue: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Continue to Next Exercise',
			onClick: action('continue'),
			variant: 'success',
		},
	},
};

// Single action - Return
export const SingleReturn: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Return to Active Exercise',
			onClick: action('return'),
			variant: 'success',
		},
	},
};

// Single action - Finish
export const SingleFinish: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Finish & Save',
			onClick: action('finish'),
			variant: 'success',
		},
	},
};

// Single action - Disabled
export const SingleDisabled: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Saving...',
			onClick: action('save'),
			variant: 'success',
			disabled: true,
		},
	},
};

// With coach tip - weight increase (next session)
export const WithCoachTipUp: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Continue to Next Exercise',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: '+2.5kg next session',
			reason: 'Great work! All reps hit with good form.',
		},
	},
};

// With coach tip - weight decrease (next session)
export const WithCoachTipDown: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Continue to Next Exercise',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: '-5kg next session',
			reason: 'Missed reps. Lower weight to build back up.',
		},
	},
};

// With coach tip - maintain weight
export const WithCoachTipMaintain: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Continue to Next Exercise',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: 'same weight next session',
			reason: 'Keep working at this weight until all reps are solid.',
		},
	},
};

// With coach tip - next set adjustment
export const WithCoachTipNextSet: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'continue',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: '+5kg next set',
			reason: 'RPE was low, you can handle more!',
		},
	},
};

// With coach tip and rule progress
export const WithRuleProgress: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Continue to Next Exercise',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: '+2.5kg next session',
			reason: 'Hit all reps with good form.',
			ruleProgress: {
				current: 2,
				required: 3,
				unit: 'sessions',
			},
		},
	},
};

// With streak broken
export const WithStreakBroken: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'keep going!',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: 'streak broken',
			reason: '3 session streak for "RPE < 8" lost',
			streakBroken: true,
			ruleProgress: {
				current: 0,
				required: 3,
				unit: 'sessions',
			},
		},
	},
};

// With completed rule progress
export const WithRuleComplete: Story = {
	args: {
		layout: 'single',
		primaryAction: {
			label: 'Continue to Next Exercise',
			onClick: action('continue'),
			variant: 'success',
		},
		coachTip: {
			change: '+5kg next session',
			reason: 'Completed 3 sessions with RPE < 8!',
			ruleProgress: {
				current: 3,
				required: 3,
				unit: 'sessions',
			},
		},
	},
};

// Question mode - Reps
export const QuestionReps: Story = {
	args: {
		layout: 'single',
		question: {
			type: 'reps',
			min: 8,
			max: 10,
			onSelect: action('selectReps'),
		},
	},
};

// Question mode - RPE
export const QuestionRPE: Story = {
	args: {
		layout: 'single',
		question: {
			type: 'rpe',
			target: 7,
			onSelect: action('selectRPE'),
		},
	},
};

// Question mode - Weight
export const QuestionWeight: Story = {
	args: {
		layout: 'single',
		question: {
			type: 'weight',
			value: 80,
			pendingReps: 10,
			onChange: action('changeWeight'),
			onConfirm: action('confirmWeight'),
		},
	},
};

// Question mode - Weight (bodyweight)
export const QuestionWeightBodyweight: Story = {
	args: {
		layout: 'single',
		question: {
			type: 'weight',
			value: 0,
			pendingReps: 12,
			onChange: action('changeWeight'),
			onConfirm: action('confirmWeight'),
		},
	},
};
