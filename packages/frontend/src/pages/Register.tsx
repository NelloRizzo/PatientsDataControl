import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'doctor' | 'analyst'>('doctor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, name, role);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registrazione fallita');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-green-500 text-5xl mb-4">&#10003;</div>
          <h1 className="text-xl font-bold text-green-700 mb-2">Registrazione completata!</h1>
          <p className="text-gray-600 mb-6">
            Benvenuto su HealthBridge! Ti abbiamo inviato una email di verifica a <strong>{email}</strong>.
            Controlla la tua casella di posta e verifica il tuo indirizzo email.
          </p>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Vai alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">HealthBridge</h1>
        <h2 className="text-lg mb-4 text-center text-gray-600">Crea account</h2>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              className="w-full border rounded px-3 py-2"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ruolo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'doctor' | 'analyst')}
                className="w-full border rounded px-3 py-2"
              >
              <option value="doctor">Medico</option>
              <option value="analyst">Analista</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Registrati
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Hai già un account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
