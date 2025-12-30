import { Notice, setIcon, MarkdownRenderer } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Session, Program } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { formatDuration } from '../components/timer';
import { toFilename, resolveTransclusions, parseDescriptionSection, parseFrontmatter } from '../../data/file-utils';
import { parseCoachFeedbackYaml, validateFeedbackAgainstSession, findExerciseFeedback } from '../../data/coach-feedback-parser';
import { createFeedbackStatusCallout, type FeedbackStatusCalloutRefs } from '../components/feedback-status-callout';
import type { FeedbackValidationStatus, StructuredCoachFeedback } from '../../data/coach-feedback-types';

/**
 * Session detail screen - shows full details of a completed session
 */
export class SessionDetailScreen extends BaseScreen {
	private sessionId: string;
	private textArea: HTMLTextAreaElement | null = null;
	private feedbackSection: HTMLElement | null = null;
	private currentSession: Session | null = null;
	private feedbackStatusRefs: FeedbackStatusCalloutRefs | null = null;
	private currentValidationStatus: FeedbackValidationStatus | null = null;
	private parsedFeedback: StructuredCoachFeedback | null = null;

	constructor(
		parentEl: HTMLElement,
		ctx: ScreenContext,
		params: ScreenParams
	) {
		super(parentEl, ctx, 'fit-session-detail-screen');
		this.sessionId = params.sessionId ?? '';
	}

	render(): void {
		this.prepareRender();

		// Load session and render
		void this.loadAndRender();
	}

	private async loadAndRender(): Promise<void> {
		const session = await this.ctx.sessionRepo.get(this.sessionId);

		if (!session) {
			this.containerEl.createDiv({
				cls: 'fit-empty-state',
				text: 'Session not found'
			});
			return;
		}

		this.renderContent(session);
	}

	private renderContent(session: Session): void {
		// Header with consistent screen-header component
		this.headerRefs = createScreenHeader(this.containerEl, {
			leftElement: 'back',
			fallbackWorkoutName: session.workout ?? 'Workout',
			view: this.ctx.view,
			sessionState: this.ctx.sessionState,
			onBack: () => this.ctx.view.goBack()
		});

		// Session info (date)
		const info = this.containerEl.createDiv({ cls: 'fit-session-detail-info' });

		const date = new Date(session.date);
		const dateStr = date.toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		info.createDiv({ cls: 'fit-session-detail-date', text: dateStr });

		// Stats section (same as finish screen)
		this.renderStats(session);

		// Store session for later use
		this.currentSession = session;

		// Parse feedback once for use in multiple places
		this.parsedFeedback = session.coachFeedback
			? parseCoachFeedbackYaml(session.coachFeedback)
			: null;

		// Coach feedback section (always visible)
		this.feedbackSection = this.containerEl.createDiv({ cls: 'fit-session-detail-feedback' });
		this.renderFeedbackSection(session.coachFeedback ? 'view' : 'edit');

		// Exercises section
		const exercisesSection = this.containerEl.createDiv({ cls: 'fit-session-detail-exercises' });
		exercisesSection.createDiv({ cls: 'fit-session-detail-section-title', text: 'Exercises' });

		const unit = this.ctx.settings.weightUnit;

		for (const exercise of session.exercises) {
			const completedSets = exercise.sets.filter(s => s.completed);
			if (completedSets.length === 0) continue;

			const exerciseCard = exercisesSection.createDiv({ cls: 'fit-session-detail-exercise' });

			// Exercise name with rest time
			const nameRow = exerciseCard.createDiv({ cls: 'fit-session-detail-exercise-header' });
			nameRow.createSpan({ cls: 'fit-session-detail-exercise-name', text: exercise.exercise });
			if (exercise.restSeconds > 0) {
				nameRow.createSpan({
					cls: 'fit-session-detail-exercise-rest',
					text: `${exercise.restSeconds}s rest`
				});
			}

			// Sets
			const setsContainer = exerciseCard.createDiv({ cls: 'fit-session-detail-sets' });
			for (const set of completedSets) {
				let setText = `${set.reps} reps @ ${set.weight}${unit}`;
				if (set.rpe !== undefined) {
					setText += ` (RPE ${set.rpe})`;
				}
				setsContainer.createDiv({ cls: 'fit-session-detail-set', text: setText });
			}

			// Exercise-specific feedback from structured coach feedback
			if (this.parsedFeedback) {
				const exerciseFeedback = findExerciseFeedback(this.parsedFeedback, exercise.exercise);
				if (exerciseFeedback) {
					this.renderExerciseFeedback(exerciseCard, exerciseFeedback);
				}
			}
		}

		// Questionnaire answers section
		void this.renderReviewSection(session);
	}

	private renderFeedbackSection(mode: 'view' | 'edit'): void {
		if (!this.feedbackSection || !this.currentSession) return;

		// Clear existing content
		this.feedbackSection.empty();

		const feedback = this.currentSession.coachFeedback ?? '';

		// Header row with title and action button
		const feedbackHeader = this.feedbackSection.createDiv({ cls: 'fit-session-detail-section-header' });
		feedbackHeader.createDiv({ cls: 'fit-session-detail-section-title', text: 'Coach Feedback' });

		if (mode === 'view' && feedback) {
			// View mode: show Edit button
			const editBtn = feedbackHeader.createEl('button', {
				cls: 'fit-button fit-button-ghost fit-button-small',
				attr: { 'aria-label': 'Edit feedback' }
			});
			setIcon(editBtn, 'pencil');
			editBtn.createSpan({ text: ' Edit' });
			editBtn.addEventListener('click', () => {
				this.renderFeedbackSection('edit');
			});

			// Try to render structured feedback, fall back to markdown
			const contentEl = this.feedbackSection.createDiv({ cls: 'fit-feedback-content' });

			if (this.parsedFeedback) {
				this.renderStructuredFeedback(contentEl);
			} else {
				// Fallback to raw markdown
				void MarkdownRenderer.render(
					this.ctx.app,
					feedback,
					contentEl,
					'',
					this.ctx.view
				);
			}
		} else {
			// Edit mode: show Copy for AI button
			const copyBtn = feedbackHeader.createEl('button', {
				cls: 'fit-button fit-button-ghost fit-button-small',
				attr: { 'aria-label': 'Copy for AI' }
			});
			setIcon(copyBtn, 'copy');
			copyBtn.createSpan({ text: ' Copy for AI' });
			copyBtn.addEventListener('click', () => { void this.copySession(this.currentSession!); });

			// Status callout for feedback validation (above textarea)
			const statusContainer = this.feedbackSection.createDiv({ cls: 'fit-feedback-status-container' });
			this.feedbackStatusRefs = createFeedbackStatusCallout(statusContainer, {
				status: this.currentValidationStatus
			});

			// Show textarea
			this.textArea = this.feedbackSection.createEl('textarea', {
				cls: 'fit-feedback-textarea',
				attr: { placeholder: 'Add feedback from your coach or personal notes...' }
			});
			this.textArea.value = feedback;

			// Real-time parsing and validation on input
			this.textArea.addEventListener('input', () => {
				this.parseAndValidateFeedback();
			});

			// Initial parse if there's existing content
			if (feedback) {
				this.parseAndValidateFeedback();
			}

			// Auto-save on blur and switch to view mode if there's content
			this.textArea.addEventListener('blur', () => {
				void this.saveFeedback(this.currentSession!.id).then(() => {
					// Update the stored feedback value
					if (this.currentSession && this.textArea) {
						this.currentSession.coachFeedback = this.textArea.value.trim();
						// Switch to view mode if there's content
						if (this.currentSession.coachFeedback) {
							this.renderFeedbackSection('view');
						}
					}
				});
			});

			// Focus the textarea when entering edit mode
			if (feedback) {
				this.textArea.focus();
			}
		}
	}

	private parseAndValidateFeedback(): void {
		const content = this.textArea?.value ?? '';
		const parsed = parseCoachFeedbackYaml(content);

		if (parsed) {
			// Valid structured YAML - show validation status
			const sessionExercises = this.currentSession?.exercises.map(e => e.exercise) ?? [];
			this.currentValidationStatus = validateFeedbackAgainstSession(parsed, sessionExercises);
		} else {
			// Plain text or empty - hide status callout (will be shown as markdown)
			this.currentValidationStatus = null;
		}

		this.feedbackStatusRefs?.update(this.currentValidationStatus);
	}

	private renderStructuredFeedback(parent: HTMLElement): void {
		if (!this.parsedFeedback) return;

		// Training tips (gymfloor_acties)
		if (this.parsedFeedback.gymfloor_acties && this.parsedFeedback.gymfloor_acties.length > 0) {
			const section = parent.createDiv({ cls: 'fit-structured-feedback-section' });
			section.createDiv({ cls: 'fit-structured-feedback-title', text: 'Training Tips' });
			const list = section.createEl('ul', { cls: 'fit-structured-feedback-list' });
			for (const actie of this.parsedFeedback.gymfloor_acties) {
				list.createEl('li', { text: actie.actie });
			}
		}

		// Motivation
		if (this.parsedFeedback.motivatie_boost) {
			const section = parent.createDiv({ cls: 'fit-structured-feedback-section' });
			section.createDiv({ cls: 'fit-structured-feedback-title', text: 'Motivation' });
			section.createDiv({
				cls: 'fit-structured-feedback-motivation',
				text: this.parsedFeedback.motivatie_boost.tekst
			});
		}

		// Note about exercise feedback
		if (this.parsedFeedback.analyse_en_context && this.parsedFeedback.analyse_en_context.length > 0) {
			const note = parent.createDiv({ cls: 'fit-structured-feedback-note' });
			note.setText(`Exercise-specific feedback shown below each exercise (${this.parsedFeedback.analyse_en_context.length} exercises)`);
		}
	}

	private renderExerciseFeedback(parent: HTMLElement, feedback: import('../../data/coach-feedback-types').ExerciseFeedback): void {
		const container = parent.createDiv({ cls: 'fit-exercise-feedback' });

		// Coach cue (most important)
		if (feedback.coach_cue_volgende_sessie) {
			const cueSection = container.createDiv({ cls: 'fit-exercise-feedback-item fit-exercise-feedback-cue' });
			cueSection.createSpan({ cls: 'fit-exercise-feedback-label', text: 'Coach cue: ' });
			cueSection.createSpan({ cls: 'fit-exercise-feedback-value', text: feedback.coach_cue_volgende_sessie });
		}

		// Approach for next session
		if (feedback.aanpak_volgende_sessie) {
			const approachSection = container.createDiv({ cls: 'fit-exercise-feedback-item' });
			approachSection.createSpan({ cls: 'fit-exercise-feedback-label', text: 'Approach: ' });
			approachSection.createSpan({ cls: 'fit-exercise-feedback-value', text: feedback.aanpak_volgende_sessie });
		}

		// Stimulus
		if (feedback.stimulus) {
			const stimulusSection = container.createDiv({ cls: 'fit-exercise-feedback-item' });
			stimulusSection.createSpan({ cls: 'fit-exercise-feedback-label', text: 'Stimulus: ' });
			stimulusSection.createSpan({ cls: 'fit-exercise-feedback-value', text: feedback.stimulus });
		}

		// Set degradation
		if (feedback.set_degradatie_en_vermoeidheid) {
			const degradationSection = container.createDiv({ cls: 'fit-exercise-feedback-item' });
			degradationSection.createSpan({ cls: 'fit-exercise-feedback-label', text: 'Set analysis: ' });
			degradationSection.createSpan({ cls: 'fit-exercise-feedback-value', text: feedback.set_degradatie_en_vermoeidheid });
		}

		// Progress vs previous
		if (feedback.progressie_tov_vorige) {
			const progressSection = container.createDiv({ cls: 'fit-exercise-feedback-item' });
			progressSection.createSpan({ cls: 'fit-exercise-feedback-label', text: 'Progress: ' });
			progressSection.createSpan({ cls: 'fit-exercise-feedback-value', text: feedback.progressie_tov_vorige });
		}
	}

	private renderStats(session: Session): void {
		const stats = this.containerEl.createDiv({ cls: 'fit-finish-stats' });

		// Duration
		if (session.endTime) {
			const duration = formatDuration(session.startTime, session.endTime);
			this.renderStat(stats, 'Duration', duration);
		}

		// Total sets
		const totalSets = this.ctx.sessionRepo.countCompletedSets(session);
		this.renderStat(stats, 'Sets', String(totalSets));

		// Total volume
		const volume = this.ctx.sessionRepo.calculateVolume(session);
		const unit = this.ctx.settings.weightUnit;
		this.renderStat(stats, 'Volume', `${volume.toLocaleString()} ${unit}`);

		// Exercises
		const exercisesWithSets = session.exercises.filter(e =>
			e.sets.some(s => s.completed)
		).length;
		this.renderStat(stats, 'Exercises', String(exercisesWithSets));
	}

	private renderStat(parent: HTMLElement, label: string, value: string): void {
		const stat = parent.createDiv({ cls: 'fit-finish-stat' });
		stat.createDiv({ cls: 'fit-finish-stat-value', text: value });
		stat.createDiv({ cls: 'fit-finish-stat-label', text: label });
	}

	private async renderReviewSection(session: Session): Promise<void> {
		// Check if the program has questions
		const program = await this.findProgramForSession(session);
		const hasQuestions = program?.questions && program.questions.length > 0;

		// Only show review section if program has questions
		if (!hasQuestions || !program) return;

		const hasAnswers = session.review && !session.review.skipped && session.review.answers.length > 0;

		const reviewSection = this.containerEl.createDiv({ cls: 'fit-session-detail-review' });

		// Header with title and edit button
		const reviewHeader = reviewSection.createDiv({ cls: 'fit-session-detail-review-header' });
		reviewHeader.createDiv({ cls: 'fit-session-detail-section-title', text: 'Training Review' });

		// Capture program in a const for the closure
		const capturedProgram = program;
		const editBtn = reviewHeader.createEl('button', {
			cls: 'fit-button fit-button-ghost fit-button-small',
			text: hasAnswers ? 'Edit answers' : 'Add answers'
		});
		editBtn.addEventListener('click', () => {
			this.editReviewAnswers(session, capturedProgram);
		});

		if (hasAnswers) {
			// Show answers
			for (const answer of session.review!.answers) {
				const answerCard = reviewSection.createDiv({ cls: 'fit-session-detail-answer' });
				answerCard.createDiv({ cls: 'fit-session-detail-answer-question', text: answer.questionText });
				answerCard.createDiv({ cls: 'fit-session-detail-answer-response', text: answer.selectedOptionLabel });

				if (answer.freeText) {
					answerCard.createDiv({ cls: 'fit-session-detail-answer-freetext', text: answer.freeText });
				}
			}
		} else {
			// Show empty state
			reviewSection.createDiv({
				cls: 'fit-empty-state fit-empty-state-small',
				text: 'No review answers yet'
			});
		}
	}

	private editReviewAnswers(session: Session, program: Program): void {
		if (!program.questions || program.questions.length === 0) {
			return;
		}

		// Navigate to questionnaire with existing answers (or empty for new)
		// Pass fromScreen so questionnaire knows to show back/cancel buttons
		this.ctx.view.navigateTo('questionnaire', {
			sessionId: session.id,
			programId: program.id,
			questions: program.questions,
			fromScreen: 'session-detail'
		});
	}

	private async saveFeedback(sessionId: string): Promise<void> {
		const feedback = this.textArea?.value.trim() ?? '';
		await this.ctx.sessionRepo.setCoachFeedback(sessionId, feedback);
		if (feedback) {
			new Notice('Feedback saved');
		}
	}

	private async copySession(session: Session): Promise<void> {
		const settings = this.ctx.settings;
		const sessionPath = `${settings.basePath}/Sessions/${session.id}.md`;
		const sessionFile = this.ctx.view.app.vault.getFileByPath(sessionPath);
		if (!sessionFile) return;

		const sessionContent = await this.ctx.view.app.vault.read(sessionFile);

		// Build the full content with program description
		const parts: string[] = [];

		// 1. Program description if session belongs to a program (with resolved transclusions)
		const program = await this.findProgramForSession(session);
		if (program) {
			const programPath = `${settings.basePath}/Programs/${program.id}.md`;
			const programFile = this.ctx.view.app.vault.getFileByPath(programPath);
			if (programFile) {
				// Resolve transclusions using Obsidian's metadata cache
				const resolvedContent = await resolveTransclusions(this.ctx.app, programFile);
				// Separate frontmatter from body, then parse description from body
				const { body } = parseFrontmatter(resolvedContent);
				const description = parseDescriptionSection(body);
				if (description) {
					parts.push(`## Program: ${program.name}\n\n${description}`);
				}
			}
		}

		// 2. Session data
		parts.push(sessionContent);

		const content = parts.join('\n\n---\n\n');
		await navigator.clipboard.writeText(content);
		new Notice('Copied to clipboard');
	}

	/**
	 * Finds the program that contains the workout used in this session
	 */
	private async findProgramForSession(session: Session): Promise<Program | null> {
		if (!session.workout) return null;

		const workoutId = toFilename(session.workout);
		const programs = await this.ctx.programRepo.list();

		for (const program of programs) {
			if (program.workouts.includes(workoutId)) {
				return program;
			}
		}

		return null;
	}

	destroy(): void {
		this.feedbackStatusRefs?.destroy();
		this.feedbackStatusRefs = null;
		super.destroy();
	}
}
