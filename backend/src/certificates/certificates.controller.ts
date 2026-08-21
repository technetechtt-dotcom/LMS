import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@ApiBearerAuth()
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  async list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    const data = await this.certificates.list(req.user, enrollmentId);
    return { success: true, data };
  }

  @Roles('ADMIN', 'ASSESSOR', 'QA_OFFICER', 'FACILITATOR')
  @Post('issue')
  async issue(
    @Body()
    body: {
      enrollmentId: string;
      title?: string;
      programmeName?: string;
      learnerName?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.certificates.issue(body, req.user);
    return { success: true, data };
  }
}
