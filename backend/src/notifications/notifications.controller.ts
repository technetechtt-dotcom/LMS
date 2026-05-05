import { Controller, Get, Req, Patch, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import type { AuthUser } from '../common/types/request-with-user';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.listForUser(req.user?.userId);
  }

  @Patch(':id')
  markRead(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(req.user?.userId, id);
  }
}
