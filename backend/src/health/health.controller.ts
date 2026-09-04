import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        db: 'ok',
        ts: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        ok: false,
        db: 'error',
        ts: new Date().toISOString(),
      });
    }
  }

  @Public()
  @Get('metrics')
  metrics() {
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
    };
  }
}
