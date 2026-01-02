/**
 * Session state event types for topic-based notifications.
 * Screens can subscribe to specific events rather than receiving all updates.
 */

export interface SessionEvents {
	// Session lifecycle
	'session.started': void;
	'session.loaded': void;
	'session.reloaded': void;
	'session.finished': void;
	'session.discarded': void;

	// Exercise operations
	'exercise.added': { index: number };
	'exercise.removed': { index: number };
	'exercise.reordered': { fromIndex: number; toIndex: number };
	'exercise.selected': { index: number };
	'exercises.updated': void;

	// Set operations
	'set.started': { exerciseIndex: number };
	'set.logged': { exerciseIndex: number; setIndex: number };
	'set.edited': { exerciseIndex: number; setIndex: number };
	'set.deleted': { exerciseIndex: number; setIndex: number };

	// Countdown (before first set of each exercise)
	'countdown.tick': { remaining: number; exerciseIndex: number };
	'countdown.complete': { exerciseIndex: number };

	// Exercise metrics
	'rpe.changed': { exerciseIndex: number; rpe: number };
	'muscle.changed': { exerciseIndex: number };

	// Rest timer (high frequency - screens can opt-in)
	'timer.started': { exerciseIndex: number; duration: number };
	'timer.tick': { remaining: number };
	'timer.cancelled': void;
	'timer.extended': { additionalSeconds: number };

	// Duration timer (ticks every second while session is active)
	'duration.tick': { elapsed: number };
}

export type SessionEventName = keyof SessionEvents;
export type SessionEventPayload<E extends SessionEventName> = SessionEvents[E];
export type SessionEventListener<E extends SessionEventName> = (payload: SessionEvents[E]) => void;
