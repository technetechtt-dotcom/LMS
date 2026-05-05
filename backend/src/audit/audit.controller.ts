import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Get()
  list(@Query('limit') limit?: number) {
    return this.audit.list(limit);
  }
}
