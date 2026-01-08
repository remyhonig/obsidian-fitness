import React from 'react';

export interface TrainingMaxValue {
	exercise: string;
	value: number;
	unit: 'kg' | 'lbs';
}

interface TrainingMaxFormProps {
	/** List of exercises that need TM values */
	exercises: string[];
	/** Current values (keyed by exercise name) */
	values: Map<string, TrainingMaxValue>;
	/** Called when a value changes */
	onChange: (exercise: string, value: number, unit: 'kg' | 'lbs') => void;
	/** Default unit for new entries */
	defaultUnit?: 'kg' | 'lbs';
}

export function TrainingMaxForm({
	exercises,
	values,
	onChange,
	defaultUnit = 'kg'
}: TrainingMaxFormProps) {
	const handleValueChange = (exercise: string, newValue: string) => {
		const numValue = parseFloat(newValue) || 0;
		const existing = values.get(exercise);
		const unit = existing?.unit ?? defaultUnit;
		onChange(exercise, numValue, unit);
	};

	const handleUnitChange = (exercise: string, newUnit: 'kg' | 'lbs') => {
		const existing = values.get(exercise);
		const value = existing?.value ?? 0;
		onChange(exercise, value, newUnit);
	};

	return (
		<div className="fit-tm-form">
			{exercises.map((exercise) => {
				const current = values.get(exercise);
				const value = current?.value;
				const unit = current?.unit ?? defaultUnit;
				// Show the value if it exists (including 0), otherwise empty for placeholder
				const displayValue = value !== undefined ? value : '';

				return (
					<div key={exercise} className="fit-tm-row">
						<label className="fit-tm-label">{exercise}</label>
						<div className="fit-tm-input-group">
							<input
								type="number"
								className="fit-tm-input"
								value={displayValue}
								onChange={(e) => handleValueChange(exercise, e.target.value)}
								placeholder="0"
								min="0"
								step="0.5"
							/>
							<div className="fit-tm-unit-toggle">
								<button
									type="button"
									className={`fit-tm-unit-btn ${unit === 'kg' ? 'active' : ''}`}
									onClick={() => handleUnitChange(exercise, 'kg')}
								>
									kg
								</button>
								<button
									type="button"
									className={`fit-tm-unit-btn ${unit === 'lbs' ? 'active' : ''}`}
									onClick={() => handleUnitChange(exercise, 'lbs')}
								>
									lbs
								</button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
