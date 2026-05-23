import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

type VerifyState = 'loading' | 'success' | 'error';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No verification token provided');
      return;
    }

    apiClient.post('/auth/verify-email', { token })
      .then(() => {
        setState('success');
        setMessage('Email verified successfully! You can now close this page.');
      })
      .catch((err) => {
        setState('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
        {state === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        )}
        {state === 'success' && (
          <div>
            <div className="text-green-500 text-5xl mb-4">&#10003;</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Email Verified!</h2>
            <p className="text-gray-600">{message}</p>
            <Link to="/login" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Go to Login
            </Link>
          </div>
        )}
        {state === 'error' && (
          <div>
            <div className="text-red-500 text-5xl mb-4">&#10007;</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Verification Failed</h2>
            <p className="text-gray-600">{message}</p>
            <Link to="/login" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
