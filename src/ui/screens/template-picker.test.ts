import { describe, it, expect, beforeEach } from 'vitest';
import { TemplatePickerScreen } from './template-picker';
import {
	createMockScreenContext,
	createSampleTemplate,
	flushPromises,
	click,
	changeInput,
	findButton
} from '../../test/mocks';

describe('TemplatePickerScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering', () => {
		it('should render the header with back button', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const header = container.querySelector('.fit-header');
			expect(header).not.toBeNull();

			const title = container.querySelector('.fit-title');
			expect(title?.textContent).toBe('Start workout');
		});

		it('should render search input', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			expect(searchInput).not.toBeNull();
			expect(searchInput.placeholder).toBe('Search templates...');
		});

		it('should render template cards', async () => {
			const templates = [
				createSampleTemplate({ id: 'push', name: 'Push Day' }),
				createSampleTemplate({ id: 'pull', name: 'Pull Day' })
			];
			const ctx = createMockScreenContext({ templates });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const templateCards = container.querySelectorAll('.fit-template-card');
			expect(templateCards.length).toBe(2);
		});

		it('should show empty state when no templates exist', async () => {
			const ctx = createMockScreenContext({ templates: [] });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState).not.toBeNull();
			expect(emptyState?.textContent).toContain('No templates yet');
		});

		it('should render "Start empty workout" button', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Start empty workout');
			expect(button).not.toBeNull();
		});

		it('should render "Create new template" button', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Create new template');
			expect(button).not.toBeNull();
		});
	});

	describe('search', () => {
		it('should filter templates by name', async () => {
			const templates = [
				createSampleTemplate({ id: 'push', name: 'Push Day' }),
				createSampleTemplate({ id: 'pull', name: 'Pull Day' }),
				createSampleTemplate({ id: 'legs', name: 'Leg Day' })
			];
			const ctx = createMockScreenContext({ templates });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'push');

			const templateCards = container.querySelectorAll('.fit-template-card');
			expect(templateCards.length).toBe(1);
		});

		it('should show no results message when search yields nothing', async () => {
			const templates = [createSampleTemplate({ id: 'push', name: 'Push Day' })];
			const ctx = createMockScreenContext({ templates });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'nonexistent');

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState).not.toBeNull();
			expect(emptyState?.textContent).toBe('No templates found');
		});

		it('should filter by description', async () => {
			const templates = [
				createSampleTemplate({ id: 'push', name: 'Push Day', description: 'Chest and triceps' }),
				createSampleTemplate({ id: 'pull', name: 'Pull Day', description: 'Back and biceps' })
			];
			const ctx = createMockScreenContext({ templates });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const searchInput = container.querySelector('.fit-search-input') as HTMLInputElement;
			changeInput(searchInput, 'biceps');

			const templateCards = container.querySelectorAll('.fit-template-card');
			expect(templateCards.length).toBe(1);
		});
	});

	describe('navigation', () => {
		it('should go back when back button is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const backButton = container.querySelector('.fit-button-back') as HTMLElement;
			expect(backButton).not.toBeNull();
			click(backButton);

			expect(ctx.view.goBack).toHaveBeenCalled();
		});

		it('should navigate to template-editor when "Create new template" is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Create new template');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.view.navigateTo).toHaveBeenCalledWith('template-editor', { isNew: true });
		});
	});

	describe('template selection', () => {
		it('should start session from template when template card is clicked', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const templateCard = container.querySelector('.fit-template-card') as HTMLElement;
			expect(templateCard).not.toBeNull();
			click(templateCard);

			expect(ctx.sessionState.startFromTemplate).toHaveBeenCalledWith(template);
			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		});

		it('should not start session if active session exists', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const activeSession = { id: 'active', status: 'active' as const, date: '2025-01-01', startTime: '', exercises: [] };
			const ctx = createMockScreenContext({ templates: [template], activeSession });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();
			await flushPromises();

			const templateCard = container.querySelector('.fit-template-card') as HTMLElement;
			click(templateCard);

			expect(ctx.sessionState.startFromTemplate).not.toHaveBeenCalled();
			expect(ctx.view.navigateTo).not.toHaveBeenCalledWith('session');
		});
	});

	describe('empty workout', () => {
		it('should start empty session when "Start empty workout" is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Start empty workout');
			expect(button).not.toBeNull();
			click(button!);

			expect(ctx.sessionState.startEmpty).toHaveBeenCalled();
			expect(ctx.view.navigateTo).toHaveBeenCalledWith('session');
		});

		it('should not start empty session if active session exists', () => {
			const activeSession = { id: 'active', status: 'active' as const, date: '2025-01-01', startTime: '', exercises: [] };
			const ctx = createMockScreenContext({ activeSession });
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			const button = findButton(container, 'Start empty workout');
			click(button!);

			expect(ctx.sessionState.startEmpty).not.toHaveBeenCalled();
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplatePickerScreen(container, ctx);
			screen.render();

			expect(container.querySelector('.fit-template-picker-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-template-picker-screen')).toBeNull();
		});
	});
});
