/**
 * BottomNav Component
 *
 * Bottom tab bar navigation with icons and labels.
 * Supports custom tabs with SVG icons.
 */

import React from 'react';

// Default tab types
export type DefaultTabType = 'home' | 'workout' | 'history' | 'more';

// SVG Icons for bottom navigation
const NavIcons: Record<DefaultTabType, React.ReactNode> = {
	home: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	),
	workout: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M6.5 6.5h-2a1 1 0 00-1 1v9a1 1 0 001 1h2M17.5 6.5h2a1 1 0 011 1v9a1 1 0 01-1 1h-2" />
			<rect x="6.5" y="8.5" width="3" height="7" rx="0.5" />
			<rect x="14.5" y="8.5" width="3" height="7" rx="0.5" />
			<line x1="9.5" y1="12" x2="14.5" y2="12" />
		</svg>
	),
	history: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M3 3v5h5" />
			<path d="M3.05 13A9 9 0 106 5.3L3 8" />
			<path d="M12 7v5l4 2" />
		</svg>
	),
	more: (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<circle cx="12" cy="12" r="1" fill="currentColor" />
			<circle cx="12" cy="5" r="1" fill="currentColor" />
			<circle cx="12" cy="19" r="1" fill="currentColor" />
		</svg>
	)
};

export interface NavTab<T extends string = DefaultTabType> {
	/** Unique tab identifier */
	id: T;
	/** Display label */
	label: string;
	/** Custom icon (uses default if not provided for DefaultTabType) */
	icon?: React.ReactNode;
}

export interface BottomNavProps<T extends string = DefaultTabType> {
	/** Array of tab configurations */
	tabs?: NavTab<T>[];
	/** Currently active tab */
	activeTab: T;
	/** Tab selection handler */
	onTabChange: (tab: T) => void;
	/** Additional CSS class */
	className?: string;
}

// Default tabs configuration
const defaultTabs: NavTab<DefaultTabType>[] = [
	{ id: 'home', label: 'Home' },
	{ id: 'workout', label: 'Workout' },
	{ id: 'history', label: 'History' },
	{ id: 'more', label: 'More' }
];

interface BottomNavItemProps {
	icon: React.ReactNode;
	label: string;
	isActive: boolean;
	onClick: () => void;
}

function BottomNavItem({ icon, label, isActive, onClick }: BottomNavItemProps) {
	return (
		<button
			className={`fit-bottom-nav-item ${isActive ? 'active' : ''}`}
			onClick={onClick}
		>
			<span className="fit-bottom-nav-icon">{icon}</span>
			<span className="fit-bottom-nav-label">{label}</span>
		</button>
	);
}

export function BottomNav<T extends string = DefaultTabType>({
	tabs,
	activeTab,
	onTabChange,
	className = ''
}: BottomNavProps<T>) {
	// Use default tabs if none provided (only works for DefaultTabType)
	const tabsToRender = (tabs ?? defaultTabs) as NavTab<T>[];

	const getIcon = (tab: NavTab<T>): React.ReactNode => {
		if (tab.icon) return tab.icon;
		// Check if it's a default tab type with a built-in icon
		if (tab.id in NavIcons) {
			return NavIcons[tab.id as DefaultTabType];
		}
		// Fallback: empty icon
		return <span />;
	};

	return (
		<nav className={`fit-bottom-nav ${className}`.trim()}>
			{tabsToRender.map((tab) => (
				<BottomNavItem
					key={tab.id}
					icon={getIcon(tab)}
					label={tab.label}
					isActive={activeTab === tab.id}
					onClick={() => onTabChange(tab.id)}
				/>
			))}
		</nav>
	);
}

// Export the default icons for external use
export { NavIcons };
