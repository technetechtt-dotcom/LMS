import { Module } from '@nestjs/common';
import { AssessmentInstancesController } from './assessment-instances.controller';
import { AssessmentInstancesService } from './assessment-instances.service';

@Module({
  controllers: [AssessmentInstancesController],
  providers: [AssessmentInstancesService],
  exports: [AssessmentInstancesService],
})
export class AssessmentInstancesModule {}
