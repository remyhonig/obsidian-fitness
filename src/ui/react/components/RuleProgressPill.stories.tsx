import type { Meta, StoryObj } from '@storybook/react';
import { RuleProgressPill } from './RuleProgressPill';

const meta: Meta<typeof RuleProgressPill> = {
	title: 'Components/RuleProgressPill',
	component: RuleProgressPill,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Active progress: 2 of 3 sessions completed */
export const Active: Story = {
	args: {
        current: 2,
        required: 3,
        unit: 'sessions',
        variant: "complete",
        effect: "hkjh"
    },
};

/** Just started: 1 of 3 sessions */
export const JustStarted: Story = {
	args: {
		current: 1,
		required: 3,
		unit: 'sessions',
		variant: 'active',
	},
};

/** Complete: Rule triggered with effect */
export const Complete: Story = {
	args: {
		current: 3,
		required: 3,
		unit: 'sessions',
		variant: 'complete',
		effect: '+2.5kg',
	},
};

/** Broken: Streak was reset after 2 successful sessions */
export const Broken: Story = {
	args: {
		current: 0,
		required: 3,
		unit: 'sessions',
		variant: 'broken',
		previousStreak: 2,
	},
};

/** Sets variant: Progress tracking by sets */
export const SetsProgress: Story = {
	args: {
		current: 2,
		required: 5,
		unit: 'sets',
		variant: 'active',
	},
};

/** Long streak: 4 of 5 sessions */
export const LongStreak: Story = {
	args: {
		current: 4,
		required: 5,
		unit: 'sessions',
		variant: 'active',
	},
};

/** All variants together */
export const AllVariants: Story = {
	render: () => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
			<RuleProgressPill
				current={2}
				required={3}
				unit="sessions"
				variant="active"
			/>
			<RuleProgressPill
				current={3}
				required={3}
				unit="sessions"
				variant="complete"
				effect="+2.5kg"
			/>
			<RuleProgressPill
				current={0}
				required={3}
				unit="sessions"
				variant="broken"
				previousStreak={2}
			/>
		</div>
	),
};
