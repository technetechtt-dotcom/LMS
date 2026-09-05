import { Module } from '@nestjs/common';
import { AssessmentInstancesController } from './assessment-instances.controller';
import { AssessmentInstancesService } from './assessment-instances.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AssessmentInstancesController],
  providers: [AssessmentInstancesService],
  exports: [AssessmentInstancesService],
})
export class AssessmentInstancesModule {}
