import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BottomNav, type DefaultTabType, type NavTab } from './BottomNav';

const meta: Meta<typeof BottomNav> = {
	title: 'Components/BottomNav',
	component: BottomNav,
	parameters: {
		layout: 'fullscreen'
	},
	decorators: [
		(Story) => (
			<div className="fit-app" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777' }}>
					Screen content area
				</div>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const Default: Story = {
	args: {
		activeTab: 'home',
		onTabChange: () => {}
	}
};

export const WorkoutActive: Story = {
	args: {
		activeTab: 'workout',
		onTabChange: () => {}
	}
};

export const HistoryActive: Story = {
	args: {
		activeTab: 'history',
		onTabChange: () => {}
	}
};

export const MoreActive: Story = {
	args: {
		activeTab: 'more',
		onTabChange: () => {}
	}
};

// Interactive story that responds to clicks
function InteractiveBottomNav() {
	const [activeTab, setActiveTab] = useState<DefaultTabType>('home');
	return (
		<BottomNav
			activeTab={activeTab}
			onTabChange={setActiveTab}
		/>
	);
}

export const Interactive: Story = {
	render: () => <InteractiveBottomNav />
};

// Custom tabs example
const customTabs: NavTab<string>[] = [
	{
		id: 'dashboard',
		label: 'Dashboard',
		icon: (
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</svg>
		)
	},
	{
		id: 'profile',
		label: 'Profile',
		icon: (
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="8" r="4" />
				<path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
			</svg>
		)
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: (
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
			</svg>
		)
	}
];

function CustomTabsBottomNav() {
	const [activeTab, setActiveTab] = useState('dashboard');
	return (
		<BottomNav
			tabs={customTabs}
			activeTab={activeTab}
			onTabChange={setActiveTab}
		/>
	);
}

export const CustomTabs: Story = {
	render: () => <CustomTabsBottomNav />
};
