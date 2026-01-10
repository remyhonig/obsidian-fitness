/**
 * BottomNav Component
 *
 * Bottom tab bar navigation with icons and labels.
 * Supports custom tabs with SVG icons.
 * Workout tab shows a progress ring when a session is active.
 */

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
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
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
	/** Workout progress (0-1), shows progress ring on workout tab when set */
	workoutProgress?: number | null;
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
	/** Progress value 0-1 for showing a progress ring around the icon */
	progress?: number | null;
}

/** Progress ring SVG component */
function ProgressRing({ progress }: { progress: number }) {
	const size = 30;
	const strokeWidth = 2.5;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - progress);

	return (
		<svg
			className="fit-nav-progress-ring"
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
		>
			{/* Background circle - light gray track */}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke="#E5E5E5"
				strokeWidth={strokeWidth}
			/>
			{/* Progress arc */}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke="var(--fit-primary)"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
		</svg>
	);
}

function BottomNavItem({ icon, label, isActive, onClick, progress }: BottomNavItemProps) {
	const hasProgress = progress !== null && progress !== undefined;

	return (
		<button
			className={`fit-bottom-nav-item ${isActive ? 'active' : ''} ${hasProgress ? 'has-progress' : ''}`}
			onClick={onClick}
		>
			<span className="fit-bottom-nav-icon">
				{hasProgress && <ProgressRing progress={progress} />}
				{icon}
			</span>
			<span className="fit-bottom-nav-label">{label}</span>
		</button>
	);
}

export function BottomNav<T extends string = DefaultTabType>({
	tabs,
	activeTab,
	onTabChange,
	workoutProgress,
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
					progress={tab.id === 'workout' ? workoutProgress : undefined}
				/>
			))}
		</nav>
	);
}

// Export the default icons for external use
export { NavIcons };
