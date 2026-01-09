import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { TopNav } from './TopNav';

const meta: Meta<typeof TopNav> = {
	title: 'Components/TopNav',
	component: TopNav,
	parameters: {
		layout: 'fullscreen'
	},
	decorators: [
		(Story) => (
			<div className="fit-app" style={{ minHeight: '100px' }}>
				<Story />
			</div>
		)
	],
	argTypes: {
		variant: {
			control: 'select',
			options: ['simple', 'back', 'arrows', 'actions']
		}
	}
};

export default meta;
type Story = StoryObj<typeof TopNav>;

export const Simple: Story = {
	args: {
		title: 'Home',
		variant: 'simple'
	}
};

export const WithSubtitle: Story = {
	args: {
		title: 'January 2026',
		subtitle: 'Tap to return to today',
		variant: 'simple',
		onTitleClick: action('onTitleClick')
	}
};

export const Back: Story = {
	args: {
		title: 'Workout',
		variant: 'back',
		onBack: action('onBack')
	}
};

export const BackCustomLabel: Story = {
	args: {
		title: 'Settings',
		variant: 'back',
		backLabel: 'Cancel',
		onBack: action('onBack')
	}
};

export const Arrows: Story = {
	args: {
		title: 'January 2026',
		variant: 'arrows',
		onPrev: action('onPrev'),
		onNext: action('onNext')
	}
};

export const ArrowsDisabled: Story = {
	args: {
		title: 'December 2025',
		variant: 'arrows',
		onPrev: action('onPrev'),
		onNext: action('onNext'),
		prevDisabled: true
	}
};

export const Actions: Story = {
	args: {
		title: 'Workout',
		variant: 'actions',
		leftAction: (
			<button className="fit-back-button" onClick={action('cancel')}>
				Cancel
			</button>
		),
		rightAction: (
			<button className="fit-button-text" onClick={action('skip')}>
				Skip
			</button>
		)
	}
};

export const ActionsLeftOnly: Story = {
	args: {
		title: 'Strength Program',
		variant: 'actions',
		leftAction: (
			<button className="fit-button-text" onClick={action('cancel')}>
				Cancel
			</button>
		)
	}
};

export const CountdownTimer: Story = {
	args: {
		title: 'Bench Press',
		variant: 'simple',
		timer: {
			type: 'countdown',
			seconds: 90,
			totalSeconds: 180,
			label: 'Rest'
		}
	}
};

export const CountdownTimerLow: Story = {
	args: {
		title: 'Bench Press',
		variant: 'simple',
		timer: {
			type: 'countdown',
			seconds: 15,
			totalSeconds: 180,
			label: 'Rest'
		}
	}
};

export const CountdownTimerNoLabel: Story = {
	args: {
		title: 'Squat',
		variant: 'actions',
		leftAction: (
			<button className="fit-button-text" onClick={action('cancel')}>
				Cancel
			</button>
		),
		timer: {
			type: 'countdown',
			seconds: 45,
			totalSeconds: 60
		}
	}
};

export const CountupTimer: Story = {
	args: {
		title: 'Workout',
		variant: 'simple',
		timer: {
			type: 'countup',
			seconds: 1245,
			label: 'Elapsed'
		}
	}
};

export const CountupTimerNoLabel: Story = {
	args: {
		title: 'Session',
		variant: 'back',
		onBack: action('onBack'),
		timer: {
			type: 'countup',
			seconds: 3725
		}
	}
};

export const ArrowsWithTimer: Story = {
	args: {
		title: 'Exercise 2 of 5',
		variant: 'arrows',
		onPrev: action('onPrev'),
		onNext: action('onNext'),
		timer: {
			type: 'countdown',
			seconds: 120,
			totalSeconds: 180,
			label: 'Rest'
		}
	}
};
