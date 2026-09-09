import { AuthService } from './auth.service';

describe('activation/reset token security', () => {
  const validRow = {
    id: 'token-1',
    userId: 'user-1',
    purpose: 'ACTIVATION',
    user: {
      id: 'user-1',
      email: 'new.user@example.com',
      deletedAt: null,
      isActive: true,
    },
  };

  function setup(row: unknown, consumeCount = 1) {
    const passwordResetToken = {
      findFirst: jest.fn().mockResolvedValue(row),
      updateMany: jest.fn()
        .mockResolvedValueOnce({ count: consumeCount })
        .mockResolvedValue({ count: 1 }),
    };
    const tx = {
      passwordResetToken,
      user: { update: jest.fn().mockResolvedValue({}) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      ...tx,
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    return { service, prisma, tx };
  }

  it('rejects expired activation links without changing the user', async () => {
    const { service, tx } = setup(null);
    await expect(service.confirmPasswordReset('expired', 'Strong-passphrase-123!'))
      .rejects.toThrow('Invalid or expired reset link');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('atomically rejects a replay won by another request', async () => {
    const { service, tx } = setup(validRow, 0);
    await expect(service.confirmPasswordReset('already-used', 'Strong-passphrase-123!'))
      .rejects.toThrow('Invalid or expired reset link');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('sets the password and invalidates every remaining reset/activation token', async () => {
    const { service, prisma, tx } = setup(validRow);
    await expect(service.confirmPasswordReset('one-use-token', 'Strong-passphrase-123!'))
      .resolves.toEqual({ success: true, data: null });
    expect(tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ id: 'token-1', usedAt: null }),
      }),
    );
    expect(tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { userId: 'user-1', usedAt: null } }),
    );
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ passwordSetAt: expect.any(Date) }),
    }));
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
