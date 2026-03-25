import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import axios from 'axios';
import { setAccessToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  role: 'member' | 'operations' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
  });

  const applyToken = useCallback((token: string | null, user: AuthUser | null) => {
    setAccessToken(token);
    setState({ user, accessToken: token, isLoading: false });
  }, []);

  // Silent refresh on mount to restore session from httpOnly cookie
  const refreshToken = useCallback(async () => {
    try {
      const { data } = await axios.post<{ accessToken: string; user: AuthUser }>(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      applyToken(data.accessToken, data.user);
    } catch {
      applyToken(null, null);
    }
  }, [applyToken]);

  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const { data } = await axios.post<{ accessToken: string; user: AuthUser }>(
        '/api/auth/login',
        { email, password },
        { withCredentials: true }
      );
      applyToken(data.accessToken, data.user);
      return data.user;
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
    } finally {
      applyToken(null, null);
    }
  }, [applyToken]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
