import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../common/file-storage.service';
import { MailService } from '../mail/mail.service';
import { MailDeliveryQueueService } from '../mail/mail-delivery-queue.service';
import { telemetry } from '../common/telemetry';

type Check = { ok: boolean; detail?: string; [key: string]: unknown };

@ApiTags('Health')
@SkipThrottle()
@Public()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly mailQueue: MailDeliveryQueueService,
  ) {}

  private revision() {
    return this.config.get<string>('APP_VERSION')?.trim()
      || this.config.get<string>('GIT_SHA')?.trim()
      || this.config.get<string>('RENDER_GIT_COMMIT')?.trim()
      || (this.config.get<string>('NODE_ENV') === 'production' ? '' : 'development');
  }

  @Get('health/live')
  live() {
    return { ok: true, status: 'live', ts: new Date().toISOString() };
  }

  @Get('version')
  version() {
    return { revision: this.revision() || 'unknown' };
  }

  private async integrationChecks(): Promise<Record<string, Check>> {
    const storage = await this.files.readinessProbe()
      .then((result) => ({ ...result } as Check))
      .catch((error: unknown) => ({ ok: false, detail: error instanceof Error ? error.message : String(error) }));
    const malware = await this.files.scannerAvailability()
      .then((result) => ({ ...result } as Check))
      .catch((error: unknown) => ({ ok: false, detail: error instanceof Error ? error.message : String(error) }));
    const mail = await this.mail.availabilityStatus()
      .then((result) => ({ ...result } as Check))
      .catch((error: unknown) => ({ ok: false, detail: error instanceof Error ? error.message : String(error) }));
    return { storage, malware, mail };
  }

  @Get('health/integrations')
  async integrations() {
    const checks = await this.integrationChecks();
    const ok = Object.values(checks).every((check) => check.ok);
    const body = { ok, status: ok ? 'ready' : 'degraded', checks, ts: new Date().toISOString() };
    if (!ok) throw new ServiceUnavailableException(body);
    return body;
  }

  @Get('health')
  @Get('health/ready')
  async ready() {
    const checks: Record<string, Check> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true };
    } catch (error) {
      checks.database = { ok: false, detail: error instanceof Error ? error.message : 'unavailable' };
    }
    try {
      const migrationState = await this.prisma.$queryRaw<Array<{
        failed: bigint;
        latest_applied: boolean;
      }>>`
        SELECT
          COUNT(*) FILTER (
            WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
          )::bigint AS failed,
          COALESCE(
            BOOL_OR(
              "migration_name" = '20260909120000_security_release_blockers'
              AND "finished_at" IS NOT NULL
              AND "rolled_back_at" IS NULL
            ),
            false
          ) AS latest_applied
        FROM "_prisma_migrations"
      `;
      checks.migrations = migrationState[0]?.failed === 0n
        && migrationState[0]?.latest_applied === true
        ? { ok: true }
        : { ok: false, detail: 'Pending or failed database migration detected' };
    } catch (error) {
      checks.migrations = { ok: false, detail: error instanceof Error ? error.message : 'migration state unavailable' };
    }
    Object.assign(checks, await this.integrationChecks());
    const revision = this.revision();
    const production = this.config.get<string>('NODE_ENV') === 'production';
    checks.signingSecrets = {
      ok: !production || Boolean(
        this.config.get<string>('JWT_SECRET')?.trim()
          && this.config.get<string>('FILE_SIGNING_SECRET')?.trim()
          && this.config.get<string>('JOB_ENCRYPTION_KEY')?.trim()
          && this.config.get<string>('MFA_ENCRYPTION_KEY')?.trim(),
      ),
    };
    if (production) {
      try {
        const missingMfa = await this.prisma.user.count({
          where: {
            deletedAt: null,
            isActive: true,
            totpEnabled: false,
            memberships: {
              some: {
                deletedAt: null,
                role: {
                  code: {
                    in: [
                      'ADMIN',
                      'PLATFORM_ADMIN',
                      'FACILITATOR',
                      'ASSESSOR',
                      'MODERATOR',
                      'QA_OFFICER',
                      'SETA',
                    ],
                  },
                },
              },
            },
          },
        });
        checks.privilegedMfa = {
          ok: missingMfa === 0,
          unenrolledAccounts: missingMfa,
        };
      } catch (error) {
        checks.privilegedMfa = {
          ok: false,
          detail: error instanceof Error ? error.message : 'MFA state unavailable',
        };
      }
    }
    checks.revision = { ok: Boolean(revision), value: revision || 'unknown' };
    checks.backgroundWorker = this.mailQueue.status();
    const ok = Object.values(checks).every((check) => check.ok);
    const body = {
      ok,
      status: ok ? 'ready' : 'not-ready',
      revision: revision || 'unknown',
      checks,
      ts: new Date().toISOString(),
    };
    if (!ok) throw new ServiceUnavailableException(body);
    return body;
  }

  @Get('metrics')
  metrics() {
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      revision: this.revision() || 'unknown',
      requestTelemetry: telemetry.snapshot(),
    };
  }
}
