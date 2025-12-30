/**
 * Button variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonOptions {
	text: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	icon?: string;
	disabled?: boolean;
	fullWidth?: boolean;
	onClick: () => void;
}

/**
 * Creates a styled button element
 */
export function createButton(parent: HTMLElement, options: ButtonOptions): HTMLButtonElement {
	const btn = parent.createEl('button', {
		cls: buildButtonClasses(options),
		text: options.icon ? undefined : options.text
	});

	if (options.icon) {
		btn.createSpan({ cls: 'fit-button-icon', text: options.icon });
		btn.createSpan({ text: options.text });
	}

	if (options.disabled) {
		btn.disabled = true;
	}

	btn.addEventListener('click', (e) => {
		e.preventDefault();
		if (!btn.disabled) {
			options.onClick();
		}
	});

	return btn;
}

/**
 * Builds CSS classes for button
 */
function buildButtonClasses(options: ButtonOptions): string {
	const classes = ['fit-button'];

	// Variant
	const variant = options.variant ?? 'secondary';
	classes.push(`fit-button-${variant}`);

	// Size
	const size = options.size ?? 'medium';
	classes.push(`fit-button-${size}`);

	// Full width
	if (options.fullWidth) {
		classes.push('fit-button-full');
	}

	return classes.join(' ');
}

/**
 * Creates a large primary action button (for "Complete Set", "Start Workout", etc.)
 */
export function createPrimaryAction(
	parent: HTMLElement,
	text: string,
	onClick: () => void,
	disabled?: boolean
): HTMLButtonElement {
	return createButton(parent, {
		text,
		variant: 'primary',
		size: 'large',
		fullWidth: true,
		disabled,
		onClick
	});
}

/**
 * Creates a back button
 */
export function createBackButton(parent: HTMLElement, onClick: () => void): HTMLButtonElement {
	const btn = parent.createEl('button', {
		cls: 'fit-button fit-button-ghost fit-button-back',
		attr: { 'aria-label': 'Go back' }
	});

	btn.createSpan({ text: '←' });

	btn.addEventListener('click', (e) => {
		e.preventDefault();
		onClick();
	});

	return btn;
}

/**
 * Creates an icon button (small, circular)
 */
export function createIconButton(
	parent: HTMLElement,
	icon: string,
	ariaLabel: string,
	onClick: () => void
): HTMLButtonElement {
	const btn = parent.createEl('button', {
		cls: 'fit-button fit-button-icon-only',
		text: icon,
		attr: { 'aria-label': ariaLabel }
	});

	btn.addEventListener('click', (e) => {
		e.preventDefault();
		onClick();
	});

	return btn;
}
