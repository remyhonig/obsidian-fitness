// ViewModel layer - testable application behavior
export { FitViewModel } from './fit-viewmodel';
export type {
	FitViewState,
	ExerciseCompletionStatus,
	RestTimerStatus,
	ViewStateListener,
	ViewModelDependencies,
	WorkoutTemplate,
	SetUpdate,
	ExerciseQuestionnaire
} from './fit-viewmodel.types';
export {
	computeViewState,
	computeExerciseCompletion,
	getCurrentExercise,
	getDefaultWeight,
	getDefaultReps
} from './computed-state';
