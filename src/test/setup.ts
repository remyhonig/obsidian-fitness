import { vi } from 'vitest';

// Extend HTMLElement with Obsidian's methods
declare global {
	interface HTMLElement {
		createDiv(options?: { cls?: string; text?: string; attr?: Record<string, string> }): HTMLDivElement;
		createEl<K extends keyof HTMLElementTagNameMap>(
			tag: K,
			options?: { cls?: string; text?: string; attr?: Record<string, string> }
		): HTMLElementTagNameMap[K];
		createSpan(options?: { cls?: string; text?: string }): HTMLSpanElement;
		empty(): void;
		addClass(cls: string): void;
		removeClass(cls: string): void;
	}
}

// Add Obsidian-like DOM methods to HTMLElement prototype
HTMLElement.prototype.createDiv = function(options?: { cls?: string; text?: string; attr?: Record<string, string> }): HTMLDivElement {
	const div = document.createElement('div');
	if (options?.cls) div.className = options.cls;
	if (options?.text) div.textContent = options.text;
	if (options?.attr) {
		for (const [key, value] of Object.entries(options.attr)) {
			div.setAttribute(key, value);
		}
	}
	this.appendChild(div);
	return div;
};

HTMLElement.prototype.createEl = function<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	options?: { cls?: string; text?: string; attr?: Record<string, string> }
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	if (options?.cls) el.className = options.cls;
	if (options?.text) el.textContent = options.text;
	if (options?.attr) {
		for (const [key, value] of Object.entries(options.attr)) {
			el.setAttribute(key, value);
		}
	}
	this.appendChild(el);
	return el;
};

HTMLElement.prototype.createSpan = function(options?: { cls?: string; text?: string }): HTMLSpanElement {
	const span = document.createElement('span');
	if (options?.cls) span.className = options.cls;
	if (options?.text) span.textContent = options.text;
	this.appendChild(span);
	return span;
};

HTMLElement.prototype.empty = function(): void {
	while (this.firstChild) {
		this.removeChild(this.firstChild);
	}
};

HTMLElement.prototype.addClass = function(cls: string): void {
	this.classList.add(cls);
};

HTMLElement.prototype.removeClass = function(cls: string): void {
	this.classList.remove(cls);
};

// Reset DOM before each test
beforeEach(() => {
	document.body.innerHTML = '';
});

// Export vi for convenience
export { vi };
