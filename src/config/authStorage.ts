/** Must match persisted session key in AuthContext */
export const AUTH_STORAGE_KEY = 'skillforge_auth_v1';

type StoredAuth = {
  user?: unknown;
  accessToken?: string;
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

export function getStoredRefreshToken(): string | undefined {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAuth;
    const t = parsed?.refreshToken;
    return typeof t === 'string' && t.length > 0 ? t : undefined;
  } catch {
    return undefined;
  }
}

export function applyRefreshedTokens(
  accessToken: string,
  refreshToken?: string,
  user?: unknown,
) {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const prev = raw
      ? (JSON.parse(raw) as Record<string, unknown>)
      : {};
    const next = {
      ...prev,
      accessToken,
      ...(refreshToken !== undefined ? { refreshToken } : {}),
      ...(user !== undefined ? { user } : {}),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
