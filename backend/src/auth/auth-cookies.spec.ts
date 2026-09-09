import {
  LMS_REFRESH_COOKIE,
  OPS_REFRESH_COOKIE,
  clearAllRefreshCookies,
  portalFromRequest,
  readRefreshFromRequest,
  refreshCookieName,
  refreshCookieOptions,
  setRefreshCookie,
} from './auth-cookies';

describe('portal-bound refresh cookies', () => {
  it('uses independent names for LMS and Ops', () => {
    expect(refreshCookieName('lms')).toBe(LMS_REFRESH_COOKIE);
    expect(refreshCookieName('ops')).toBe(OPS_REFRESH_COOKIE);
  });

  it('selects the portal from a strict request header', () => {
    expect(portalFromRequest({ headers: { 'x-auth-portal': 'ops' } } as never)).toBe('ops');
    expect(portalFromRequest({ headers: { 'x-auth-portal': 'other' } } as never)).toBe('lms');
  });

  it('reads only the cookie for the requested portal', () => {
    const request = {
      cookies: { [LMS_REFRESH_COOKIE]: 'lms-token', [OPS_REFRESH_COOKIE]: 'ops-token' },
    } as never;
    expect(readRefreshFromRequest(request, undefined, 'lms')).toBe('lms-token');
    expect(readRefreshFromRequest(request, undefined, 'ops')).toBe('ops-token');
    expect(readRefreshFromRequest(request, 'body-token', 'ops')).toBe('body-token');
  });

  it('sets secure cross-site cookies in production and clears both only explicitly', () => {
    expect(refreshCookieOptions('production', 1000)).toEqual(
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'none', path: '/auth' }),
    );
    const response = { cookie: jest.fn() };
    setRefreshCookie(response as never, 'ops-secret', 'production', 7, 'ops');
    expect(response.cookie).toHaveBeenCalledWith(
      OPS_REFRESH_COOKIE,
      'ops-secret',
      expect.objectContaining({ secure: true }),
    );
    clearAllRefreshCookies(response as never, 'production');
    expect(response.cookie).toHaveBeenCalledWith(LMS_REFRESH_COOKIE, '', expect.any(Object));
    expect(response.cookie).toHaveBeenCalledWith(OPS_REFRESH_COOKIE, '', expect.any(Object));
  });
});
