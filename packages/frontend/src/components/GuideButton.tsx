import { useAuth } from '../context/AuthContext';
import { doctorGuideSteps } from '../guides/doctorGuide';
import { patientGuideSteps } from '../guides/patientGuide';
import 'driver.js/dist/driver.css';

interface GuideButtonProps {
  className?: string;
}

export function GuideButton({ className = '' }: GuideButtonProps) {
  const { user } = useAuth();

  const startGuide = async () => {
    const { driver } = await import('driver.js');
    const steps = user?.role === 'doctor' ? doctorGuideSteps
      : user?.role === 'patient' ? patientGuideSteps
      : null;
    if (!steps) return;
    const d = driver({ steps, animate: true, showProgress: true });
    d.drive();
  };

  return (
    <button onClick={startGuide}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors ${className}`}
      title="Avvia guida interattiva">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Guida
    </button>
  );
}
