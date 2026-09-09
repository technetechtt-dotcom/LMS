import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { DirectoryQueryDto } from './directory.dto';
import { DirectoryService } from './directory.service';

@ApiTags('Directory')
@ApiBearerAuth()
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get('staff')
  staff(@Query() query: DirectoryQueryDto, @Req() req: Request & { user?: AuthUser }) {
    return this.directory.staff(req.user, query);
  }

  @Get('message-recipients')
  recipients(@Query() query: DirectoryQueryDto, @Req() req: Request & { user?: AuthUser }) {
    return this.directory.messageRecipients(req.user, query);
  }

  @Get('mentors')
  mentors(@Query() query: DirectoryQueryDto, @Req() req: Request & { user?: AuthUser }) {
    return this.directory.mentors(req.user, query);
  }
}
