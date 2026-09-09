import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService independent sessions', () => {
  let passwordHash: string;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    userOrganisation: { findMany: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('A-strong-password-123!', 4);
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'person@example.com',
          passwordHash,
          passwordSetAt: new Date(),
          isActive: true,
          deletedAt: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      userOrganisation: {
        findMany: jest.fn().mockResolvedValue([
          { role: { code: 'LEARNER' } },
        ]),
      },
      refreshToken: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 'session-1' })
          .mockResolvedValueOnce({ id: 'session-2' }),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    jwt = {
      signAsync: jest
        .fn()
        .mockImplementation((payload: { sessionId: string }) =>
          Promise.resolve(`access-${payload.sessionId}`),
        ),
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'REFRESH_TOKEN_TTL_DAYS') return '7';
        return undefined;
      }),
    };
    service = new AuthService(
      prisma as never,
      jwt as never,
      config as never,
      {} as never,
      {} as never,
    );
    (service as unknown as { buildUserResponse: jest.Mock }).buildUserResponse =
      jest.fn().mockResolvedValue({ id: 'user-1' });
  });

  it('keeps earlier sessions active when the same account logs in again', async () => {
    const first = await service.login({
      email: 'PERSON@example.com',
      password: 'A-strong-password-123!',
      portal: 'lms',
    });
    const second = await service.login({
      email: 'person@example.com',
      password: 'A-strong-password-123!',
      portal: 'lms',
    });

    expect(first.sessionId).toBe('session-1');
    expect(second.sessionId).toBe('session-2');
    expect(first.accessToken).toBe('access-session-1');
    expect(second.accessToken).toBe('access-session-2');
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(2);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('rotates only the presented portal-bound refresh session', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      portal: 'lms',
      user: {
        email: 'person@example.com',
        deletedAt: null,
        isActive: true,
      },
    });

    const refreshed = await service.refresh({ refreshToken: 'refresh-one' }, 'lms');

    expect(refreshed.sessionId).toBe('session-1');
    expect(refreshed.accessToken).toBe('access-session-1');
    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ portal: 'lms', revokedAt: null }),
      }),
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'session-1', portal: 'lms' }),
        data: expect.not.objectContaining({ revokedAt: expect.anything() }),
      }),
    );
  });

  it('rejects an account that has not completed activation', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      passwordHash,
      passwordSetAt: null,
      isActive: true,
      deletedAt: null,
    });

    await expect(
      service.login({
        email: 'person@example.com',
        password: 'A-strong-password-123!',
      }),
    ).rejects.toThrow('Account activation is required');
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('does not allow an LMS-only account to create an Ops session', async () => {
    await expect(
      service.login({
        email: 'person@example.com',
        password: 'A-strong-password-123!',
        portal: 'ops',
      }),
    ).rejects.toThrow('not authorised for the ops console');
  });

  it('logs out one session without revoking the account’s other sessions', async () => {
    await service.logoutSession('user-1', 'session-1');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('detects a refresh token replay after rotation', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      portal: 'lms',
      user: { email: 'person@example.com', deletedAt: null, isActive: true },
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh({ refreshToken: 'already-used' }, 'lms'),
    ).rejects.toThrow('already rotated');
  });
});
