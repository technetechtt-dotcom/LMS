import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { RetentionWorkerService } from './retention-worker.service';

@Module({
  controllers: [PrivacyController],
  providers: [RetentionWorkerService],
})
export class PrivacyModule {}
