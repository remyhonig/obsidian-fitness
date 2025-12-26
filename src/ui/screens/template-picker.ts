import type { Screen, ScreenContext } from '../../views/fit-view';
import { createBackButton, createButton } from '../components/button';
import { createTemplateCard } from '../components/card';
import type { Template } from '../../types';

/**
 * Template picker screen for starting a workout
 */
export class TemplatePickerScreen implements Screen {
	private containerEl: HTMLElement;
	private templates: Template[] = [];
	private searchQuery = '';
	private resultsEl: HTMLElement | null = null;

	constructor(
		parentEl: HTMLElement,
		private ctx: ScreenContext
	) {
		this.containerEl = parentEl.createDiv({ cls: 'fit-screen fit-template-picker-screen' });
	}

	render(): void {
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createDiv({ cls: 'fit-header' });
		createBackButton(header, () => this.ctx.view.goBack());
		header.createEl('h1', { text: 'Start workout', cls: 'fit-title' });

		// Search bar
		const searchContainer = this.containerEl.createDiv({ cls: 'fit-search-container' });
		const searchInput = searchContainer.createEl('input', {
			cls: 'fit-search-input',
			attr: {
				type: 'text',
				placeholder: 'Search templates...'
			}
		});

		searchInput.addEventListener('input', (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			this.renderResults();
		});

		// Load templates
		void this.ctx.templateRepo.list().then(templates => {
			this.templates = templates;
			this.renderResults();
		});

		// Results container
		this.resultsEl = this.containerEl.createDiv({ cls: 'fit-template-list' });

		// Empty workout option
		const emptyOption = this.containerEl.createDiv({ cls: 'fit-empty-workout-option' });
		createButton(emptyOption, {
			text: 'Start empty workout',
			variant: 'ghost',
			fullWidth: true,
			onClick: () => { void this.startEmptyWorkout(); }
		});

		// Create template link
		const createLink = this.containerEl.createDiv({ cls: 'fit-create-template-link' });
		createButton(createLink, {
			text: 'Create new template',
			variant: 'ghost',
			onClick: () => this.ctx.view.navigateTo('template-editor', { isNew: true })
		});
	}

	private renderResults(): void {
		if (!this.resultsEl) return;
		this.resultsEl.empty();

		// Filter templates by search query
		let filtered = this.templates;
		if (this.searchQuery) {
			const query = this.searchQuery.toLowerCase();
			filtered = this.templates.filter(t =>
				t.name.toLowerCase().includes(query) ||
				t.description?.toLowerCase().includes(query)
			);
		}

		if (filtered.length === 0) {
			if (this.searchQuery) {
				this.resultsEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No templates found'
				});
			} else {
				this.resultsEl.createDiv({
					cls: 'fit-empty-state',
					text: 'No templates yet. Create your first template!'
				});
			}
			return;
		}

		for (const template of filtered) {
			createTemplateCard(this.resultsEl, {
				name: template.name,
				description: template.description,
				exerciseCount: template.exercises.length,
				onClick: () => { void this.selectTemplate(template); }
			});
		}
	}

	private async selectTemplate(template: Template): Promise<void> {
		// Check for active session with completed sets
		if (this.ctx.sessionState.hasActiveSession()) {
			const session = this.ctx.sessionState.getSession();
			const hasCompletedSets = session?.exercises.some(ex =>
				ex.sets.some(s => s.completed)
			) ?? false;

			if (hasCompletedSets) {
				// Has real progress - don't override
				this.ctx.view.navigateTo('session');
				return;
			}

			// No completed sets - discard empty session (must await to avoid race condition)
			await this.ctx.sessionState.discardSession();
		}

		// Start session from template
		this.ctx.sessionState.startFromTemplate(template);
		this.ctx.view.navigateTo('session');
	}

	private async startEmptyWorkout(): Promise<void> {
		// Check for active session with completed sets
		if (this.ctx.sessionState.hasActiveSession()) {
			const session = this.ctx.sessionState.getSession();
			const hasCompletedSets = session?.exercises.some(ex =>
				ex.sets.some(s => s.completed)
			) ?? false;

			if (hasCompletedSets) {
				// Has real progress - navigate to it
				this.ctx.view.navigateTo('session');
				return;
			}

			// No completed sets - discard empty session (must await to avoid race condition)
			await this.ctx.sessionState.discardSession();
		}

		// Start empty session
		this.ctx.sessionState.startEmpty();
		this.ctx.view.navigateTo('session');
	}

	destroy(): void {
		this.containerEl.remove();
	}
}
