import { Module } from '@nestjs/common';
import { AssessmentInstancesModule } from '../assessment-instances/assessment-instances.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [AssessmentInstancesModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
})
export class AssessmentsModule {}
