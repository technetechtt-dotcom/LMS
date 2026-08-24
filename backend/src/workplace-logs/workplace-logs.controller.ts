import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { CreateWorkplaceLogDto } from './workplace-logs.dto';
import { WorkplaceLogsService } from './workplace-logs.service';

@ApiTags('Workplace Logbook')
@ApiBearerAuth()
@Controller('workplace-logs')
export class WorkplaceLogsController {
  constructor(private readonly logs: WorkplaceLogsService) {}

  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.logs.list(req.user, enrollmentId);
  }

  @Post()
  create(
    @Body() dto: CreateWorkplaceLogDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.logs.create(dto, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR')
  @Post(':id/mentor-verify')
  mentorVerify(
    @Param('id') id: string,
    @Body() body: { decision: 'approve' | 'reject'; feedback?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.logs.mentorVerify(id, body, req.user);
  }
}
