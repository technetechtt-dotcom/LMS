import { UsersService } from './users.service';

describe('UsersService activation replacement and delivery', () => {
  const actor = {
    userId: 'admin-1',
    email: 'admin@example.com',
    organisationId: 'organisation-1',
    roleCodes: ['ADMIN'],
  };

  function setup(options: { attempts?: number; mailFails?: boolean } = {}) {
    const tx = {
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'replacement-token' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'new.user@example.com',
          passwordSetAt: null,
          isActive: true,
        }),
      },
      mailDeliveryAttempt: {
        count: jest.fn().mockResolvedValue(options.attempts ?? 0),
      },
      $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const mail = {
      sendActivation: options.mailFails
        ? jest.fn().mockRejectedValue(new Error('provider unavailable'))
        : jest.fn().mockResolvedValue({ providerMessageId: 'provider-123' }),
    };
    const queue = {
      recordAttempt: jest.fn().mockResolvedValue({}),
      enqueue: jest.fn().mockResolvedValue({}),
    };
    const service = new UsersService(
      prisma as never,
      mail as never,
      { get: jest.fn((key: string) => key === 'ACTIVATION_TTL_HOURS' ? '24' : 'https://lms.example.com') } as never,
      queue as never,
    );
    return { service, prisma, tx, mail, queue };
  }

  it('expires previous activation tokens before issuing and delivering a replacement', async () => {
    const { service, tx, queue } = setup();
    const result = await service.resendActivation('user-1', actor);
    expect(result.mailStatus).toBe('SENT');
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', purpose: 'ACTIVATION', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(tx.passwordResetToken.create).toHaveBeenCalled();
    expect(queue.recordAttempt).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SENT',
      providerMessageId: 'provider-123',
    }));
  });

  it('reports FAILED truthfully and queues a retry when delivery fails', async () => {
    const { service, queue } = setup({ mailFails: true });
    await expect(service.resendActivation('user-1', actor)).resolves.toEqual(
      expect.objectContaining({ mailStatus: 'FAILED' }),
    );
    expect(queue.recordAttempt).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
      error: 'provider unavailable',
    }));
    expect(queue.enqueue).toHaveBeenCalled();
  });

  it('rate-limits repeated resend requests', async () => {
    const { service, prisma, tx } = setup({ attempts: 3 });
    await expect(service.resendActivation('user-1', actor)).rejects.toThrow(
      'rate limit reached',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.passwordResetToken.create).not.toHaveBeenCalled();
  });
});
