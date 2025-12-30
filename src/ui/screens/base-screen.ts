import type { Screen, ScreenContext } from '../../views/fit-view';
import type { ScreenHeaderRefs } from '../components/screen-header';

/**
 * Base class for all screens. Provides common functionality for:
 * - Container element management
 * - Event subscription cleanup
 * - Abort controller for async operations
 * - Header refs management
 */
export abstract class BaseScreen implements Screen {
	protected containerEl: HTMLElement;
	protected ctx: ScreenContext;
	protected abortController: AbortController | null = null;
	protected headerRefs: ScreenHeaderRefs | null = null;
	private eventUnsubscribers: (() => void)[] = [];

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		screenClass: string
	) {
		this.ctx = ctx;
		this.containerEl = parentEl.createDiv({ cls: `fit-screen ${screenClass}` });
	}

	/**
	 * Render the screen content. Subclasses must implement this.
	 */
	abstract render(): void;

	/**
	 * Subscribe to an event. The subscription will be automatically cleaned up on destroy.
	 */
	protected subscribe(unsubscribe: () => void): void {
		this.eventUnsubscribers.push(unsubscribe);
	}

	/**
	 * Unsubscribe from all events. Call this at the start of render() to clean up previous subscriptions.
	 */
	protected unsubscribeAll(): void {
		for (const unsub of this.eventUnsubscribers) {
			unsub();
		}
		this.eventUnsubscribers = [];
	}

	/**
	 * Abort any in-flight async operations and create a new abort controller.
	 * Returns the signal to pass to async operations.
	 */
	protected resetAbortController(): AbortSignal {
		this.abortController?.abort();
		this.abortController = new AbortController();
		return this.abortController.signal;
	}

	/**
	 * Clean up header refs. Call this at the start of render() if using header.
	 */
	protected cleanupHeader(): void {
		this.headerRefs?.destroy();
		this.headerRefs = null;
	}

	/**
	 * Prepare for a fresh render by cleaning up previous state.
	 * Call this at the start of render().
	 */
	protected prepareRender(): void {
		this.unsubscribeAll();
		this.cleanupHeader();
		this.containerEl.empty();
	}

	/**
	 * Clean up all resources. Subclasses should call super.destroy() if they override.
	 */
	destroy(): void {
		this.abortController?.abort();
		this.abortController = null;
		this.unsubscribeAll();
		this.headerRefs?.destroy();
		this.headerRefs = null;
		this.containerEl.remove();
	}
}
