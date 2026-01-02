import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SetTimerManager, type SetTimerManagerCallbacks } from './set-timer-manager';

describe('SetTimerManager', () => {
	let manager: SetTimerManager;
	let callbacks: SetTimerManagerCallbacks;

	beforeEach(() => {
		vi.useFakeTimers();
		callbacks = {
			emit: vi.fn(),
			notifyListeners: vi.fn()
		};
		manager = new SetTimerManager(callbacks);
	});

	afterEach(() => {
		manager.destroy();
		vi.useRealTimers();
	});

	describe('markStart', () => {
		it('should set start time and emit set.started', () => {
			manager.markStart(0);

			expect(manager.isActive()).toBe(true);
			expect(manager.getStartTime()).not.toBeNull();
			expect(callbacks.emit).toHaveBeenCalledWith('set.started', { exerciseIndex: 0 });
		});

		it('should calculate duration from start time', () => {
			manager.markStart(0);

			vi.advanceTimersByTime(5000);

			expect(manager.getDuration()).toBe(5);
		});
	});

	describe('countdown', () => {
		it('should start countdown and emit countdown.tick', () => {
			manager.startWithCountdown(0, 5);

			expect(manager.isCountdownActive()).toBe(true);
			expect(manager.getCountdownRemaining()).toBe(5);
			expect(callbacks.emit).toHaveBeenCalledWith('countdown.tick', { remaining: 5, exerciseIndex: 0 });
		});

		it('should tick down every second', () => {
			manager.startWithCountdown(0, 5);
			vi.clearAllMocks();

			vi.advanceTimersByTime(1000);

			expect(manager.getCountdownRemaining()).toBe(4);
			expect(callbacks.emit).toHaveBeenCalledWith('countdown.tick', { remaining: 4, exerciseIndex: 0 });
		});

		it('should emit countdown.complete and start set timer when countdown reaches 0', () => {
			manager.startWithCountdown(0, 3);
			vi.clearAllMocks();

			vi.advanceTimersByTime(3000);

			expect(manager.isCountdownActive()).toBe(false);
			expect(manager.isActive()).toBe(true);
			expect(callbacks.emit).toHaveBeenCalledWith('countdown.complete', { exerciseIndex: 0 });
			expect(callbacks.emit).toHaveBeenCalledWith('set.started', { exerciseIndex: 0 });
		});

		it('should reset countdown when startWithCountdown is called again', () => {
			manager.startWithCountdown(0, 5);
			vi.advanceTimersByTime(2000); // Now at 3
			expect(manager.getCountdownRemaining()).toBe(3);

			// Reset countdown
			vi.clearAllMocks();
			manager.startWithCountdown(0, 5);

			expect(manager.getCountdownRemaining()).toBe(5);
			expect(manager.isCountdownActive()).toBe(true);
			expect(callbacks.emit).toHaveBeenCalledWith('countdown.tick', { remaining: 5, exerciseIndex: 0 });
		});

		it('should reset set timer and restart countdown when called after countdown completed', () => {
			// Start countdown
			manager.startWithCountdown(0, 3);

			// Wait for countdown to complete (set timer starts)
			vi.advanceTimersByTime(3000);
			expect(manager.isActive()).toBe(true);
			expect(manager.isCountdownActive()).toBe(false);

			// Wait some time with set timer running
			vi.advanceTimersByTime(10000);
			expect(manager.getDuration()).toBe(10);

			// Reset - should clear set timer and restart countdown
			vi.clearAllMocks();
			manager.startWithCountdown(0, 5);

			expect(manager.getCountdownRemaining()).toBe(5);
			expect(manager.isCountdownActive()).toBe(true);
			expect(manager.isActive()).toBe(false); // Set timer should be cleared
			expect(manager.getDuration()).toBeUndefined(); // No duration since set timer cleared
			expect(callbacks.emit).toHaveBeenCalledWith('countdown.tick', { remaining: 5, exerciseIndex: 0 });
		});
	});

	describe('cancelCountdown', () => {
		it('should cancel active countdown', () => {
			manager.startWithCountdown(0, 5);
			expect(manager.isCountdownActive()).toBe(true);

			manager.cancelCountdown();

			expect(manager.isCountdownActive()).toBe(false);
			expect(manager.getCountdownRemaining()).toBeNull();
		});
	});

	describe('clear', () => {
		it('should clear set start time', () => {
			manager.markStart(0);
			expect(manager.isActive()).toBe(true);

			manager.clear();

			expect(manager.isActive()).toBe(false);
			expect(manager.getStartTime()).toBeNull();
		});
	});

	describe('destroy', () => {
		it('should clean up all state', () => {
			manager.startWithCountdown(0, 5);
			vi.advanceTimersByTime(6000);

			manager.destroy();

			expect(manager.isCountdownActive()).toBe(false);
			expect(manager.isActive()).toBe(false);
		});
	});
});
