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

  @Post('log')
  write(
    @Body()
    body: {
      action: string;
      entity?: string;
      entityType?: string;
      entityId?: string;
      details?: string;
      at?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.audit.writeLog(body, req.user);
  }
}
