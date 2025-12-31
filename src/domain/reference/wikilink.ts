/**
 * Wiki-link parsing utilities
 * Pure functions for working with Obsidian wiki-link format
 */

import { slugToTitleCase } from '../identifier/slug';

/**
 * Checks if a value is a wiki-link (e.g., [[slug]] or [[slug|display]])
 */
export function isWikiLink(value: string): boolean {
	return /^\[\[[^\]]+\]\]$/.test(value.trim());
}

/**
 * Extracts the exercise ID (slug) from a wiki-link or plain text
 * [[slug]] -> slug
 * [[slug|Display Name]] -> slug
 * [[folder/slug]] -> slug
 * plain-text-id -> plain-text-id
 */
export function extractExerciseId(value: string): string {
	const trimmed = value.trim();

	// Match wiki-link: [[target]] or [[target|display]]
	const wikiMatch = trimmed.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
	if (wikiMatch) {
		let target = wikiMatch[1]?.trim() ?? '';
		// Strip any folder path prefix
		if (target.includes('/')) {
			target = target.split('/').pop() ?? target;
		}
		return target;
	}

	// Plain text - return as-is (already a slug/id)
	return trimmed;
}

/**
 * Extracts the display name from a wiki-link or returns plain text as-is
 * [[target]] -> target (or title-cased if slug)
 * [[target|display]] -> display
 * plain text -> plain text
 */
export function extractWikiLinkName(value: string): string {
	// Match wiki-link: [[target]] or [[target|display]]
	const wikiMatch = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
	if (wikiMatch) {
		let target = wikiMatch[1]?.trim() ?? '';
		const display = wikiMatch[2]?.trim();

		// If there's a display name (alias), use that
		if (display) {
			return display;
		}

		// Strip any folder path prefix (e.g., "Workouts/deadlift-day" -> "deadlift-day")
		if (target.includes('/')) {
			target = target.split('/').pop() ?? target;
		}

		// If target looks like a slug (lowercase with hyphens), convert to title case
		if (target.includes('-') && target === target.toLowerCase()) {
			return slugToTitleCase(target);
		}

		// Otherwise return the target as-is
		return target;
	}

	// Plain text - return as-is (caller should look up by ID for proper name)
	return value.trim();
}

/**
 * Creates a wiki-link from a slug
 */
export function createWikiLink(slug: string): string {
	return `[[${slug}]]`;
}
