import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // Registration request
  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqRole, setReqRole] = useState<'doctor' | 'nurse' | 'patient'>('patient');
  const [reqMessage, setReqMessage] = useState('');
  const [reqAnnotation, setReqAnnotation] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqMsg, setReqMsg] = useState('');
  const [reqError, setReqError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password.trim());
      navigate(user.mustChangePassword ? '/profile?mustChangePassword=1' : '/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login fallito');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');
    setReqMsg('');
    setReqSubmitting(true);
    try {
      await apiClient.post('/public/registration-request', {
        name: reqName.trim(),
        email: reqEmail.trim(),
        requestedRole: reqRole,
        message: reqMessage.trim() || undefined,
        annotation: reqAnnotation.trim() || undefined,
      });
      setReqMsg('Richiesta inviata con successo. Un amministratore la esaminerà.');
      setReqName('');
      setReqEmail('');
      setReqMessage('');
      setReqAnnotation('');
    } catch (err: any) {
      setReqError(err.response?.data?.error || 'Errore durante l\'invio della richiesta');
    } finally {
      setReqSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">HealthBridge</h1>
        <h2 className="text-lg mb-4 text-center text-gray-600">Accedi</h2>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(submitting || loading) && (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            {loading ? 'Caricamento...' : 'Accedi'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Non hai un account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Registrati
          </Link>
        </p>
        <hr className="my-4" />
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowRequest(!showRequest)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showRequest ? 'Nascondi' : 'Richiedi registrazione come operatore'}
          </button>
        </div>
        {showRequest && (
          <form onSubmit={handleRequest} className="mt-4 space-y-3 border-t pt-4">
            {reqMsg && <p className="text-sm text-green-600">{reqMsg}</p>}
            {reqError && <p className="text-sm text-red-600">{reqError}</p>}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Nome *</label>
              <input value={reqName} onChange={(e) => setReqName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Email *</label>
              <input type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Ruolo richiesto *</label>
              <select value={reqRole} onChange={(e) => setReqRole(e.target.value as any)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="patient">Paziente</option>
                <option value="nurse">Infermiere</option>
                <option value="doctor">Dottore</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Messaggio (opzionale)</label>
              <textarea value={reqMessage} onChange={(e) => setReqMessage(e.target.value)}
                rows={3} className="w-full border rounded px-3 py-2 text-sm" placeholder="Perché desideri registrarti?" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Annotazioni (opzionale)</label>
              <textarea value={reqAnnotation} onChange={(e) => setReqAnnotation(e.target.value)}
                rows={2} className="w-full border rounded px-3 py-2 text-sm" placeholder="Note aggiuntive..." />
            </div>
            <button type="submit" disabled={reqSubmitting}
              className="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed">
              {reqSubmitting ? 'Invio in corso...' : 'Invia Richiesta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
