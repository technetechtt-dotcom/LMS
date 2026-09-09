import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

type Template = 'password-reset' | 'account-activation';

@Injectable()
export class MailDeliveryQueueService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MailDeliveryQueueService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;
  private lastHeartbeatAt?: Date;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private key() {
    const secret = this.config.get<string>('JOB_ENCRYPTION_KEY')?.trim()
      || this.config.get<string>('JWT_SECRET')?.trim()
      || 'development-job-key';
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
  }

  private decrypt(value: string): string {
    const [ivRaw, tagRaw, dataRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !dataRaw) throw new Error('Invalid queued mail payload');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  async recordAttempt(input: {
    organisationId?: string;
    userId?: string;
    recipient: string;
    template: Template;
    status: 'SENT' | 'FAILED';
    providerMessageId?: string;
    error?: string;
  }) {
    return this.prisma.mailDeliveryAttempt.create({
      data: {
        ...input,
        error: input.error?.slice(0, 500),
        providerMessageId: input.providerMessageId?.slice(0, 255),
      },
    });
  }

  async enqueue(input: {
    organisationId?: string;
    userId?: string;
    recipient: string;
    template: Template;
    actionUrl: string;
  }) {
    return this.prisma.mailDeliveryJob.create({
      data: {
        organisationId: input.organisationId,
        userId: input.userId,
        recipient: input.recipient,
        template: input.template,
        actionUrlCiphertext: this.encrypt(input.actionUrl),
      },
      select: { id: true, status: true },
    });
  }

  onApplicationBootstrap() {
    if (this.config.get<string>('MAIL_RETRY_WORKER_ENABLED') === 'false') return;
    this.timer = setInterval(() => void this.processBatch(), 30_000);
    this.timer.unref();
    void this.processBatch();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  status(): { ok: boolean; mode: string; lastHeartbeatAt?: string } {
    const enabled = this.config.get<string>('MAIL_RETRY_WORKER_ENABLED') !== 'false';
    const recent = Boolean(
      this.lastHeartbeatAt
        && Date.now() - this.lastHeartbeatAt.getTime() < 120_000,
    );
    return {
      ok: enabled && recent,
      mode: enabled ? 'database-queue' : 'disabled',
      lastHeartbeatAt: this.lastHeartbeatAt?.toISOString(),
    };
  }

  async processBatch() {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.prisma.mailDeliveryJob.updateMany({
        where: {
          status: 'PROCESSING',
          lockedAt: { lt: new Date(Date.now() - 5 * 60_000) },
        },
        data: { status: 'QUEUED', lockedAt: null },
      });
      const jobs = await this.prisma.mailDeliveryJob.findMany({
        where: { status: 'QUEUED', availableAt: { lte: new Date() }, attempts: { lt: 5 } },
        orderBy: { availableAt: 'asc' },
        take: 10,
      });
      for (const job of jobs) {
        const claimed = await this.prisma.mailDeliveryJob.updateMany({
          where: { id: job.id, status: 'QUEUED' },
          data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } },
        });
        if (!claimed.count) continue;
        try {
          const url = this.decrypt(job.actionUrlCiphertext);
          const receipt = job.template === 'password-reset'
            ? await this.mail.sendPasswordReset(job.recipient, url)
            : await this.mail.sendActivation(job.recipient, url);
          await this.recordAttempt({
            organisationId: job.organisationId ?? undefined,
            userId: job.userId ?? undefined,
            recipient: job.recipient,
            template: job.template as Template,
            status: 'SENT',
            providerMessageId: receipt?.providerMessageId,
          });
          await this.prisma.mailDeliveryJob.update({
            where: { id: job.id },
            data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null, lastError: null },
          });
        } catch (error) {
          const attempts = job.attempts + 1;
          const message = error instanceof Error ? error.message : String(error);
          await this.recordAttempt({
            organisationId: job.organisationId ?? undefined,
            userId: job.userId ?? undefined,
            recipient: job.recipient,
            template: job.template as Template,
            status: 'FAILED',
            error: message,
          });
          await this.prisma.mailDeliveryJob.update({
            where: { id: job.id },
            data: {
              status: attempts >= 5 ? 'DEAD' : 'QUEUED',
              availableAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
              lockedAt: null,
              lastError: message.slice(0, 500),
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Mail retry worker failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.lastHeartbeatAt = new Date();
      this.processing = false;
    }
  }
}
