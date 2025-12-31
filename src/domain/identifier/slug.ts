/**
 * Slug and filename generation utilities
 * Pure functions for creating URL-safe identifiers
 */

/**
 * Generates a safe slug/filename from a string.
 * - Lowercases the input
 * - Replaces non-alphanumeric characters with hyphens
 * - Trims leading/trailing hyphens
 */
export function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Converts a slug to title case.
 * dumbbell-shoulder-press -> Dumbbell Shoulder Press
 */
export function slugToTitleCase(slug: string): string {
	return slug
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
