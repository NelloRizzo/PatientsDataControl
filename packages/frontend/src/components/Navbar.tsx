import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-blue-600">
              HealthBridge
            </Link>
            <Link to="/measurements" className="text-gray-600 hover:text-gray-900">
              Le Mie Misure
            </Link>
            {(user.role === 'doctor' || user.role === 'admin') && (
              <Link to="/measurements/import" className="text-gray-600 hover:text-gray-900">
                Importa
              </Link>
            )}
            {user.role === 'doctor' && (
              <>
                <Link to="/doctor/patients" className="text-gray-600 hover:text-gray-900">
                  I Miei Pazienti
                </Link>
                <Link to="/doctor/alerts" className="text-gray-600 hover:text-gray-900">
                  Alert
                </Link>
                <Link to="/doctor/contract" className="text-gray-600 hover:text-gray-900">
                  Contratto
                </Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <Link to="/admin/users" className="text-gray-600 hover:text-gray-900">
                  Utenti
                </Link>
                <Link to="/admin/measurement-types" className="text-gray-600 hover:text-gray-900">
                  Tipi
                </Link>
                <Link to="/admin/associations" className="text-gray-600 hover:text-gray-900">
                  Associazioni
                </Link>
                <Link to="/admin/alert-templates" className="text-gray-600 hover:text-gray-900">
                  Alert
                </Link>
                <Link to="/admin/contracts" className="text-gray-600 hover:text-gray-900">
                  Contratti
                </Link>
                <Link to="/admin/contracts/report" className="text-gray-600 hover:text-gray-900">
                  Report
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-gray-700">
              Privacy
            </Link>
            <NotificationBell />
            <span className="text-sm text-gray-500">
              {user.name} ({user.role})
            </span>
            <Link to="/profile" className="text-sm text-blue-600 hover:underline">
              Profilo
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:underline"
            >
              Esci
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
