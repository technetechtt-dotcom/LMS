import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService security decision branches', () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('Correct-password-123!', 4);
  });

  function setup(options: {
    user?: Record<string, unknown> | null;
    roles?: string[];
    config?: Record<string, string>;
  } = {}) {
    const user = options.user === null
      ? null
      : {
          id: 'user-1',
          email: 'person@example.test',
          passwordHash,
          passwordSetAt: new Date(),
          isActive: true,
          deletedAt: null,
          totpEnabled: false,
          totpSecret: null,
          ...options.user,
        };
    const roles = options.roles ?? ['LEARNER'];
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'created-user', ...data })),
        update: jest.fn().mockResolvedValue(user),
      },
      userOrganisation: {
        findMany: jest.fn().mockResolvedValue(roles.map((code, index) => ({
          isPrimary: index === 0,
          organisationId: 'organisation-1',
          role: { code },
        }))),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'reset-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      userPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)),
      },
      enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const transaction = jest.fn((input: unknown) => {
      if (Array.isArray(input)) return Promise.all(input);
      return (input as (tx: typeof prisma) => Promise<unknown>)(prisma);
    });
    const prismaWithTransaction = { ...prisma, $transaction: transaction };
    const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const values = {
      NODE_ENV: 'test',
      REFRESH_TOKEN_TTL_DAYS: '7',
      PASSWORD_RESET_TTL_MINUTES: '60',
      FRONTEND_ORIGIN: 'http://frontend.example.test',
      ...options.config,
    };
    const config = { get: jest.fn((key: string) => values[key as keyof typeof values]) };
    const mail = {
      sendPasswordReset: jest.fn().mockResolvedValue({ providerMessageId: 'mail-1' }),
    };
    const invitations = {
      acceptAndCreateUser: jest.fn().mockResolvedValue({
        id: 'invited-user', email: 'person@example.test',
      }),
    };
    const files = {
      uploadStaged: jest.fn().mockResolvedValue({ key: 'signatures/org/id.png' }),
    };
    const service = new AuthService(
      prismaWithTransaction as never,
      jwt as never,
      config as never,
      mail as never,
      invitations as never,
      files as never,
    );
    (service as unknown as { fakeDelay: jest.Mock }).fakeDelay = jest.fn();
    (service as unknown as { buildUserResponse: jest.Mock }).buildUserResponse =
      jest.fn().mockResolvedValue({ id: user?.id ?? 'created-user' });
    return { service, prisma, jwt, config, mail, invitations, files, user };
  }

  it('requires invitations unless non-production public registration is explicitly enabled', async () => {
    const closed = setup({ config: { NODE_ENV: 'production' } });
    await expect(closed.service.register({
      email: 'new@example.test', password: 'Strong-passphrase-123!', firstName: 'New', lastName: 'User',
    })).rejects.toThrow('invitation only');

    const invited = setup();
    await expect(invited.service.register({
      email: 'PERSON@example.test', password: 'Strong-passphrase-123!', firstName: 'New', lastName: 'User',
      inviteToken: 'invite-token',
    })).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
    expect(invited.invitations.acceptAndCreateUser).toHaveBeenCalledWith(
      'invite-token',
      expect.objectContaining({ email: 'person@example.test' }),
    );

    const publicRegistration = setup({ config: { PUBLIC_REGISTRATION: 'true' } });
    await publicRegistration.service.register({
      email: 'PUBLIC@example.test', password: 'Strong-passphrase-123!', firstName: 'Public', lastName: 'User',
    });
    expect(publicRegistration.prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'public@example.test' }),
    });
  });

  it('fails closed for unknown, inactive, unactivated and incorrect-password accounts', async () => {
    const unknown = setup({ user: null });
    await expect(unknown.service.login({
      email: 'unknown@example.test', password: 'anything',
    })).rejects.toThrow('Invalid credentials');
    expect(unknown.prisma.auditLog.create).toHaveBeenCalled();

    const inactive = setup({ user: { isActive: false } });
    await expect(inactive.service.login({
      email: 'person@example.test', password: 'Correct-password-123!',
    })).rejects.toThrow('Invalid credentials');

    const unactivated = setup({ user: { passwordSetAt: null } });
    await expect(unactivated.service.login({
      email: 'person@example.test', password: 'Correct-password-123!',
    })).rejects.toThrow('activation is required');

    const wrong = setup();
    await expect(wrong.service.login({
      email: 'person@example.test', password: 'wrong-password',
    })).rejects.toThrow('Invalid credentials');
  });

  it('enforces the portal boundary in both directions', async () => {
    const learner = setup({ roles: ['LEARNER'] });
    await expect(learner.service.login({
      email: 'person@example.test', password: 'Correct-password-123!', portal: 'ops',
    })).rejects.toThrow('not authorised');

    const platform = setup({ roles: ['PLATFORM_ADMIN'] });
    await expect(platform.service.login({
      email: 'person@example.test', password: 'Correct-password-123!', portal: 'lms',
    })).rejects.toThrow('Platform operators');
    await expect(platform.service.login({
      email: 'person@example.test', password: 'Correct-password-123!', portal: 'ops',
    })).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
  });

  it('treats corrupt encrypted MFA state as an authentication failure', async () => {
    const corrupted = setup({ user: { totpEnabled: true, totpSecret: 'bad.payload.value' } });
    await expect(corrupted.service.login({
      email: 'person@example.test', password: 'Correct-password-123!', totpCode: '123456',
    })).rejects.toThrow('MFA configuration is invalid');

    const malformed = setup({ user: { totpEnabled: true, totpSecret: 'missing-parts' } });
    await expect(malformed.service.login({
      email: 'person@example.test', password: 'Correct-password-123!', totpCode: '123456',
    })).rejects.toThrow('MFA configuration is invalid');

    const missingSecret = setup({ user: { totpEnabled: true, totpSecret: null } });
    await expect(missingSecret.service.login({
      email: 'person@example.test', password: 'Correct-password-123!', totpCode: '123456',
    })).rejects.toThrow('valid authenticator code');
  });

  it('rejects invalid refresh principals and cross-portal refreshes', async () => {
    const missing = setup();
    await expect(missing.service.refresh({ refreshToken: 'missing' }))
      .rejects.toThrow('Invalid refresh token');

    const lmsOnly = setup({ roles: ['LEARNER'] });
    lmsOnly.prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'session-1', userId: 'user-1', user: { email: 'person@example.test', isActive: true, deletedAt: null },
    });
    await expect(lmsOnly.service.refresh({ refreshToken: 'valid' }, 'ops'))
      .rejects.toThrow('not authorised');

    const platform = setup({ roles: ['PLATFORM_ADMIN'] });
    platform.prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'session-1', userId: 'user-1', user: { email: 'person@example.test', isActive: true, deletedAt: null },
    });
    await expect(platform.service.refresh({ refreshToken: 'valid' }, 'lms'))
      .rejects.toThrow('Platform operators');
  });

  it('keeps password reset enumeration-safe and handles provider failure by environment', async () => {
    const absent = setup({ user: null });
    await expect(absent.service.requestPasswordReset('missing@example.test'))
      .resolves.toEqual({ success: true });
    expect(absent.prisma.passwordResetToken.create).not.toHaveBeenCalled();

    const delivered = setup();
    await delivered.service.requestPasswordReset('PERSON@example.test', { ip: '127.0.0.1' });
    expect(delivered.prisma.passwordResetToken.deleteMany).toHaveBeenCalled();
    expect(delivered.mail.sendPasswordReset).toHaveBeenCalledWith(
      'person@example.test', expect.stringContaining('/reset-password?token='),
    );

    const developmentFailure = setup();
    developmentFailure.mail.sendPasswordReset.mockRejectedValue(new Error('mail down'));
    await expect(developmentFailure.service.requestPasswordReset('person@example.test'))
      .resolves.toEqual({ success: true });

    const productionFailure = setup({ config: { NODE_ENV: 'production' } });
    productionFailure.mail.sendPasswordReset.mockRejectedValue(new Error('mail down'));
    await expect(productionFailure.service.requestPasswordReset('person@example.test'))
      .rejects.toThrow('mail down');
  });

  it('sanitizes preferences and applies profile fields only after uniqueness checks', async () => {
    const { service, prisma } = setup();
    await expect(service.getPreferences('user-1')).resolves.toEqual({});
    prisma.userPreference.findUnique.mockResolvedValueOnce({ value: { language: 'zu-ZA' } });
    await expect(service.getPreferences('user-1')).resolves.toEqual({ language: 'zu-ZA' });
    await service.updatePreferences('user-1', {
      notifyAssessment: true,
      language: 'en-ZA',
      injectedAdmin: true,
      nested: { unsafe: true },
    });
    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          value: { notifyAssessment: true, language: 'en-ZA' },
        }),
      }),
    );

    await service.updateProfile('user-1', {
      email: ' New@example.test ', firstName: ' Ada ', lastName: ' Lovelace ', phone: ' ', jobTitle: ' Engineer ',
    });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        email: 'new@example.test',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: null,
        jobTitle: 'Engineer',
      },
    }));
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'someone-else' });
    await expect(service.updateProfile('user-1', { email: 'taken@example.test' }))
      .rejects.toThrow('already in use');
  });

  it('requires a configured file service and a real signature upload', async () => {
    const ready = setup();
    await expect(ready.service.uploadSignature('user-1', undefined, 'organisation-1'))
      .rejects.toThrow('Signature file is required');
    await ready.service.uploadSignature(
      'user-1',
      { originalname: 'signature.png', path: 'staged' } as never,
      'organisation-1',
    );
    expect(ready.files.uploadStaged).toHaveBeenCalledWith(expect.anything(), {
      prefix: 'signatures', organisationId: 'organisation-1', uploadedById: 'user-1',
    });

    const noFiles = setup();
    (noFiles.service as unknown as { files?: unknown }).files = undefined;
    await expect(noFiles.service.uploadSignature(
      'user-1', { originalname: 'signature.png', path: 'staged' } as never,
    )).rejects.toThrow('not configured');
  });

  it('changes passwords only after verification and revokes all sessions', async () => {
    const missing = setup({ user: null });
    await expect(missing.service.changePassword('user-1', {
      currentPassword: 'x', newPassword: 'New-password-123!',
    })).rejects.toThrow('User not found');

    const wrong = setup();
    await expect(wrong.service.changePassword('user-1', {
      currentPassword: 'wrong', newPassword: 'New-password-123!',
    })).rejects.toThrow('Current password is incorrect');

    const valid = setup();
    await expect(valid.service.changePassword('user-1', {
      currentPassword: 'Correct-password-123!', newPassword: 'New-password-123!',
    })).resolves.toEqual({ success: true });
    expect(valid.prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(valid.prisma.auditLog.create).toHaveBeenCalled();
  });

  it('covers MFA enrollment and disable failure states', async () => {
    const missing = setup({ user: null });
    await expect(missing.service.beginMfaEnrollment('user-1')).rejects.toThrow('User not found');

    const already = setup({ user: { totpEnabled: true } });
    await expect(already.service.beginMfaEnrollment('user-1')).rejects.toThrow('already enabled');

    const notStarted = setup({ user: { totpSecret: null } });
    await expect(notStarted.service.confirmMfaEnrollment('user-1', '123456'))
      .rejects.toThrow('Start MFA enrollment');

    const notEnabled = setup({ user: { totpEnabled: false, totpSecret: null } });
    await expect(notEnabled.service.disableMfa('user-1', 'password', '123456'))
      .rejects.toThrow('MFA is not enabled');
  });

  it('revokes one session or every session without touching sibling accounts', async () => {
    const { service, prisma } = setup();
    await expect(service.logoutSession('user-1', 'session-1'))
      .resolves.toEqual({ success: true, data: null });
    await expect(service.logoutEverywhere('user-1'))
      .resolves.toEqual({ success: true, data: null });
    expect(prisma.refreshToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'session-1', userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
