import type { CookieOptions, Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'sf_refresh';

export function refreshCookieOptions(
  nodeEnv: string,
  maxAgeMs: number,
): CookieOptions {
  const secure = nodeEnv === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/auth',
    maxAge: maxAgeMs,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  nodeEnv: string,
  ttlDays: number,
) {
  const maxAgeMs = Math.max(1, ttlDays) * 24 * 60 * 60 * 1000;
  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    refreshCookieOptions(nodeEnv, maxAgeMs),
  );
}

export function clearRefreshCookie(res: Response, nodeEnv: string) {
  res.cookie(REFRESH_COOKIE_NAME, '', {
    ...refreshCookieOptions(nodeEnv, 0),
    maxAge: 0,
  });
}

export function readRefreshFromRequest(
  req: Request,
  bodyToken?: string,
): string | undefined {
  const fromBody =
    typeof bodyToken === 'string' && bodyToken.trim()
      ? bodyToken.trim()
      : undefined;
  if (fromBody) return fromBody;
  const cookies = (
    req as Request & { cookies?: Record<string, string> }
  ).cookies;
  const fromCookie = cookies?.[REFRESH_COOKIE_NAME];
  return typeof fromCookie === 'string' && fromCookie.trim()
    ? fromCookie.trim()
    : undefined;
}
