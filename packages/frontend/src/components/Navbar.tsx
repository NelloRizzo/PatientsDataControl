import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

const roleLabel: Record<string, string> = {
  patient: 'Paziente',
  doctor: 'Medico',
  admin: 'Admin',
  analyst: 'Analista',
};

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggle = (name: string) => setOpenDropdown((prev) => (prev === name ? null : name));

  const close = () => {
    setMobileOpen(false);
    setOpenDropdown(null);
  };

  const item = (label: string, to: string, id?: string) => (
    <Link key={to} to={to} onClick={close} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap" id={id}>
      {label}
    </Link>
  );

  const btnItem = (label: string, onClick: () => void) => (
    <button key={label} onClick={onClick} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
      {label}
    </button>
  );

  const Dropdown = ({ name, label, children }: { name: string; label: string; children: React.ReactNode }) => (
    <div className="relative">
      <button
        onClick={() => toggle(name)}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
      >
        {label}
        <svg className={`w-4 h-4 transition-transform ${openDropdown === name ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {openDropdown === name && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[170px]">
          {children}
        </div>
      )}
    </div>
  );

  const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link to={to} onClick={close} className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap">
      {label}
    </Link>
  );

  const profileDropdown = (
    <>
      {item('Profilo', '/profile')}
      {user.role === 'patient' && item('Le Mie Misure', '/measurements')}
      {item('Guida', '/help')}
      {item('Privacy', '/privacy')}
    </>
  );

  return (
    <nav className="bg-white shadow-sm border-b" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-1">
            <Link to={user.role === 'patient' ? '/measurements' : '/'} onClick={close}
              className="text-xl font-bold text-blue-600 mr-4 whitespace-nowrap" id="nav-logo">
              HealthBridge
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {user.role === 'patient' && (
                <>
                  <NavLink to="/" label="Dashboard" />
                  <div id="nav-profile"><Dropdown name="profile" label="Profilo">{profileDropdown}</Dropdown></div>
                </>
              )}
              {user.role === 'doctor' && (
                <>
                  <div id="patients-menu"><Dropdown name="patients" label="Pazienti">
                    {item('I Miei Pazienti', '/doctor/patients')}
                    {item('Alert', '/doctor/alerts', 'alerts-link')}
                  </Dropdown></div>
                  <div id="tools-menu"><Dropdown name="tools" label="Strumenti">
                    {item('Importa Misurazioni', '/measurements/import', 'import-link')}
                    {item('Contratto', '/doctor/contract')}
                    {item('Ticket e Segnalazioni', '/doctor/tickets', 'tickets-link')}
                  </Dropdown></div>
                  <div id="nav-profile"><Dropdown name="profile" label="Profilo">{profileDropdown}</Dropdown></div>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <Dropdown name="admin" label="Amministrazione">
                    {item('Utenti', '/admin/users')}
                    {item('Tipi Misurazione', '/admin/measurement-types')}
                    {item('Associazioni', '/admin/associations')}
                    {item('Alert Template', '/admin/alert-templates')}
                    {item('Contratti', '/admin/contracts')}
                    {item('Report', '/admin/contracts/report')}
                    {item('Ticket', '/admin/tickets')}
                  </Dropdown>
                  <div id="nav-profile"><Dropdown name="profile" label="Profilo">{profileDropdown}</Dropdown></div>
                </>
              )}
              {user.role === 'analyst' && (
                <div id="nav-profile"><Dropdown name="profile" label="Profilo">{profileDropdown}</Dropdown></div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div id="nav-notification-bell"><NotificationBell /></div>
            <span className="hidden md:inline text-sm text-gray-500">{user.name} ({roleLabel[user.role] || user.role})</span>
            <button onClick={() => { close(); handleLogout(); }}
              className="hidden md:inline-flex items-center gap-1 px-2 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Esci">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Esci</span>
            </button>
            <button onClick={() => { setMobileOpen(!mobileOpen); setOpenDropdown(null); }}
              className="md:hidden p-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <MobileNav user={user} close={close} handleLogout={handleLogout} />
        )}
      </div>
    </nav>
  );
}

function MobileNav({ user, close, handleLogout }: { user: any; close: () => void; handleLogout: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggleExp = (name: string) => setExpanded((prev) => (prev === name ? null : name));

  const item = (label: string, to: string, id?: string) => (
    <Link key={to} to={to} onClick={close} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded" id={id}>
      {label}
    </Link>
  );

  const Section = ({ name, label, children }: { name: string; label: string; children: React.ReactNode }) => (
    <div>
      <button onClick={() => toggleExp(name)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded">
        {label}
        <svg className={`w-4 h-4 transition-transform ${expanded === name ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded === name && <div className="ml-3 space-y-1 pb-1">{children}</div>}
    </div>
  );

  return (
    <div className="md:hidden border-t py-2 space-y-1">
      {user.role === 'patient' && (
        <>
          {item('Dashboard', '/')}
          <Section name="profile" label="Profilo">
            {item('Profilo', '/profile')}
            {item('Le Mie Misure', '/measurements')}
            {item('Privacy', '/privacy')}
          </Section>
        </>
      )}
      {user.role === 'doctor' && (
        <>
          <Section name="patients" label="Pazienti">
            {item('I Miei Pazienti', '/doctor/patients')}
            {item('Alert', '/doctor/alerts', 'alerts-link')}
          </Section>
          <Section name="tools" label="Strumenti">
            {item('Importa Misurazioni', '/measurements/import', 'import-link')}
            {item('Contratto', '/doctor/contract')}
            {item('Ticket e Segnalazioni', '/doctor/tickets', 'tickets-link')}
          </Section>
          <Section name="profile" label="Profilo">
            {item('Profilo', '/profile')}
            {item('Privacy', '/privacy')}
          </Section>
        </>
      )}
      {user.role === 'admin' && (
        <>
          <Section name="admin" label="Amministrazione">
            {item('Utenti', '/admin/users')}
            {item('Tipi Misurazione', '/admin/measurement-types')}
            {item('Associazioni', '/admin/associations')}
            {item('Alert Template', '/admin/alert-templates')}
            {item('Contratti', '/admin/contracts')}
            {item('Report', '/admin/contracts/report')}
            {item('Ticket', '/admin/tickets')}
          </Section>
          <Section name="profile" label="Profilo">
            {item('Profilo', '/profile')}
            {item('Privacy', '/privacy')}
          </Section>
        </>
      )}
      {user.role === 'analyst' && (
        <Section name="profile" label="Profilo">
          {item('Profilo', '/profile')}
          {item('Privacy', '/privacy')}
        </Section>
      )}
      <hr className="my-2 border-gray-200" />
      <div className="px-4 pb-1 text-xs text-gray-400">{user.name} ({roleLabel[user.role] || user.role})</div>
      <button onClick={() => { close(); handleLogout(); }}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Esci
      </button>
    </div>
  );
}
