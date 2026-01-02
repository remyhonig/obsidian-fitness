import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestTimerManager, type RestTimerManagerCallbacks } from './rest-timer-manager';

describe('RestTimerManager', () => {
	let manager: RestTimerManager;
	let callbacks: RestTimerManagerCallbacks;

	beforeEach(() => {
		vi.useFakeTimers();
		callbacks = {
			emit: vi.fn(),
			onComplete: vi.fn(),
			notifyListeners: vi.fn()
		};
		manager = new RestTimerManager(callbacks);
	});

	afterEach(() => {
		manager.destroy();
		vi.useRealTimers();
	});

	describe('rest period tracking', () => {
		it('should track rest start time when timer starts', () => {
			manager.start(120, 0);

			const restData = manager.getRestPeriodData();

			expect(restData).not.toBeNull();
			expect(restData?.exerciseIndex).toBe(0);
			expect(restData?.extraSeconds).toBe(0);
			expect(restData?.startTime).toBeGreaterThan(0);
		});

		it('should accumulate extra seconds when time is added', () => {
			manager.start(120, 0);

			manager.addTime(15);
			expect(manager.getRestPeriodData()?.extraSeconds).toBe(15);

			manager.addTime(30);
			expect(manager.getRestPeriodData()?.extraSeconds).toBe(45);

			manager.addTime(15);
			expect(manager.getRestPeriodData()?.extraSeconds).toBe(60);
		});

		it('should preserve rest data after timer is cancelled', () => {
			manager.start(120, 0);
			manager.addTime(30);

			manager.cancel();

			// Rest data should still be available for recording
			const restData = manager.getRestPeriodData();
			expect(restData).not.toBeNull();
			expect(restData?.extraSeconds).toBe(30);
		});

		it('should clear rest data when clearRestPeriodData is called', () => {
			manager.start(120, 0);
			manager.addTime(15);

			manager.clearRestPeriodData();

			expect(manager.getRestPeriodData()).toBeNull();
		});

		it('should reset extra seconds when new timer starts', () => {
			manager.start(120, 0);
			manager.addTime(30);

			// Start new timer
			manager.start(90, 1);

			const restData = manager.getRestPeriodData();
			expect(restData?.extraSeconds).toBe(0);
			expect(restData?.exerciseIndex).toBe(1);
		});

		it('should return null when no rest period has been started', () => {
			expect(manager.getRestPeriodData()).toBeNull();
		});

		it('should track correct exercise index', () => {
			manager.start(120, 2);

			expect(manager.getRestPeriodData()?.exerciseIndex).toBe(2);
		});
	});

	describe('timer functionality', () => {
		it('should emit timer.started when starting', () => {
			manager.start(120, 0);

			expect(callbacks.emit).toHaveBeenCalledWith('timer.started', {
				exerciseIndex: 0,
				duration: 120
			});
		});

		it('should emit timer.extended when adding time', () => {
			manager.start(120, 0);
			vi.clearAllMocks();

			manager.addTime(30);

			expect(callbacks.emit).toHaveBeenCalledWith('timer.extended', {
				additionalSeconds: 30
			});
		});

		it('should extend timer duration when adding time', () => {
			manager.start(120, 0);

			manager.addTime(30);

			expect(manager.getState()?.duration).toBe(150);
		});

		it('should calculate remaining time correctly', () => {
			manager.start(120, 0);

			// Advance 30 seconds
			vi.advanceTimersByTime(30000);

			expect(manager.getRemaining()).toBe(90);
		});

		it('should report active state correctly', () => {
			expect(manager.isActive()).toBe(false);

			manager.start(120, 0);
			expect(manager.isActive()).toBe(true);

			manager.cancel();
			expect(manager.isActive()).toBe(false);
		});
	});

	describe('destroy', () => {
		it('should clear all tracking data on destroy', () => {
			manager.start(120, 0);
			manager.addTime(30);

			manager.destroy();

			expect(manager.getRestPeriodData()).toBeNull();
			expect(manager.getState()).toBeNull();
		});
	});
});
