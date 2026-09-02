import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginCredentials, User } from '../types';
import { getAuthStorageKey } from '../config/authPortal';
import { authService, auditService } from '../services/api';

interface PersistedAuth {
  user: User;
  accessToken?: string;
  linkedLearnerId: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  /** Enrolment id for learner accounts (`/learner/:id`). */
  linkedLearnerId: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function linkedLearnerFromUser(user: User | null | undefined): string | null {
  return user?.linkedLearnerId ?? null;
}

function loadPersisted(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(getAuthStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (!parsed?.user?.id || !parsed?.user?.email) return null;
    return {
      user: parsed.user,
      accessToken: parsed.accessToken,
      linkedLearnerId:
        parsed.linkedLearnerId ??
        linkedLearnerFromUser(parsed.user) ??
        null,
    };
  } catch {
    return null;
  }
}

function persistState(state: PersistedAuth | null) {
  try {
    const key = getAuthStorageKey();
    if (!state) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [linkedLearnerId, setLinkedLearnerId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = loadPersisted();
      if (!persisted) {
        if (!cancelled) setHydrated(true);
        return;
      }

      setUser(persisted.user);
      setAccessToken(persisted.accessToken ?? null);
      setLinkedLearnerId(
        persisted.linkedLearnerId ?? linkedLearnerFromUser(persisted.user),
      );

      if (persisted.accessToken) {
        try {
          const r = await authService.getCurrentUser(persisted.accessToken);
          if (r.success && !cancelled) {
            const fresh = r.data;
            const learnerId = linkedLearnerFromUser(fresh);
            setUser(fresh);
            setLinkedLearnerId(learnerId);
      persistState({
              user: fresh,
              accessToken: persisted.accessToken,
              linkedLearnerId: learnerId,
            });
          }
        } catch {
          if (!cancelled) {
            setUser(null);
            setAccessToken(null);
            setLinkedLearnerId(null);
            persistState(null);
          }
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsBusy(true);
    try {
      const res = await authService.login(credentials);
      const nextUser = res.data;
      const token = res.accessToken ?? null;
      const learnerId = linkedLearnerFromUser(nextUser);
      setUser(nextUser);
      setAccessToken(token);
      setLinkedLearnerId(learnerId);
      persistState({
        user: nextUser,
        accessToken: token ?? undefined,
        linkedLearnerId: learnerId,
      });
      await auditService.log('login', 'user', nextUser.id, nextUser.email);
      return nextUser;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsBusy(true);
    try {
      await authService.logout(accessToken);
      if (user) {
        await auditService.log('logout', 'user', user.id, user.email);
      }
    } finally {
      setUser(null);
      setAccessToken(null);
      setLinkedLearnerId(null);
      persistState(null);
      setIsBusy(false);
    }
  }, [user, accessToken]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      accessToken,
      linkedLearnerId,
      login,
      logout,
      isLoading: !hydrated || isBusy,
    }),
    [user, accessToken, linkedLearnerId, login, logout, hydrated, isBusy],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components -- useAuth is intentionally exported next to AuthProvider */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
