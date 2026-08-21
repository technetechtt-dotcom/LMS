import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles('ADMIN', 'SETA', 'QA_OFFICER', 'FACILITATOR')
  @Get('progress')
  progress(@Req() req: Request & { user?: AuthUser }) {
    return this.reports.learnershipProgress(req.user);
  }

  @Roles('ADMIN', 'SETA', 'ASSESSOR', 'MODERATOR')
  @Get('poe/:enrollmentId')
  poe(
    @Param('enrollmentId') enrollmentId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.reports.learnerPoe(enrollmentId, req.user);
  }

  @Roles('ADMIN', 'SETA', 'FACILITATOR', 'QA_OFFICER')
  @Get('seta-snapshot')
  setaSnapshot(@Req() req: Request & { user?: AuthUser }) {
    return this.reports.setaSnapshot(req.user);
  }
}
