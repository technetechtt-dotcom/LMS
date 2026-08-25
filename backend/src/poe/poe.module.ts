import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { PoeController } from './poe.controller';
import { PoeService } from './poe.service';
import { PoeWorkflowController } from './poe-workflow.controller';
import { PoeWorkflowService } from './poe-workflow.service';

@Module({
  imports: [EnrollmentsModule],
  controllers: [PoeController, PoeWorkflowController],
  providers: [PoeService, PoeWorkflowService],
  exports: [PoeService, PoeWorkflowService],
})
export class PoeModule {}
