/** Must match persisted session key in AuthContext */
export const AUTH_STORAGE_KEY = 'skillforge_auth_v1';

type StoredAuth = {
  user?: { organisationId?: string; [key: string]: unknown };
  accessToken?: string;
  /** @deprecated Refresh tokens are HttpOnly cookies; ignored if present. */
  refreshToken?: string;
  linkedLearnerId?: string | null;
};

export function getStoredAccessToken(): string | undefined {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAuth;
    const t = parsed?.accessToken;
    return typeof t === 'string' && t.length > 0 ? t : undefined;
  } catch {
    return undefined;
  }
}

/** Active organisation id from persisted user profile (for X-Organisation-Id). */
export function getStoredOrganisationId(): string | undefined {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAuth;
    const id = parsed?.user?.organisationId;
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Refresh tokens are no longer read from localStorage (HttpOnly cookie).
 * Kept for backward-compatible silent refresh fallback during migration.
 */
export function getStoredRefreshToken(): string | undefined {
  return undefined;
}

export function applyRefreshedTokens(
  accessToken: string,
  _refreshToken?: string,
  user?: unknown,
) {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const prev = raw
      ? (JSON.parse(raw) as Record<string, unknown>)
      : {};
    const next: Record<string, unknown> = {
      ...prev,
      accessToken,
      ...(user !== undefined ? { user } : {}),
    };
    // Never persist refresh tokens client-side.
    delete next.refreshToken;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
