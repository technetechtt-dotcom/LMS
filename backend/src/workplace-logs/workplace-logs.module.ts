import { Module } from '@nestjs/common';
import { WorkplaceLogsController } from './workplace-logs.controller';
import { WorkplaceLogsService } from './workplace-logs.service';

@Module({
  controllers: [WorkplaceLogsController],
  providers: [WorkplaceLogsService],
})
export class WorkplaceLogsModule {}
