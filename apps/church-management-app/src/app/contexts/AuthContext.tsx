import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, ChurchUnitSummary } from '@sfoacc/sdk';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedUnit: ChurchUnitSummary | null;
  accessibleUnits: ChurchUnitSummary[];
  hasPermission: (perm: string) => boolean;
  login: (token: string, user: User, accessibleUnits?: ChurchUnitSummary[], selectedUnit?: ChurchUnitSummary | null) => void;
  selectUnit: (unit: ChurchUnitSummary) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [accessibleUnits, setAccessibleUnits] = useState<ChurchUnitSummary[]>(() => {
    const stored = localStorage.getItem('auth_accessible_units');
    return stored ? JSON.parse(stored) : [];
  });
  const [selectedUnit, setSelectedUnit] = useState<ChurchUnitSummary | null>(() => {
    const stored = localStorage.getItem('auth_selected_unit');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((
    newToken: string,
    newUser: User,
    newAccessibleUnits: ChurchUnitSummary[] = [],
    newSelectedUnit: ChurchUnitSummary | null = null,
  ) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    localStorage.setItem('auth_accessible_units', JSON.stringify(newAccessibleUnits));
    if (newSelectedUnit) {
      localStorage.setItem('auth_selected_unit', JSON.stringify(newSelectedUnit));
    } else {
      localStorage.removeItem('auth_selected_unit');
    }
    setToken(newToken);
    setUser(newUser);
    setAccessibleUnits(newAccessibleUnits);
    setSelectedUnit(newSelectedUnit);
  }, []);

  const hasPermission = useCallback((perm: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (!user.permissions) return true; // backward compat: show all if permissions not yet stored
    return user.permissions.includes(perm);
  }, [user]);

  const selectUnit = useCallback((unit: ChurchUnitSummary) => {
    localStorage.setItem('auth_selected_unit', JSON.stringify(unit));
    setSelectedUnit(unit);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_accessible_units');
    localStorage.removeItem('auth_selected_unit');
    setToken(null);
    setUser(null);
    setAccessibleUnits([]);
    setSelectedUnit(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, selectedUnit, accessibleUnits, hasPermission, login, selectUnit, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
