import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ComplianceService } from './compliance.service';

/**
 * Sends compliance schedule reminders on a timer so they do not depend on
 * someone opening the SETA compliance page (GET side effect).
 */
@Injectable()
export class ComplianceReminderWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ComplianceReminderWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly compliance: ComplianceService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get<string>('COMPLIANCE_REMINDER_WORKER_ENABLED') === 'false') {
      return;
    }
    const minutes = Math.max(
      5,
      Number(this.config.get<string>('COMPLIANCE_REMINDER_INTERVAL_MINUTES') ?? 60),
    );
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
      const result = await this.compliance.processDueReminders();
      if (result.reminded > 0 || result.overdue > 0) {
        this.logger.log(
          `Compliance reminders: ${result.reminded} reminded, ${result.overdue} overdue`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Compliance reminder worker failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
