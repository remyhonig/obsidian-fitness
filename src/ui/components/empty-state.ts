/**
 * Empty state component for showing "no items" messages
 */

export interface EmptyStateOptions {
	/** Message to display */
	message: string;
	/** Optional icon name (Obsidian icon) */
	icon?: string;
}

/**
 * Creates an empty state message
 * Styled with fit-empty-state class
 */
export function createEmptyState(parent: HTMLElement, options: EmptyStateOptions): HTMLElement {
	const container = parent.createDiv({
		cls: 'fit-empty-state',
		text: options.message
	});

	return container;
}
