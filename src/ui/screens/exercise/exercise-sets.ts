/**
 * Sets display component for exercise screen
 */

import { setIcon } from 'obsidian';
import { formatWeight } from '../../components/stepper';
import type { SessionExercise } from '../../../types';
import type { SessionRepository } from '../../../data/session-repository';

export interface IntegratedSetsOptions {
	exercise: SessionExercise;
	weightUnit: string;
	sessionRepo: SessionRepository;
	onDeleteSet: (setIndex: number) => Promise<void>;
}

/**
 * Renders integrated sets row - interweaved: history1, current1, history2, current2...
 */
export function renderIntegratedSets(
	parent: HTMLElement,
	options: IntegratedSetsOptions
): void {
	const { exercise, weightUnit, sessionRepo, onDeleteSet } = options;
	const currentSets = exercise.sets;

	// Create placeholder containers for each set pair (history + current)
	const setContainers: HTMLElement[] = [];
	const maxCurrentSets = currentSets.length;

	// Pre-create containers and render current sets synchronously
	for (let i = 0; i < maxCurrentSets; i++) {
		// Container for this pair
		const pairContainer = parent.createDiv({ cls: 'fit-set-pair' });
		setContainers.push(pairContainer);

		// Placeholder for history (will be filled async)
		pairContainer.createDiv({ cls: 'fit-set-history-placeholder', attr: { 'data-index': String(i) } });

		// Current set (rendered now)
		const currSet = currentSets[i];
		if (currSet) {
			const chip = pairContainer.createDiv({ cls: 'fit-set-chip fit-set-chip-current' });
			const weightDisplay = formatWeight(currSet.weight);
			chip.createSpan({
				cls: 'fit-set-chip-text',
				text: `${currSet.reps}×${weightDisplay}${currSet.weight === 0 ? '' : weightUnit}`
			});

			const deleteBtn = chip.createEl('button', { cls: 'fit-set-chip-delete' });
			try { setIcon(deleteBtn, 'x'); } catch { deleteBtn.textContent = 'X'; }
			const setIndex = i;
			deleteBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				void onDeleteSet(setIndex);
			});
		}
	}

	// Load history async and insert into placeholders
	void sessionRepo.list().then(sessions => {
		const exerciseName = exercise.exercise.toLowerCase();
		let historySets: Array<{ weight: number; reps: number }> = [];

		// Find most recent completed session with this exercise
		for (const session of sessions) {
			const sessionEx = session.exercises.find(
				e => e.exercise.toLowerCase() === exerciseName
			);
			if (sessionEx && sessionEx.sets.length > 0) {
				historySets = sessionEx.sets.filter(s => s.completed).map(s => ({
					weight: s.weight,
					reps: s.reps
				}));
				break;
			}
		}

		// Fill in history chips at their placeholders
		for (let i = 0; i < historySets.length; i++) {
			const histSet = historySets[i];
			if (!histSet) continue;

			// Find or create container for this index
			let container: HTMLElement;
			if (i < setContainers.length) {
				container = setContainers[i]!;
			} else {
				// More history than current - create new container
				container = parent.createDiv({ cls: 'fit-set-pair' });
				setContainers.push(container);
			}

			// Find placeholder and replace with actual chip
			const placeholder = container.querySelector('.fit-set-history-placeholder');
			const chip = document.createElement('div');
			chip.className = 'fit-set-chip fit-set-chip-history';
			const textSpan = document.createElement('span');
			textSpan.className = 'fit-set-chip-text';
			const histWeightDisplay = formatWeight(histSet.weight);
			textSpan.textContent = `${histSet.reps}×${histWeightDisplay}${histSet.weight === 0 ? '' : weightUnit}`;
			chip.appendChild(textSpan);

			if (placeholder) {
				placeholder.replaceWith(chip);
			} else {
				// Insert at beginning of container
				container.insertBefore(chip, container.firstChild);
			}
		}

		// Remove any remaining empty placeholders
		parent.querySelectorAll('.fit-set-history-placeholder').forEach(p => p.remove());
	});
}

export interface CurrentSetsOptions {
	exercise: SessionExercise;
	weightUnit: string;
	onDeleteSet: (setIndex: number) => Promise<void>;
}

/**
 * Renders current session sets
 */
export function renderCurrentSets(
	parent: HTMLElement,
	options: CurrentSetsOptions
): void {
	const { exercise, weightUnit, onDeleteSet } = options;

	if (exercise.sets.length === 0) return;

	const section = parent.createDiv({ cls: 'fit-sets-logged' });
	section.createDiv({ cls: 'fit-card-title', text: 'This Session' });

	// Horizontal scrollable row of compact set chips
	const row = section.createDiv({ cls: 'fit-sets-chips' });

	for (let i = 0; i < exercise.sets.length; i++) {
		const set = exercise.sets[i];
		if (!set) continue;

		// Compact chip with notation: "8×40kg" (reps×weight) or "8×BW" for body weight
		const chip = row.createDiv({ cls: 'fit-set-chip' });
		const setWeightDisplay = formatWeight(set.weight);
		chip.createSpan({
			cls: 'fit-set-chip-text',
			text: `${set.reps}×${setWeightDisplay}${set.weight === 0 ? '' : weightUnit}`
		});

		const deleteBtn = chip.createEl('button', { cls: 'fit-set-chip-delete' });
		try { setIcon(deleteBtn, 'x'); } catch { deleteBtn.textContent = 'X'; }
		deleteBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			void onDeleteSet(i);
		});
	}
}

export interface HistorySetsOptions {
	exercise: SessionExercise;
	weightUnit: string;
	sessionRepo: SessionRepository;
}

/**
 * Renders history sets from previous sessions
 */
export function renderHistorySets(
	parent: HTMLElement,
	options: HistorySetsOptions
): void {
	const { exercise, weightUnit, sessionRepo } = options;

	// Find previous sessions with this exercise (async)
	void sessionRepo.list().then(sessions => {
		// Find most recent completed session with this exercise
		const exerciseName = exercise.exercise.toLowerCase();
		let lastSession: { date: string; sets: Array<{ weight: number; reps: number }> } | null = null;

		for (const session of sessions) {
			const sessionEx = session.exercises.find(
				e => e.exercise.toLowerCase() === exerciseName
			);
			if (sessionEx && sessionEx.sets.length > 0) {
				lastSession = {
					date: session.startTime,
					sets: sessionEx.sets.filter(s => s.completed).map(s => ({
						weight: s.weight,
						reps: s.reps
					}))
				};
				break; // Most recent first
			}
		}

		if (!lastSession || lastSession.sets.length === 0) return;

		// Calculate relative time
		const sessionDate = new Date(lastSession.date);
		const now = new Date();
		const diffMs = now.getTime() - sessionDate.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		let relativeTime: string;
		if (diffDays === 0) {
			relativeTime = 'today';
		} else if (diffDays === 1) {
			relativeTime = 'yesterday';
		} else if (diffDays < 7) {
			relativeTime = `${diffDays}d ago`;
		} else if (diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			relativeTime = weeks === 1 ? '1w ago' : `${weeks}w ago`;
		} else {
			const months = Math.floor(diffDays / 30);
			relativeTime = months === 1 ? '1mo ago' : `${months}mo ago`;
		}

		const section = parent.createDiv({ cls: 'fit-sets-history' });
		section.createDiv({ cls: 'fit-card-title', text: `Last: ${relativeTime}` });

		// Horizontal row of history chips (not deletable)
		const row = section.createDiv({ cls: 'fit-sets-chips' });

		for (const set of lastSession.sets) {
			const chip = row.createDiv({ cls: 'fit-set-chip fit-set-chip-history' });
			const historyWeightDisplay = formatWeight(set.weight);
			chip.createSpan({
				cls: 'fit-set-chip-text',
				text: `${set.reps}×${historyWeightDisplay}${set.weight === 0 ? '' : weightUnit}`
			});
		}
	});
}
