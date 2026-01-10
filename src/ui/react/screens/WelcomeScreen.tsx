/**
 * WelcomeScreen Component
 *
 * First screen shown when no program is selected.
 * Has TopNav with app title but no BottomNav.
 */

import { TopNav } from '../components/TopNav';
import { Mascot } from '../components/Mascot';
import { ActionFooter } from '../components/ActionFooter';

interface WelcomeScreenProps {
	onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
	return (
		<div className="fit-welcome-screen">
			<TopNav title="Brorilla" />
			<div className="fit-welcome-content">
				<Mascot
					mood="neutral"
					size="large"
					message="Yo! Ready to crush it? Let's get those gains!"
				/>
			</div>
			<ActionFooter
				layout="single"
				primaryAction={{
					label: 'continue',
					onClick: () => onNavigate('program-picker'),
					variant: 'primary'
				}}
			/>
		</div>
	);
}
