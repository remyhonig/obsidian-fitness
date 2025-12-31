/**
 * Session ID generation utilities
 * Pure functions for creating and parsing session identifiers
 */

import { toSlug } from './slug';

/**
 * Pads a number to two digits
 */
function pad2(n: number): string {
	return n.toString().padStart(2, '0');
}

/**
 * Generates a session ID from date, time, and optional workout name.
 * Format: YYYY-MM-DD-HH-MM-SS[-workout-slug]
 */
export function generateSessionId(date: Date, workoutName?: string): string {
	const datePart = [
		date.getFullYear(),
		pad2(date.getMonth() + 1),
		pad2(date.getDate())
	].join('-');

	const timePart = [
		pad2(date.getHours()),
		pad2(date.getMinutes()),
		pad2(date.getSeconds())
	].join('-');

	const base = `${datePart}-${timePart}`;

	if (workoutName) {
		return `${base}-${toSlug(workoutName)}`;
	}

	return base;
}

/**
 * Extracts the date portion from a session ID (YYYY-MM-DD)
 */
export function extractDateFromSessionId(sessionId: string): string | null {
	const match = sessionId.match(/^(\d{4}-\d{2}-\d{2})/);
	return match?.[1] ?? null;
}
