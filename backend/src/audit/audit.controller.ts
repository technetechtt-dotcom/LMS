import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('limit') limit?: number,
  ) {
    return this.audit.list(limit, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Get('findings')
  findings(@Req() req: Request & { user?: AuthUser }) {
    return this.audit.listFindings(req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Post('findings')
  createFinding(
    @Body() body: {
      scopeType?: string;
      scopeId?: string;
      finding?: string;
      severity?: string;
      evidenceDocumentIds?: string[];
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.audit.createFinding(body, req.user);
  }
}
