import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { IUser } from '@healthbridge/shared';
import * as authApi from '../api/auth';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<IUser>;
  register: (email: string, password: string, name: string, role?: 'doctor' | 'analyst') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.getMe()
        .then((u) => { if (!cancelled) setUser(u); })
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    setUser(result.user);
    return result.user;
  };

  const register = async (email: string, password: string, name: string, role?: 'doctor' | 'analyst') => {
    const result = await authApi.register({ email, password, name, role });
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
