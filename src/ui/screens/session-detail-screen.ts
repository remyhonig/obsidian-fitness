import { Notice, setIcon } from 'obsidian';
import type { ScreenContext } from '../../views/fit-view';
import type { ScreenParams, Session, Program } from '../../types';
import { BaseScreen } from './base-screen';
import { createScreenHeader } from '../components/screen-header';
import { formatDuration } from '../components/timer';
import { toFilename } from '../../data/file-utils';

/**
 * Session detail screen - shows full details of a completed session
 */
export class SessionDetailScreen extends BaseScreen {
	private sessionId: string;
	private textArea: HTMLTextAreaElement | null = null;

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

		// Copy button below header
		const copySection = this.containerEl.createDiv({ cls: 'fit-session-detail-actions' });
		const copyBtn = copySection.createEl('button', {
			cls: 'fit-button fit-button-ghost',
			attr: { 'aria-label': 'Copy for AI' }
		});
		setIcon(copyBtn, 'copy');
		copyBtn.createSpan({ text: ' Copy for AI' });
		copyBtn.addEventListener('click', () => { void this.copySession(session); });

		// Session info
		const info = this.containerEl.createDiv({ cls: 'fit-session-detail-info' });

		const date = new Date(session.date);
		const dateStr = date.toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		info.createDiv({ cls: 'fit-session-detail-date', text: dateStr });

		if (session.endTime) {
			const duration = formatDuration(session.startTime, session.endTime);
			info.createDiv({ cls: 'fit-session-detail-duration', text: `Duration: ${duration}` });
		}

		// Coach feedback section (always visible)
		const feedbackSection = this.containerEl.createDiv({ cls: 'fit-session-detail-feedback' });
		feedbackSection.createDiv({ cls: 'fit-session-detail-section-title', text: 'Coach Feedback' });

		this.textArea = feedbackSection.createEl('textarea', {
			cls: 'fit-feedback-textarea',
			attr: { placeholder: 'Add feedback from your coach or personal notes...' }
		});
		this.textArea.value = session.coachFeedback ?? '';

		// Auto-save on blur
		this.textArea.addEventListener('blur', () => {
			void this.saveFeedback(session.id);
		});

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
		}

		// Questionnaire answers section
		void this.renderReviewSection(session);
	}

	private async renderReviewSection(session: Session): Promise<void> {
		// Check if the program has questions
		const program = await this.findProgramForSession(session);
		const hasQuestions = program?.questions && program.questions.length > 0;

		// Only show review section if program has questions
		if (!hasQuestions) return;

		const hasAnswers = session.review && !session.review.skipped && session.review.answers.length > 0;

		const reviewSection = this.containerEl.createDiv({ cls: 'fit-session-detail-review' });

		// Header with title and edit button
		const reviewHeader = reviewSection.createDiv({ cls: 'fit-session-detail-review-header' });
		reviewHeader.createDiv({ cls: 'fit-session-detail-section-title', text: 'Training Review' });

		const editBtn = reviewHeader.createEl('button', {
			cls: 'fit-button fit-button-ghost fit-button-small',
			text: hasAnswers ? 'Edit answers' : 'Add answers'
		});
		editBtn.addEventListener('click', () => {
			void this.editReviewAnswers(session, program!);
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

	private async editReviewAnswers(session: Session, program: Program): Promise<void> {
		if (!program.questions || program.questions.length === 0) {
			return;
		}

		// Navigate to questionnaire with existing answers (or empty for new)
		this.ctx.view.navigateTo('questionnaire', {
			sessionId: session.id,
			programId: program.id,
			questions: program.questions
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
		const path = `${settings.basePath}/Sessions/${session.id}.md`;
		const file = this.ctx.view.app.vault.getFileByPath(path);
		if (!file) return;

		const sessionContent = await this.ctx.view.app.vault.read(file);

		// Build the full content with program description
		const parts: string[] = [];

		// 1. Program description if session belongs to a program
		const program = await this.findProgramForSession(session);
		if (program?.description) {
			parts.push(`## Program: ${program.name}\n\n${program.description}`);
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
		super.destroy();
	}
}
