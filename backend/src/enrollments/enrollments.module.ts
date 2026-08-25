import { Module } from '@nestjs/common';
import { WorkplaceLogsModule } from '../workplace-logs/workplace-logs.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CompletionGateService } from './completion-gate.service';

@Module({
  imports: [WorkplaceLogsModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, CompletionGateService],
  exports: [EnrollmentsService, CompletionGateService],
})
export class EnrollmentsModule {}
