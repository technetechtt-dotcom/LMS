import { API_BASE_URL } from '../config/env';
import { getAuthPortal, getAuthStorageKey } from '../config/authPortal';
import {
  AUTH_SESSION_INVALIDATED_EVENT,
  getStoredAccessToken,
  getStoredOrganisationId,
  applyRefreshedTokens,
} from '../config/authStorage';

export class ApiNetworkError extends Error {
  status: number;
  body?: string;
  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'ApiNetworkError';
    this.status = status;
    this.body = body;
  }
}

/** Extract a human-readable message from API error responses. */
export function parseApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (err instanceof ApiNetworkError) {
    const raw = err.body ?? err.message;
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      if (typeof parsed.message === 'string') return parsed.message;
      if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    } catch {
      if (raw && !raw.startsWith('{')) return raw;
    }
  }
  if (err instanceof Error && err.message && !err.message.startsWith('{')) {
    return err.message;
  }
  return fallback;
}

function resolveAuthHeader(
  options?: RequestInit & { accessToken?: string | null },
): string | undefined {
  if (options?.accessToken) return options.accessToken;
  return getStoredAccessToken();
}

function withTenantHeaders(headers: Headers) {
  const orgId = getStoredOrganisationId();
  if (orgId && !headers.has('X-Organisation-Id')) {
    headers.set('X-Organisation-Id', orgId);
  }
  const portal = getAuthPortal();
  if (portal === 'ops') {
    headers.set('X-Auth-Portal', 'ops');
  }
}

async function trySilentRefresh(): Promise<string | undefined> {
  const url = `${API_BASE_URL}/auth/refresh`;
  const portal = getAuthPortal();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(portal === 'ops' ? { 'X-Auth-Portal': 'ops' } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  const text = await res.text();
  if (!res.ok || !text) return undefined;
  try {
    const data = JSON.parse(text) as {
      accessToken?: string;
      refreshToken?: string;
      user?: unknown;
    };
    if (!data.accessToken) return undefined;
    applyRefreshedTokens(data.accessToken, undefined, data.user);
    return data.accessToken;
  } catch {
    return undefined;
  }
}

function invalidateLocalSession(path: string, status: number) {
  const authPath = path.split('?')[0] ?? '';
  if (
    status !== 401 ||
    authPath.startsWith('/auth/login') ||
    authPath.startsWith('/auth/refresh')
  ) {
    return;
  }
  try {
    localStorage.removeItem(getAuthStorageKey());
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));
}

function shouldRetryWithRefresh(path: string, status: number): boolean {
  if (status !== 401) return false;
  const p = path.split('?')[0] ?? '';
  if (p.startsWith('/auth/login') || p.startsWith('/auth/refresh')) {
    return false;
  }
  return true;
}

/** Query string builder for GET requests */
export function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * JSON API calls. Bearer access token + HttpOnly refresh cookie (credentials include).
 * Sends X-Organisation-Id for tenant scoping.
 */
export async function apiFetchJSON<T>(
  path: string,
  options?: RequestInit & { accessToken?: string | null },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('apiFetchJSON requires VITE_API_URL or default API_BASE_URL');
  }
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let bearer = resolveAuthHeader(options);

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers(options?.headers);
    if (
      options?.body &&
      typeof options.body === 'string' &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }
    if (bearer) {
      headers.set('Authorization', `Bearer ${bearer}`);
    }
    withTenantHeaders(headers);

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    const text = await res.text();

    if (
      !res.ok &&
      attempt === 0 &&
      shouldRetryWithRefresh(path, res.status)
    ) {
      const next = await trySilentRefresh();
      if (next) {
        bearer = next;
        continue;
      }
    }

    if (!res.ok) {
      invalidateLocalSession(path, res.status);
      throw new ApiNetworkError(
        text || `Request failed (${res.status})`,
        res.status,
        text,
      );
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiNetworkError('Invalid JSON response', res.status, text);
    }
  }

  throw new ApiNetworkError('Request failed after refresh', 401, '');
}

export async function apiFetchBlob(
  path: string,
  options?: RequestInit & { accessToken?: string | null },
): Promise<{ blob: Blob; filename: string; contentType: string }> {
  if (!API_BASE_URL) {
    throw new Error('apiFetchBlob requires VITE_API_URL or default API_BASE_URL');
  }
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let bearer = resolveAuthHeader(options);
  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers(options?.headers);
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    withTenantHeaders(headers);
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
    if (!res.ok && attempt === 0 && shouldRetryWithRefresh(path, res.status)) {
      const next = await trySilentRefresh();
      if (next) {
        bearer = next;
        continue;
      }
    }
    if (!res.ok) {
      const text = await res.text();
      invalidateLocalSession(path, res.status);
      throw new ApiNetworkError(text || `Request failed (${res.status})`, res.status, text);
    }
    const blob = await res.blob();
    const disp = res.headers.get('content-disposition') ?? '';
    const match = /filename="?([^"]+)"?/i.exec(disp);
    return {
      blob,
      filename: match?.[1] ?? 'download',
      contentType: res.headers.get('content-type') ?? blob.type,
    };
  }
  throw new ApiNetworkError('Request failed after refresh', 401, '');
}

export async function apiFetchFormData<T>(
  path: string,
  formData: FormData,
  options?: { method?: string; accessToken?: string | null },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'apiFetchFormData requires VITE_API_URL or default API_BASE_URL',
    );
  }
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let bearer = options?.accessToken ?? getStoredAccessToken();

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers();
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    withTenantHeaders(headers);
    const res = await fetch(url, {
      method: options?.method ?? 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });
    const text = await res.text();

    if (
      !res.ok &&
      attempt === 0 &&
      shouldRetryWithRefresh(path, res.status)
    ) {
      const next = await trySilentRefresh();
      if (next) {
        bearer = next;
        continue;
      }
    }

    if (!res.ok) {
      invalidateLocalSession(path, res.status);
      throw new ApiNetworkError(
        text || `Upload failed (${res.status})`,
        res.status,
        text,
      );
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiNetworkError('Invalid JSON response', res.status, text);
    }
  }

  throw new ApiNetworkError('Upload failed after refresh', 401, '');
}
