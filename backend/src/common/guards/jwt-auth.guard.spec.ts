import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function requestContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard session enforcement', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
  const jwt = { verifyAsync: jest.fn() };
  const refreshToken = { findFirst: jest.fn() };
  const guard = new JwtAuthGuard(
    reflector as never,
    jwt as never,
    { refreshToken } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      roleCodes: ['LEARNER'],
      sessionId: 'session-1',
      portal: 'lms',
    });
    refreshToken.findFirst.mockResolvedValue({ id: 'session-1' });
  });

  it('accepts a token backed by an active session for the current portal', async () => {
    const request = { headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(requestContext(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user.userId', 'user-1');
    expect(refreshToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ portal: 'lms' }),
      }),
    );
  });

  it('rejects a token after its refresh session has been revoked', async () => {
    refreshToken.findFirst.mockResolvedValue(null);
    const request = { headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(requestContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an LMS token presented to the Ops portal', async () => {
    const request = {
      headers: {
        authorization: 'Bearer token',
        'x-auth-portal': 'ops',
      },
    };

    await expect(guard.canActivate(requestContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshToken.findFirst).not.toHaveBeenCalled();
  });
});
