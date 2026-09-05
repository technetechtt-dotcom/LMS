import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const controller = new HealthController(prisma as unknown as PrismaService);

  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  it('reports a healthy database', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.health()).resolves.toMatchObject({
      ok: true,
      db: 'ok',
    });
  });

  it('returns 503 when the database is unavailable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection failed'));

    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
