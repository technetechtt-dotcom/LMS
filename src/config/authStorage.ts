import { getAuthStorageKey } from './authPortal';

type StoredAuth = {
  user?: { organisationId?: string; [key: string]: unknown };
  accessToken?: string;
  linkedLearnerId?: string | null;
};

/** @deprecated Use getAuthStorageKey() — kept for imports that expect a constant. */
export const AUTH_STORAGE_KEY = 'skillforge_auth_v1';

function storageKey() {
  return getAuthStorageKey();
}

export function getStoredAccessToken(): string | undefined {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAuth;
    const t = parsed?.accessToken;
    return typeof t === 'string' && t.length > 0 ? t : undefined;
  } catch {
    return undefined;
  }
}

export function getStoredOrganisationId(): string | undefined {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAuth;
    const id = parsed?.user?.organisationId;
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

export function getStoredRefreshToken(): string | undefined {
  return undefined;
}

export function applyRefreshedTokens(
  accessToken: string,
  _refreshToken?: string,
  user?: unknown,
) {
  try {
    const raw = localStorage.getItem(storageKey());
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next: Record<string, unknown> = {
      ...prev,
      accessToken,
      ...(user !== undefined ? { user } : {}),
    };
    delete next.refreshToken;
    localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function setStoredOrganisationId(
  organisationId: string,
  organisationName?: string,
) {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.user) return;
    parsed.user = {
      ...parsed.user,
      organisationId,
      ...(organisationName ? { organisation: organisationName } : {}),
    };
    localStorage.setItem(storageKey(), JSON.stringify(parsed));
  } catch {
    /* quota / private mode */
  }
}
