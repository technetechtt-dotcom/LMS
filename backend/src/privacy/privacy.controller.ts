import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { PrismaService } from '../prisma/prisma.service';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

const DSAR_TYPES = [
  'ACCESS',
  'RECTIFICATION',
  'ERASURE',
  'RESTRICTION',
] as const;

@ApiTags('Privacy')
@ApiBearerAuth()
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('dsar')
  list(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    return this.prisma.dataSubjectRequest.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post('dsar')
  create(
    @Body() body: { type: (typeof DSAR_TYPES)[number]; notes?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    return this.prisma.dataSubjectRequest.create({
      data: {
        organisationId,
        subjectUserId: req.user!.userId,
        type: body.type,
        notes: body.notes,
      },
    });
  }
}
