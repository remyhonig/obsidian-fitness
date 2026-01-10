/**
 * ActionFooter Component
 *
 * Fixed footer bar for action buttons with optional coaching tip.
 * Supports multiple layouts:
 * - Triple: left/center/right actions (e.g., Cancel/DONE/Skip)
 * - Single: one primary action button
 * - With coach tip: displays a coaching message above the action
 * - With question: displays post-set question input (reps/RPE/weight)
 */

import { motion } from 'framer-motion';
import { RuleProgressPill } from './RuleProgressPill';

/** Rule progress info for coach tip */
export interface CoachTipRuleProgress {
	current: number;
	required: number;
	unit: 'sessions' | 'sets';
}

/** Coach tip configuration */
export interface CoachTip {
	/** Short change indicator (e.g., "+2.5kg", "-5kg") */
	change: string;
	/** Explanation for the change */
	reason: string;
	/** Optional rule progress to show */
	ruleProgress?: CoachTipRuleProgress;
	/** Whether a streak was broken */
	streakBroken?: boolean;
}

/** Reps question configuration */
export interface RepsQuestion {
	type: 'reps';
	/** Minimum target reps (highlighted in range) */
	min: number;
	/** Maximum target reps (highlighted in range) */
	max: number;
	/** Called when user selects a rep count */
	onSelect: (reps: number) => void;
}

/** RPE question configuration */
export interface RPEQuestion {
	type: 'rpe';
	/** Target RPE (highlighted) */
	target: number;
	/** Called when user selects an RPE */
	onSelect: (rpe: number) => void;
}

/** Weight question configuration */
export interface WeightQuestion {
	type: 'weight';
	/** Current weight value */
	value: number;
	/** Reps from previous question (for confirm button label) */
	pendingReps: number;
	/** Called when weight changes */
	onChange: (weight: number) => void;
	/** Called when user confirms */
	onConfirm: () => void;
}

/** Union type for all question types */
export type PostSetQuestion = RepsQuestion | RPEQuestion | WeightQuestion;

/** Action button configuration */
export interface ActionButton {
	/** Button label */
	label: string;
	/** Click handler */
	onClick: () => void;
	/** Button variant */
	variant?: 'primary' | 'secondary' | 'success' | 'ghost';
	/** Whether button is disabled */
	disabled?: boolean;
}

export interface ActionFooterProps {
	/** Layout mode */
	layout: 'single' | 'triple';

	/** Primary/center action (required for single/triple, ignored when question is provided) */
	primaryAction?: ActionButton;

	/** Left action (triple layout only) */
	leftAction?: ActionButton;

	/** Right action (triple layout only) */
	rightAction?: ActionButton;

	/** Optional coaching tip displayed above actions */
	coachTip?: CoachTip;

	/** Optional post-set question (replaces action buttons) */
	question?: PostSetQuestion;

	/** Additional CSS class for styling variants */
	className?: string;

	/** Layout ID for coach tip animation (enables shared element transition) */
	coachTipLayoutId?: string;
}

export function ActionFooter({
	layout,
	primaryAction,
	leftAction,
	rightAction,
	coachTip,
	question,
	className = '',
	coachTipLayoutId,
}: ActionFooterProps) {
	const getButtonClass = (variant: ActionButton['variant'] = 'primary', isLarge = false): string => {
		const base = isLarge ? 'fit-button-large' : '';
		switch (variant) {
			case 'primary':
				return `fit-button-primary ${base}`.trim();
			case 'secondary':
				return `fit-button-secondary ${base}`.trim();
			case 'success':
				return `fit-button-success ${base}`.trim();
			case 'ghost':
				return `fit-action-secondary ${base}`.trim();
			default:
				return `fit-button-primary ${base}`.trim();
		}
	};

	// Determine styling based on adjustment type
	const isAdjustmentDown = coachTip?.change.startsWith('-');
	const isStreakBroken = coachTip?.streakBroken;

	// Determine variant for progress pill
	const getProgressVariant = (): 'active' | 'complete' | 'broken' => {
		if (isStreakBroken) return 'broken';
		if (coachTip?.ruleProgress && coachTip.ruleProgress.current >= coachTip.ruleProgress.required) {
			return 'complete';
		}
		return 'active';
	};

	const footerClasses = [
		'fit-action-footer',
		question ? 'fit-action-footer-question' : '',
		layout === 'triple' && !question ? 'fit-action-footer-triple' : '',
		coachTip ? 'fit-action-footer-summary' : '',
		isStreakBroken ? 'streak-broken' : isAdjustmentDown ? 'adjustment-down' : '',
		className,
	].filter(Boolean).join(' ');

	// Render reps question grid
	const renderRepsQuestion = (q: RepsQuestion) => (
		<div className="fit-footer-question">
			<h3 className="fit-footer-question-title">how many reps?</h3>
			<div className="fit-number-grid fit-number-grid-reps">
				{Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
					const inRange = num >= q.min && num <= q.max;
					return (
						<button
							key={num}
							className={`fit-number-button ${inRange ? 'in-range' : ''}`}
							onClick={() => q.onSelect(num)}
						>
							{num}
						</button>
					);
				})}
			</div>
		</div>
	);

	// Render RPE question grid
	const renderRPEQuestion = (q: RPEQuestion) => (
		<div className="fit-footer-question">
			<h3 className="fit-footer-question-title">RPE?</h3>
			<div className="fit-number-grid fit-number-grid-rpe">
				{Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
					const isTarget = num === q.target;
					return (
						<button
							key={num}
							className={`fit-number-button ${isTarget ? 'in-range' : ''}`}
							onClick={() => q.onSelect(num)}
						>
							{num}
						</button>
					);
				})}
			</div>
		</div>
	);

	// Render weight question with inline adjustment buttons
	const renderWeightQuestion = (q: WeightQuestion) => (
		<div className="fit-footer-question">
			<h3 className="fit-footer-question-title">weight</h3>
			<div className="fit-footer-weight-row">
				<button
					className="fit-weight-adjust"
					onClick={() => q.onChange(Math.max(0, q.value - 5))}
				>
					-5
				</button>
				<button
					className="fit-weight-adjust fit-weight-adjust-small"
					onClick={() => q.onChange(Math.max(0, q.value - 0.25))}
				>
					-¼
				</button>
				<button
					className="fit-weight-value"
					onClick={q.onConfirm}
				>
					{q.value === 0 ? 'BW' : q.value}
					{q.value > 0 && <span className="fit-weight-value-unit">kg</span>}
				</button>
				<button
					className="fit-weight-adjust fit-weight-adjust-small"
					onClick={() => q.onChange(q.value + 0.25)}
				>
					+¼
				</button>
				<button
					className="fit-weight-adjust"
					onClick={() => q.onChange(q.value + 5)}
				>
					+5
				</button>
			</div>
		</div>
	);

	// Render question input if provided
	const renderQuestion = () => {
		if (!question) return null;

		switch (question.type) {
			case 'reps':
				return renderRepsQuestion(question);
			case 'rpe':
				return renderRPEQuestion(question);
			case 'weight':
				return renderWeightQuestion(question);
		}
	};

	// Render action buttons (only when no question)
	const renderActions = () => {
		if (question || !primaryAction) return null;

		const action = primaryAction; // TypeScript narrowing helper

		if (layout === 'triple') {
			return (
				<>
					{leftAction ? (
						<button
							className={getButtonClass(leftAction.variant ?? 'ghost')}
							onClick={leftAction.onClick}
							disabled={leftAction.disabled}
						>
							{leftAction.label}
						</button>
					) : (
						<div className="fit-button-placeholder" />
					)}

					<button
						className={getButtonClass(action.variant, true)}
						onClick={action.onClick}
						disabled={action.disabled}
					>
						{action.label}
					</button>

					{rightAction ? (
						<button
							className={getButtonClass(rightAction.variant ?? 'ghost')}
							onClick={rightAction.onClick}
							disabled={rightAction.disabled}
						>
							{rightAction.label}
						</button>
					) : (
						<div className="fit-button-placeholder" />
					)}
				</>
			);
		}

		return (
			<button
				className={getButtonClass(action.variant ?? 'success', true)}
				onClick={action.onClick}
				disabled={action.disabled}
			>
				{action.label}
			</button>
		);
	};

	// Render coach bubble content
	const coachBubbleContent = coachTip ? (
		<>
			<div className="fit-coach-avatar">{isStreakBroken ? '💔' : '🏋️'}</div>
			<div className="fit-coach-speech">
				<span className="fit-coach-change">{coachTip.change}</span>
				<span className="fit-coach-reason">{coachTip.reason}</span>
				{coachTip.ruleProgress && (
					<div className="fit-coach-progress">
						<RuleProgressPill
							current={coachTip.ruleProgress.current}
							required={coachTip.ruleProgress.required}
							unit={coachTip.ruleProgress.unit}
							variant={getProgressVariant()}
						/>
					</div>
				)}
			</div>
		</>
	) : null;

	return (
		<div className={footerClasses}>
			{/* Coach speech bubble - optionally animated with layoutId */}
			{coachTip && (
				coachTipLayoutId ? (
					<motion.div
						className="fit-coach-bubble"
						layoutId={coachTipLayoutId}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8 }}
						style={{ zIndex: 9999, position: 'relative' }}
						transition={{
							type: 'spring',
							stiffness: 400,
							damping: 30,
						}}
					>
						{coachBubbleContent}
					</motion.div>
				) : (
					<div className="fit-coach-bubble">
						{coachBubbleContent}
					</div>
				)
			)}

			{renderQuestion()}
			{renderActions()}
		</div>
	);
}
