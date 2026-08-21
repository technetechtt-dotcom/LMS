import { Module } from '@nestjs/common';
import { PoeController } from './poe.controller';
import { PoeService } from './poe.service';
import { PoeWorkflowController } from './poe-workflow.controller';
import { PoeWorkflowService } from './poe-workflow.service';

@Module({
  controllers: [PoeController, PoeWorkflowController],
  providers: [PoeService, PoeWorkflowService],
  exports: [PoeService, PoeWorkflowService],
})
export class PoeModule {}
