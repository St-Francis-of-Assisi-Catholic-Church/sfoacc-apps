import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User } from '@sfoacc/sdk';

interface AdminAuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasPermission: (perm: string) => boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('admin_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  const hasPermission = useCallback((perm: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (!user.permissions) return true;
    return user.permissions.includes(perm);
  }, [user]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, token, isAuthenticated: !!token, hasPermission, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
