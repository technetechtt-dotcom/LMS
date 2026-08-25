import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @ApiBearerAuth()
  @Get()
  async list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    const data = await this.certificates.list(req.user, enrollmentId);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'ASSESSOR', 'QA_OFFICER', 'FACILITATOR')
  @Post('issue')
  async issue(
    @Body() body: { enrollmentId: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.certificates.issue(body, req.user);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'QA_OFFICER')
  @Post(':id/revoke')
  async revoke(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.certificates.revoke(id, body, req.user);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'QA_OFFICER')
  @Post(':id/reissue')
  async reissue(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.certificates.reissue(id, req.user);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.certificates.download(id, req.user);
    return { success: true, data };
  }

  @Public()
  @Get('verify/:code')
  async verify(@Param('code') code: string) {
    const data = await this.certificates.verify(code);
    return { success: true, data };
  }
}
