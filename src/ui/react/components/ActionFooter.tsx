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

import { motion, AnimatePresence } from 'framer-motion';
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

/** Workout info configuration for home screen */
export interface WorkoutInfo {
	/** Program name (optional) */
	programName?: string;
	/** Next workout name */
	workoutName: string;
	/** Optional subtitle (e.g., "scheduled for today") */
	subtitle?: string;
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
	/** Current value when editing (highlighted in dark blue) */
	currentValue?: number;
}

/** RPE question configuration */
export interface RPEQuestion {
	type: 'rpe';
	/** Target RPE (highlighted) */
	target: number;
	/** Called when user selects an RPE */
	onSelect: (rpe: number) => void;
	/** Current value when editing (highlighted in dark blue) */
	currentValue?: number;
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

	/** Optional workout info displayed above actions (for home screen) */
	workoutInfo?: WorkoutInfo;

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
	workoutInfo,
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
		workoutInfo ? 'fit-action-footer-workout' : '',
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
					const isCurrent = q.currentValue === num;
					return (
						<button
							key={num}
							className={`fit-number-button ${inRange ? 'in-range' : ''} ${isCurrent ? 'is-current' : ''}`}
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
				{Array.from({ length: 6 }, (_, i) => i + 5).map(num => {
					const isTarget = num === q.target;
					const isCurrent = q.currentValue === num;
					return (
						<button
							key={num}
							className={`fit-number-button ${isTarget ? 'in-range' : ''} ${isCurrent ? 'is-current' : ''}`}
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

	// Render question content (without animation wrapper)
	const getQuestionContent = () => {
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

	// Render action buttons content (without animation wrapper)
	const getActionsContent = () => {
		if (!primaryAction) return null;

		const action = primaryAction; // TypeScript narrowing helper

		if (layout === 'triple') {
			return (
				<div className="fit-action-buttons-row">
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
				</div>
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

	// Render interactive content (question OR actions) with coordinated animation
	// Uses single AnimatePresence with mode="wait" so exit completes before enter
	// initial={false} prevents animation on first mount (e.g., when navigating between exercises)
	const renderInteractiveContent = () => (
		<AnimatePresence mode="wait" initial={false}>
			{question ? (
				<motion.div
					key="question-panel"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					transition={{
						duration: 0.25,
						ease: [0.4, 0, 0.2, 1], // Material Design easing
					}}
					style={{ overflow: 'hidden' }}
				>
					{getQuestionContent()}
				</motion.div>
			) : primaryAction ? (
				<motion.div
					key="action-buttons"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					transition={{
						duration: 0.25,
						ease: [0.4, 0, 0.2, 1], // Material Design easing
					}}
					style={{ overflow: 'hidden' }}
				>
					{getActionsContent()}
				</motion.div>
			) : null}
		</AnimatePresence>
	);

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
			{/* Workout info panel for home screen */}
			{workoutInfo && (
				<div className="fit-workout-info-panel">
					<div className="fit-workout-info-content">
						{workoutInfo.programName && (
							<span className="fit-workout-info-program">{workoutInfo.programName}</span>
						)}
						<span className="fit-workout-info-workout">{workoutInfo.workoutName}</span>
						{workoutInfo.subtitle && (
							<span className="fit-workout-info-subtitle">{workoutInfo.subtitle}</span>
						)}
					</div>
				</div>
			)}

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

			{renderInteractiveContent()}
		</div>
	);
}
