import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService break-glass recovery', () => {
  it('requires independent platform approval and consumes the recovery token once', async () => {
    const password = 'A-strong-password-123!';
    const passwordHash = await bcrypt.hash(password, 4);
    const requester = {
      id: 'requester-1',
      email: 'requester@example.com',
      passwordHash,
      passwordSetAt: new Date(),
      totpEnabled: true,
      deletedAt: null,
      isActive: true,
    };
    const request = {
      id: 'break-glass-1',
      organisationId: 'org-1',
      requestedById: requester.id,
      reason: 'Authenticator device was destroyed',
      status: 'PENDING',
      tokenHash: null as string | null,
      expiresAt: null as Date | null,
      redeemedAt: null as Date | null,
      requestedAt: new Date(),
    };

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(requester),
      },
      userOrganisation: {
        findFirst: jest.fn().mockResolvedValue({
          organisationId: request.organisationId,
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          const code = where.userId === 'outsider-1' ? 'ADMIN' : 'PLATFORM_ADMIN';
          return Promise.resolve([{ role: { code } }]);
        }),
      },
      breakGlassAccess: {
        create: jest.fn().mockResolvedValue({
          id: request.id,
          status: request.status,
          requestedAt: request.requestedAt,
        }),
        findFirst: jest.fn().mockImplementation(({ where, include }) => {
          if (where.id !== request.id || where.status !== request.status) {
            return Promise.resolve(null);
          }
          return Promise.resolve(include?.requestedBy
            ? { ...request, requestedBy: requester }
            : { ...request });
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          if (where.id !== request.id || where.status !== request.status) {
            return Promise.resolve({ count: 0 });
          }
          Object.assign(request, data);
          return Promise.resolve({ count: 1 });
        }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const config = {
      get: jest.fn((key: string) => key === 'REFRESH_TOKEN_TTL_DAYS' ? '7' : undefined),
    };
    const service = new AuthService(
      prisma as never,
      jwt as never,
      config as never,
      {} as never,
      {} as never,
    );
    (service as unknown as { buildUserResponse: jest.Mock }).buildUserResponse =
      jest.fn().mockResolvedValue({ id: requester.id });

    await expect(service.requestBreakGlass(
      requester.email,
      password,
      request.reason,
    )).resolves.toEqual(expect.objectContaining({ id: request.id }));

    await expect(service.approveBreakGlass(request.id, 'outsider-1'))
      .rejects.toThrow('Platform approval is required');
    await expect(service.approveBreakGlass(request.id, requester.id))
      .rejects.toThrow('independent approval');

    const approval = await service.approveBreakGlass(request.id, 'approver-1');
    expect(approval.token).toEqual(expect.any(String));
    expect(request.status).toBe('APPROVED');

    await expect(service.redeemBreakGlass(
      request.id,
      approval.token,
      requester.email,
      password,
    )).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
    expect(request.status).toBe('REDEEMED');

    await expect(service.redeemBreakGlass(
      request.id,
      approval.token,
      requester.email,
      password,
    )).rejects.toThrow('invalid or expired');
  });
});
