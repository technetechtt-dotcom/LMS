import { Module } from '@nestjs/common';
import { WorkplaceLogsController } from './workplace-logs.controller';
import { WorkplaceLogsService } from './workplace-logs.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WorkplaceLogsController],
  providers: [WorkplaceLogsService],
  exports: [WorkplaceLogsService],
})
export class WorkplaceLogsModule {}
