import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export function Layout() {
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleResend = async () => {
    if (!user || resending) return;
    setResending(true);
    setResendMsg('');
    try {
      await apiClient.post('/auth/resend-verification', { email: user.email });
      setResendMsg('Verification email sent! Check your inbox.');
    } catch {
      setResendMsg('Failed to resend. Try again later.');
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {user && !user.emailVerified && user.role !== 'admin' && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-sm">
            <span className="text-yellow-800">
              Please verify your email address to enable all features.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-yellow-700 underline hover:text-yellow-900 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendMsg && (
                <span className={`text-xs ${resendMsg.includes('sent') ? 'text-green-700' : 'text-red-700'}`}>
                  {resendMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
