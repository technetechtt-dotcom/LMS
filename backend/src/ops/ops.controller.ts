import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { OpsService } from './ops.service';

@ApiTags('Ops')
@ApiBearerAuth()
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Roles('PLATFORM_ADMIN')
  @Get('overview')
  overview(@Req() req: Request & { user?: AuthUser }) {
    return this.ops.overview(req.user);
  }

  @Roles('PLATFORM_ADMIN')
  @Get('invitations')
  listInvitations(@Req() req: Request & { user?: AuthUser }) {
    return this.ops.listInvitations(req.user);
  }
}
