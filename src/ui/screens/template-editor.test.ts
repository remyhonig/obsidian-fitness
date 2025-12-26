import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEditorScreen } from './template-editor';
import {
	createMockScreenContext,
	createSampleTemplate,
	flushPromises,
	click,
	changeInput,
	findButton
} from '../../test/mocks';

describe('TemplateEditorScreen', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	describe('rendering - new template', () => {
		it('should render header with "New template" title', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const title = container.querySelector('.fit-title');
			expect(title?.textContent).toBe('New template');
		});

		it('should render back button', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const backButton = container.querySelector('.fit-button-back');
			expect(backButton).not.toBeNull();
		});

		it('should render name input', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const nameInput = container.querySelector('input[placeholder="Push day"]') as HTMLInputElement;
			expect(nameInput).not.toBeNull();
		});

		it('should render description textarea', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const descTextarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(descTextarea).not.toBeNull();
		});

		it('should render "Add exercise" button', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Add exercise');
			expect(button).not.toBeNull();
		});

		it('should render "Save template" button', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Save template');
			expect(button).not.toBeNull();
		});

		it('should NOT render "Delete" button for new template', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Delete');
			expect(button).toBeNull();
		});

		it('should show empty state for exercises', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const emptyState = container.querySelector('.fit-empty-state');
			expect(emptyState?.textContent).toContain('No exercises added yet');
		});
	});

	describe('rendering - edit template', () => {
		it('should render header with "Edit template" title', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push' });
			screen.render();
			await flushPromises();

			const title = container.querySelector('.fit-title');
			expect(title?.textContent).toBe('Edit template');
		});

		it('should render "Delete" button for existing template', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push' });
			screen.render();
			await flushPromises();

			const button = findButton(container, 'Delete');
			expect(button).not.toBeNull();
		});

		it('should populate name input with template name', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push' });
			screen.render();
			await flushPromises();

			const nameInput = container.querySelector('input[placeholder="Push day"]') as HTMLInputElement;
			expect(nameInput.value).toBe('Push Day');
		});

		it('should render existing exercises', async () => {
			const template = createSampleTemplate({
				id: 'push',
				name: 'Push Day',
				exercises: [
					{ exercise: 'Bench Press', targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 180 },
					{ exercise: 'Overhead Press', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 }
				]
			});
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push' });
			screen.render();
			await flushPromises();

			const exerciseRows = container.querySelectorAll('.fit-template-exercise-row');
			expect(exerciseRows.length).toBe(2);
		});
	});

	describe('add exercise', () => {
		it('should add exercise row when "Add exercise" is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);

			const exerciseRows = container.querySelectorAll('.fit-template-exercise-row');
			expect(exerciseRows.length).toBe(1);
		});

		it('should add multiple exercises', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);
			click(button!);
			click(button!);

			const exerciseRows = container.querySelectorAll('.fit-template-exercise-row');
			expect(exerciseRows.length).toBe(3);
		});

		it('should render exercise name input in new row', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);

			const autocomplete = container.querySelector('.fit-autocomplete');
			expect(autocomplete).not.toBeNull();
			const nameInput = autocomplete?.querySelector('input') as HTMLInputElement;
			expect(nameInput).not.toBeNull();
			expect(nameInput.placeholder).toBe('Exercise name');
		});

		it('should render sets input in new row', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);

			const labels = container.querySelectorAll('label');
			const setsLabel = Array.from(labels).find(l => l.textContent === 'Sets');
			expect(setsLabel).not.toBeUndefined();
		});

		it('should render reps range inputs in new row', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Add exercise');
			click(button!);

			const labels = container.querySelectorAll('label');
			const repsLabel = Array.from(labels).find(l => l.textContent === 'Reps');
			expect(repsLabel).not.toBeUndefined();
		});
	});

	describe('remove exercise', () => {
		it('should render delete button for each exercise', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const addButton = findButton(container, 'Add exercise');
			click(addButton!);

			const deleteButton = container.querySelector('.fit-exercise-delete');
			expect(deleteButton).not.toBeNull();
		});

		it('should remove exercise when delete button is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const addButton = findButton(container, 'Add exercise');
			click(addButton!);
			click(addButton!);

			expect(container.querySelectorAll('.fit-template-exercise-row').length).toBe(2);

			const deleteButtons = container.querySelectorAll('.fit-exercise-delete');
			click(deleteButtons[0] as HTMLElement);

			expect(container.querySelectorAll('.fit-template-exercise-row').length).toBe(1);
		});
	});

	describe('save template', () => {
		it('should create new template when save is clicked', async () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			// Fill in template name
			const nameInput = container.querySelector('input[placeholder="Push day"]') as HTMLInputElement;
			changeInput(nameInput, 'Test Template');

			const button = findButton(container, 'Save template');
			click(button!);
			await flushPromises();

			expect(ctx.templateRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'Test Template' })
			);
			expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		});

		it('should not save if name is empty', async () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const button = findButton(container, 'Save template');
			click(button!);
			await flushPromises();

			expect(ctx.templateRepo.create).not.toHaveBeenCalled();
		});

		it('should update existing template when save is clicked', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push' });
			screen.render();
			await flushPromises();

			// Modify the name
			const nameInput = container.querySelector('input[placeholder="Push day"]') as HTMLInputElement;
			changeInput(nameInput, 'Updated Push Day');

			const button = findButton(container, 'Save template');
			click(button!);
			await flushPromises();

			expect(ctx.templateRepo.update).toHaveBeenCalledWith(
				'push',
				expect.objectContaining({ name: 'Updated Push Day' })
			);
		});
	});

	describe('delete template', () => {
		it('should delete template when delete is clicked', async () => {
			const template = createSampleTemplate({ id: 'push', name: 'Push Day' });
			const ctx = createMockScreenContext({ templates: [template] });
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false, templateId: 'push' });
			screen.render();
			await flushPromises();

			const button = findButton(container, 'Delete');
			click(button!);
			await flushPromises();

			expect(ctx.templateRepo.delete).toHaveBeenCalledWith('push');
			expect(ctx.view.navigateTo).toHaveBeenCalledWith('home');
		});
	});

	describe('navigation', () => {
		it('should go back when back button is clicked', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			const backButton = container.querySelector('.fit-button-back') as HTMLElement;
			click(backButton);

			expect(ctx.view.goBack).toHaveBeenCalled();
		});
	});

	describe('cleanup', () => {
		it('should remove container on destroy', () => {
			const ctx = createMockScreenContext();
			const screen = new TemplateEditorScreen(container, ctx, { isNew: true });
			screen.render();

			expect(container.querySelector('.fit-template-editor-screen')).not.toBeNull();

			screen.destroy();

			expect(container.querySelector('.fit-template-editor-screen')).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('should not call create or update when isNew=false and no templateId', async () => {
			const ctx = createMockScreenContext();
			// Invalid state: isNew=false but no templateId
			const screen = new TemplateEditorScreen(container, ctx, { isNew: false });
			screen.render();
			await flushPromises();

			// Fill in a name
			const nameInput = container.querySelector('input[placeholder="Push day"]') as HTMLInputElement;
			changeInput(nameInput, 'Test Template');

			// Click save
			const button = findButton(container, 'Save template');
			click(button!);
			await flushPromises();

			// Neither create nor update should be called
			expect(ctx.templateRepo.create).not.toHaveBeenCalled();
			expect(ctx.templateRepo.update).not.toHaveBeenCalled();
			// Should not navigate away
			expect(ctx.view.navigateTo).not.toHaveBeenCalled();
		});
	});
});
