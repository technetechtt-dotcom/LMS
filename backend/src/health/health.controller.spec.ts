import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';
import type { FileStorageService } from '../common/file-storage.service';
import type { MailService } from '../mail/mail.service';
import type { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  const prisma = { $queryRaw: jest.fn() };
  const files = {
    readinessProbe: jest.fn(),
    scannerAvailability: jest.fn(),
  };
  const mail = { availabilityStatus: jest.fn() };
  const config = { get: jest.fn() };
  const mailQueue = { status: jest.fn() };
  const controller = new HealthController(
    prisma as unknown as PrismaService,
    files as unknown as FileStorageService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
    mailQueue as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([{ failed: 0n, latest_applied: true }]);
    files.readinessProbe.mockResolvedValue({ ok: true });
    files.scannerAvailability.mockResolvedValue({ ok: true });
    mail.availabilityStatus.mockResolvedValue({ ok: true });
    mailQueue.status.mockReturnValue({ ok: true, mode: 'database-queue' });
    config.get.mockImplementation((key: string) =>
      key === 'APP_VERSION' ? 'test-sha' : key === 'NODE_ENV' ? 'test' : undefined,
    );
  });

  it('exposes a process-only liveness result', () => {
    expect(controller.live()).toMatchObject({ ok: true, status: 'live' });
  });

  it('reports ready only when dependencies and migration state are healthy', async () => {
    await expect(controller.ready()).resolves.toMatchObject({
      ok: true,
      status: 'ready',
      revision: 'test-sha',
    });
  });

  it('returns 503 when the database is unavailable', async () => {
    prisma.$queryRaw.mockReset().mockRejectedValue(new Error('connection failed'));
    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns 503 when the mail provider cannot be reached', async () => {
    mail.availabilityStatus.mockRejectedValue(new Error('mail provider unavailable'));
    await expect(controller.integrations()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
