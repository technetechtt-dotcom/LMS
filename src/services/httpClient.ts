import { API_BASE_URL } from '../config/env';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
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

function resolveAuthHeader(
  options?: RequestInit & { accessToken?: string | null }
): string | undefined {
  if (options?.accessToken) return options.accessToken;
  return getStoredAccessToken();
}

async function trySilentRefresh(): Promise<string | undefined> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return undefined;
  const url = `${API_BASE_URL}/auth/refresh`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
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
    applyRefreshedTokens(
      data.accessToken,
      data.refreshToken,
      data.user,
    );
    return data.accessToken;
  } catch {
    return undefined;
  }
}

function shouldRetryWithRefresh(path: string, status: number): boolean {
  if (status !== 401) return false;
  const p = path.split('?')[0] ?? '';
  if (p.startsWith('/auth/login') || p.startsWith('/auth/refresh')) {
    return false;
  }
  return Boolean(getStoredRefreshToken());
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
 * JSON API calls when VITE_API_URL is set.
 * Bearer token: explicit `accessToken`, else last token from login (`localStorage`).
 * Refreshes session once on 401 when a refresh token is present (non-auth paths).
 */
export async function apiFetchJSON<T>(
  path: string,
  options?: RequestInit & { accessToken?: string | null }
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

    const res = await fetch(url, { ...options, headers });
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
      throw new ApiNetworkError(
        text || `Request failed (${res.status})`,
        res.status,
        text
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

export async function apiFetchFormData<T>(
  path: string,
  formData: FormData,
  options?: { method?: string; accessToken?: string | null }
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('apiFetchFormData requires VITE_API_URL or default API_BASE_URL');
  }
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let bearer = options?.accessToken ?? getStoredAccessToken();

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers();
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    const res = await fetch(url, {
      method: options?.method ?? 'POST',
      body: formData,
      headers,
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
      throw new ApiNetworkError(
        text || `Upload failed (${res.status})`,
        res.status,
        text
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
