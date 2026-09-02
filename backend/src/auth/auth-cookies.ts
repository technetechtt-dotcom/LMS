import type { CookieOptions, Request, Response } from 'express';

export const LMS_REFRESH_COOKIE = 'sf_refresh';
export const OPS_REFRESH_COOKIE = 'sf_ops_refresh';

export type AuthPortal = 'lms' | 'ops';

export function portalFromRequest(req: Request): AuthPortal {
  const header = req.headers['x-auth-portal'];
  return header === 'ops' ? 'ops' : 'lms';
}

export function refreshCookieName(portal: AuthPortal): string {
  return portal === 'ops' ? OPS_REFRESH_COOKIE : LMS_REFRESH_COOKIE;
}

/** @deprecated Use refreshCookieName(portal) */
export const REFRESH_COOKIE_NAME = LMS_REFRESH_COOKIE;

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
  portal: AuthPortal = 'lms',
) {
  const maxAgeMs = Math.max(1, ttlDays) * 24 * 60 * 60 * 1000;
  res.cookie(
    refreshCookieName(portal),
    token,
    refreshCookieOptions(nodeEnv, maxAgeMs),
  );
}

export function clearRefreshCookie(
  res: Response,
  nodeEnv: string,
  portal: AuthPortal = 'lms',
) {
  res.cookie(refreshCookieName(portal), '', {
    ...refreshCookieOptions(nodeEnv, 0),
    maxAge: 0,
  });
}

export function readRefreshFromRequest(
  req: Request,
  bodyToken?: string,
  portal: AuthPortal = 'lms',
): string | undefined {
  const fromBody =
    typeof bodyToken === 'string' && bodyToken.trim()
      ? bodyToken.trim()
      : undefined;
  if (fromBody) return fromBody;
  const cookies = (
    req as Request & { cookies?: Record<string, string> }
  ).cookies;
  const fromCookie = cookies?.[refreshCookieName(portal)];
  return typeof fromCookie === 'string' && fromCookie.trim()
    ? fromCookie.trim()
    : undefined;
}
