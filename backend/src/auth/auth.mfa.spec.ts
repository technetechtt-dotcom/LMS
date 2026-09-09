import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { totpCode } from '../common/crypto/totp';

describe('AuthService TOTP MFA', () => {
  it('encrypts enrollment secrets, verifies setup, and enforces MFA at login', async () => {
    const password = 'A-strong-password-123!';
    const passwordHash = await bcrypt.hash(password, 4);
    const user = {
      id: 'admin-1',
      email: 'admin@example.com',
      passwordHash,
      passwordSetAt: new Date(),
      totpEnabled: false,
      totpSecret: null as string | null,
      deletedAt: null,
      isActive: true,
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(user, data);
          return Promise.resolve(user);
        }),
      },
      userOrganisation: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: 'ADMIN' } }]),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((operations: Array<Promise<unknown>>) => Promise.all(operations)),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'MFA_ENCRYPTION_KEY') return 'mfa-encryption-key-longer-than-32-characters';
        if (key === 'MFA_ISSUER') return 'SkillForge Test';
        if (key === 'REFRESH_TOKEN_TTL_DAYS') return '7';
        return undefined;
      }),
    };
    const service = new AuthService(
      prisma as never,
      jwt as never,
      config as never,
      {} as never,
      {} as never,
    );
    (service as unknown as { buildUserResponse: jest.Mock }).buildUserResponse =
      jest.fn().mockResolvedValue({ id: user.id });

    const setup = await service.beginMfaEnrollment(user.id);
    expect(setup.secret).toMatch(/^[A-Z2-7]+$/);
    expect(user.totpSecret).not.toContain(setup.secret);
    expect(setup.otpauthUri).toContain('otpauth://totp/');

    await expect(service.confirmMfaEnrollment(user.id, '000000'))
      .rejects.toThrow('Invalid authenticator code');
    await expect(service.confirmMfaEnrollment(user.id, totpCode(setup.secret)))
      .resolves.toEqual({ enabled: true });
    expect(user.totpEnabled).toBe(true);

    await expect(service.login({ email: user.email, password, totpCode: '000000' }))
      .rejects.toThrow('valid authenticator code');
    await expect(service.login({
      email: user.email,
      password,
      totpCode: totpCode(setup.secret),
    })).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
  });
});
