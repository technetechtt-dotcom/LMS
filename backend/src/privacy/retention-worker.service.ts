import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetentionWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RetentionWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get<string>('RETENTION_WORKER_ENABLED') === 'false') return;
    const minutes = Math.max(15, Number(this.config.get<string>('RETENTION_WORKER_INTERVAL_MINUTES') ?? 1440));
    this.timer = setInterval(() => void this.run(), minutes * 60_000);
    this.timer.unref();
    void this.run();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      const policies = await this.prisma.retentionPolicy.findMany();
      for (const policy of policies) {
        const cutoff = new Date(Date.now() - policy.retainDays * 86_400_000);
        if (policy.entityType.toUpperCase() === 'UPLOAD') {
          const uploads = await this.prisma.uploadRecord.findMany({
            where: {
              organisationId: policy.organisationId,
              status: { not: 'PURGED' },
              createdAt: { lte: cutoff },
            },
            select: { id: true, createdAt: true },
            take: 1000,
          });
          if (uploads.length) {
            await this.prisma.$transaction(uploads.map((upload) =>
              this.prisma.uploadRecord.update({
                where: { id: upload.id },
                data: { retentionUntil: new Date(upload.createdAt.getTime() + policy.retainDays * 86_400_000) },
              }),
            ));
          }
        }
        if (policy.entityType.toUpperCase() === 'GENERATED_REPORT' && policy.disposalMethod === 'SOFT_DELETE') {
          await this.prisma.generatedReport.updateMany({
            where: {
              organisationId: policy.organisationId,
              deletedAt: null,
              createdAt: { lte: cutoff },
            },
            data: { deletedAt: new Date() },
          });
        }
      }
      await this.files.purgeExpired(1000);
    } catch (error) {
      this.logger.error('Scheduled retention enforcement failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
