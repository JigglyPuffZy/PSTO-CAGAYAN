import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api';
import { isDemoMode } from '../api/demo';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { AuthUser } from '../types';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode()) {
      api
        .me()
        .then((r) => setUser(r.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
      return;
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setLoading(false);
        return;
      }
      api
        .me()
        .then((r) => setUser(r.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Initial session and login are handled above/in login(); token refreshes need no work.
      if (event === 'SIGNED_OUT' || !session) setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { user: u } = await api.login(username, password);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    void api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
