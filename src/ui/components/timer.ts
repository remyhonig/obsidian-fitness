/**
 * Timer display options
 */
export interface TimerDisplayOptions {
	seconds: number;
	onComplete?: () => void;
}

/**
 * Creates a countdown timer display
 */
export function createTimerDisplay(parent: HTMLElement, options: TimerDisplayOptions): HTMLElement {
	const container = parent.createDiv({ cls: 'fit-timer-display' });

	container.createDiv({
		cls: 'fit-timer-time',
		text: formatTime(options.seconds)
	});

	container.createDiv({
		cls: 'fit-timer-label',
		text: 'Rest'
	});

	return container;
}

/**
 * Creates a mini timer indicator (for showing in header)
 */
export function createMiniTimer(parent: HTMLElement, seconds: number): HTMLElement {
	const container = parent.createSpan({ cls: 'fit-mini-timer' });
	container.createSpan({ cls: 'fit-mini-timer-icon', text: '⏱' });
	container.createSpan({ cls: 'fit-mini-timer-time', text: formatTime(seconds) });
	return container;
}

/**
 * Formats seconds into MM:SS display
 */
export function formatTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a duration in milliseconds to a human readable string
 */
export function formatDuration(startTime: string, endTime: string): string {
	const start = new Date(startTime).getTime();
	const end = new Date(endTime).getTime();
	const durationMs = end - start;

	const hours = Math.floor(durationMs / (1000 * 60 * 60));
	const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

/**
 * Creates a progress ring for rest timer
 */
export function createProgressRing(
	parent: HTMLElement,
	progress: number,
	size = 120
): SVGElement {
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (progress * circumference);

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('width', String(size));
	svg.setAttribute('height', String(size));
	svg.setAttribute('class', 'fit-progress-ring');

	// Background circle
	const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	bgCircle.setAttribute('cx', String(size / 2));
	bgCircle.setAttribute('cy', String(size / 2));
	bgCircle.setAttribute('r', String(radius));
	bgCircle.setAttribute('fill', 'none');
	bgCircle.setAttribute('stroke', 'var(--background-modifier-border)');
	bgCircle.setAttribute('stroke-width', String(strokeWidth));
	svg.appendChild(bgCircle);

	// Progress circle
	const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	progressCircle.setAttribute('cx', String(size / 2));
	progressCircle.setAttribute('cy', String(size / 2));
	progressCircle.setAttribute('r', String(radius));
	progressCircle.setAttribute('fill', 'none');
	progressCircle.setAttribute('stroke', 'var(--interactive-accent)');
	progressCircle.setAttribute('stroke-width', String(strokeWidth));
	progressCircle.setAttribute('stroke-linecap', 'round');
	progressCircle.setAttribute('stroke-dasharray', String(circumference));
	progressCircle.setAttribute('stroke-dashoffset', String(offset));
	progressCircle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
	progressCircle.setAttribute('class', 'fit-progress-ring-circle');
	svg.appendChild(progressCircle);

	parent.appendChild(svg);
	return svg;
}
