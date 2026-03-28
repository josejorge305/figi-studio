import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, clearToken, hasToken } from '../utils/api';

interface User { id: number; email: string; name: string; }
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) { setLoading(false); return; }
    api.get<{ user: User }>('/api/auth/me').then(res => {
      if (res.success && res.data) setUser(res.data.user);
      else clearToken();
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password }, false);
    if (res.success && res.data) { setToken(res.data.token); setUser(res.data.user); return { success: true }; }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/register', { email, password, name }, false);
    if (res.success && res.data) { setToken(res.data.token); setUser(res.data.user); return { success: true }; }
    return { success: false, error: res.error || 'Registration failed' };
  };

  const logout = () => { clearToken(); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
