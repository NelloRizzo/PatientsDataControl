import { useAuth } from '../context/AuthContext';
import { createDoctorGuide } from '../guides/doctorGuide';
import { createPatientGuide } from '../guides/patientGuide';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import type { Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface GuideButtonProps {
  className?: string;
}

export function GuideButton({ className = '' }: GuideButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);

  const cleanup = useCallback(() => {
    if (driverRef.current) {
      try { driverRef.current.destroy(); } catch {}
      driverRef.current = null;
    }
  }, []);

  const createSteps = useCallback(() => {
    if (user?.role === 'doctor') return createDoctorGuide(navigate, cleanup);
    if (user?.role === 'patient') return createPatientGuide(navigate, cleanup);
    return null;
  }, [user?.role, navigate, cleanup]);

  const startGuide = useCallback((fromStep = 0) => {
    const steps = createSteps();
    if (!steps) return;
    cleanup();
    try {
      driverRef.current = driver({ steps, animate: true, showProgress: true });
      driverRef.current.drive(fromStep);
    } catch {}
  }, [createSteps, cleanup]);

  useEffect(() => {
    const pendingStep = sessionStorage.getItem('guideStep');
    const pendingRole = sessionStorage.getItem('guideRole');
    if (pendingStep && pendingRole === user?.role) {
      sessionStorage.removeItem('guideStep');
      sessionStorage.removeItem('guideRole');
      const step = parseInt(pendingStep, 10);
      if (!isNaN(step)) {
        requestAnimationFrame(() => startGuide(step));
      }
    }
  }, [user?.role, location.pathname, startGuide]);

  useEffect(() => () => cleanup(), [cleanup]);

  return (
    <button onClick={() => startGuide(0)}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${className || 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      title="Avvia guida interattiva">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Guida
    </button>
  );
}
