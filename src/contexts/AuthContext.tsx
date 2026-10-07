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
import {
  getAuthStorageKey,
  isRoleAllowedInPortal,
} from '../config/authPortal';
import {
  AUTH_SESSION_INVALIDATED_EVENT,
  getStoredAccessToken,
  persistAccessToken,
} from '../config/authStorage';
import { authService } from '../services/api';

interface PersistedAuth {
  user: User;
  accessToken: string;
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
    const accessToken = getStoredAccessToken();
    if (
      !parsed?.user?.id ||
      !parsed?.user?.email ||
      !isRoleAllowedInPortal(parsed.user.role)
    ) {
      return null;
    }
    return {
      user: parsed.user,
      accessToken: accessToken ?? '',
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
    if (!state) {
      localStorage.removeItem(key);
      persistAccessToken(null);
    } else {
      const stored = getStoredAccessToken();
      const incomingLooksLikeJwt = Boolean(state.accessToken && state.accessToken.split('.').length === 3);
      const storedLooksLikeJwt = Boolean(stored && stored.split('.').length === 3);
      persistAccessToken(
        storedLooksLikeJwt && !incomingLooksLikeJwt ? stored : state.accessToken || stored || null,
      );
      const profileState: Omit<PersistedAuth, 'accessToken'> = {
        user: state.user,
        linkedLearnerId: state.linkedLearnerId,
      };
      localStorage.setItem(key, JSON.stringify(profileState));
    }
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
        persistState(null);
        if (!cancelled) setHydrated(true);
        return;
      }

      try {
        let activeToken = getStoredAccessToken() || persisted.accessToken;
        let freshUser: User | undefined;
        const tokenLooksLikeJwt = Boolean(activeToken && activeToken.split('.').length === 3);

        if (activeToken && tokenLooksLikeJwt) {
          try {
            const r = await authService.getCurrentUser(activeToken);
            if (r.success) {
              freshUser = r.data;
              activeToken = getStoredAccessToken() || activeToken;
            }
          } catch {
            // Access token rejected; rotate via the HttpOnly refresh cookie below.
          }
        }

        if (!freshUser) {
          const session = await authService.refreshSession();
          if (session.accessToken) {
            activeToken = session.accessToken;
            if (session.user) {
              freshUser = session.user;
            } else {
              const r = await authService.getCurrentUser(activeToken);
              if (r.success) {
                freshUser = r.data;
                activeToken = getStoredAccessToken() || activeToken;
              }
            }
          }
        }

        if (freshUser && activeToken && !cancelled) {
          if (!isRoleAllowedInPortal(freshUser.role)) {
            throw new Error('Session is not valid for this portal');
          }
          const learnerId = linkedLearnerFromUser(freshUser);
          setUser(freshUser);
          setAccessToken(activeToken);
          setLinkedLearnerId(learnerId);
          persistState({
            user: freshUser,
            accessToken: activeToken,
            linkedLearnerId: learnerId,
          });
        } else if (!cancelled) {
          throw new Error('Session verification failed');
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
          setLinkedLearnerId(null);
          persistState(null);
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const clearSession = () => {
      setUser(null);
      setAccessToken(null);
      setLinkedLearnerId(null);
      persistState(null);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getAuthStorageKey() && event.newValue === null) {
        clearSession();
      }
    };
    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, clearSession);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, clearSession);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsBusy(true);
    try {
      const res = await authService.login(credentials);
      const nextUser = res.data;
      const token = res.accessToken ?? null;
      if (!token || !isRoleAllowedInPortal(nextUser.role)) {
        if (token) await authService.logout(token);
        throw new Error('This account is not authorised for this portal.');
      }
      const learnerId = linkedLearnerFromUser(nextUser);
      setUser(nextUser);
      setAccessToken(token);
      setLinkedLearnerId(learnerId);
      persistState({
        user: nextUser,
        accessToken: token,
        linkedLearnerId: learnerId,
      });
      return nextUser;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsBusy(true);
    try {
      await authService.logout(accessToken ?? getStoredAccessToken());
    } finally {
      setUser(null);
      setAccessToken(null);
      setLinkedLearnerId(null);
      persistState(null);
      setIsBusy(false);
    }
  }, [accessToken]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user && accessToken),
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
