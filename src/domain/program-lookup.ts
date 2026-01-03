/**
 * Utility for finding the program associated with a session
 */

import type { Session, Program } from '../types';
import type { ProgramRepository } from '../data/program-repository';
import { toSlug } from './identifier';

/**
 * Finds the program that a session belongs to.
 *
 * Uses session.programId (extracted from wikilink) when available.
 * Falls back to searching by workout name for legacy sessions.
 */
export async function findProgramForSession(
	session: Session,
	programRepo: ProgramRepository
): Promise<Program | null> {
	// Use programId directly if available (extracted from wikilink in frontmatter)
	if (session.programId) {
		return await programRepo.get(session.programId);
	}

	// Fallback: search all programs for one containing this workout
	if (!session.workout) return null;

	const workoutId = toSlug(session.workout);
	const programs = await programRepo.list();

	for (const program of programs) {
		if (program.workouts.includes(workoutId)) {
			return program;
		}
	}

	return null;
}
