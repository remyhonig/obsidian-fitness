/**
 * Session domain module
 * Re-exports all session functions for convenient imports
 */

export {
	findFirstUnfinishedExerciseIndex,
	isSessionFullyComplete
} from './completion';

export {
	isValidTransition,
	canFinishSession,
	canDiscardSession,
	shouldAutoStartRestTimer
} from './lifecycle';
