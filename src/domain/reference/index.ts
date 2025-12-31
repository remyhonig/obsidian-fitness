/**
 * Reference domain module
 * Re-exports all reference functions for convenient imports
 */

export {
	isWikiLink,
	extractExerciseId,
	extractWikiLinkName,
	createWikiLink
} from './wikilink';

export {
	determineExerciseSource,
	shouldUseWikiLink
} from './exercise-source';
