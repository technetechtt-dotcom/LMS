import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplianceReminderWorker } from './compliance-reminder.worker';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceReminderWorker],
  exports: [ComplianceService],
})
export class ComplianceModule {}
