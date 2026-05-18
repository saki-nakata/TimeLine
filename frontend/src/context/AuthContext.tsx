import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth';
import type { UserResponse } from '../types/user';

interface AuthContextValue {
  currentUser: UserResponse | null;
  loading: boolean;
  setCurrentUser: (user: UserResponse | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .me()
      .then((res) => setCurrentUser(res.data))
      .catch(() => setCurrentUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await authService.logout().catch(() => {});
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, setCurrentUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
