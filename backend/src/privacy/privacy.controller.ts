import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { PrismaService } from '../prisma/prisma.service';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { FileStorageService } from '../common/file-storage.service';
import { ConfigService } from '@nestjs/config';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly config: ConfigService,
  ) {}

  private policyVersion() {
    return this.config.get<string>('POPIA_POLICY_VERSION')?.trim() || '2026-09-11';
  }

  @Get('notice')
  async notice(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    const policyVersion = this.policyVersion();
    const acknowledgement = await this.prisma.popiaAcknowledgement.findUnique({
      where: {
        userId_organisationId_policyVersion: {
          userId: req.user!.userId,
          organisationId,
          policyVersion,
        },
      },
      select: { acknowledgedAt: true },
    });
    return {
      policyVersion,
      acknowledged: Boolean(acknowledgement),
      acknowledgedAt: acknowledgement?.acknowledgedAt?.toISOString(),
    };
  }

  @Post('notice/acknowledge')
  acknowledgeNotice(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    const policyVersion = this.policyVersion();
    return this.prisma.popiaAcknowledgement.upsert({
      where: {
        userId_organisationId_policyVersion: {
          userId: req.user!.userId,
          organisationId,
          policyVersion,
        },
      },
      create: {
        userId: req.user!.userId,
        organisationId,
        policyVersion,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      },
      update: {},
      select: { policyVersion: true, acknowledgedAt: true },
    });
  }

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

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('dsar')
  create(
    @Body() body: { type: (typeof DSAR_TYPES)[number]; notes?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    if (!DSAR_TYPES.includes(body.type)) {
      throw new BadRequestException('Invalid DSAR type');
    }
    return this.prisma.dataSubjectRequest.create({
      data: {
        organisationId,
        subjectUserId: req.user!.userId,
        type: body.type,
        notes: body.notes,
        status: 'RECEIVED',
      },
    });
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch('dsar/:id')
  async progress(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
      notes?: string;
      retentionUntil?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const row = await this.prisma.dataSubjectRequest.findFirst({
      where: { id, organisationId },
    });
    if (!row) throw new BadRequestException('DSAR not found');
    return this.prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes ?? row.notes,
        retentionUntil: body.retentionUntil
          ? new Date(body.retentionUntil)
          : row.retentionUntil,
        completedAt:
          body.status === 'COMPLETED' ? new Date() : row.completedAt,
      },
    });
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('export')
  async requestExport(
    @Body() body: { subjectUserId: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const subject = await this.prisma.user.findFirst({
      where: {
        id: body.subjectUserId,
        deletedAt: null,
        memberships: { some: { organisationId, deletedAt: null } },
      },
      include: {
        enrollments: { where: { deletedAt: null }, take: 50 },
      },
    });
    if (!subject) throw new BadRequestException('Subject not in organisation');

    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        user: {
          id: subject.id,
          email: subject.email,
          firstName: subject.firstName,
          lastName: subject.lastName,
        },
        enrollments: subject.enrollments,
      },
      null,
      2,
    );
    const stored = await this.files.upload(
      `dsar-${subject.id}.json`,
      Buffer.from(payload, 'utf8'),
      'application/json',
      { prefix: 'exports/portability', organisationId },
    );
    try {
      return await this.prisma.dataExportJob.create({
        data: {
          organisationId,
          subjectUserId: subject.id,
          requestedById: req.user!.userId,
          status: 'COMPLETED',
          storageKey: stored.key,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.files.rollbackUpload?.(stored.uploadId);
      throw error;
    }
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('retention-policies')
  listRetention(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    return this.prisma.retentionPolicy.findMany({ where: { organisationId } });
  }

  @Roles('ADMIN')
  @Post('retention-policies')
  upsertRetention(
    @Body()
    body: {
      entityType: string;
      retainDays: number;
      disposalMethod?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const entityType = body.entityType?.trim().toUpperCase();
    if (!['UPLOAD', 'GENERATED_REPORT'].includes(entityType)) {
      throw new BadRequestException('entityType must be UPLOAD or GENERATED_REPORT');
    }
    if (!Number.isInteger(body.retainDays) || body.retainDays < 1) {
      throw new BadRequestException('retainDays must be a positive integer');
    }
    if ((body.disposalMethod ?? 'SOFT_DELETE') !== 'SOFT_DELETE') {
      throw new BadRequestException('Only SOFT_DELETE disposal is supported');
    }
    return this.prisma.retentionPolicy.upsert({
      where: {
        organisationId_entityType: {
          organisationId,
          entityType,
        },
      },
      create: {
        organisationId,
        entityType,
        retainDays: body.retainDays,
        disposalMethod: body.disposalMethod ?? 'SOFT_DELETE',
      },
      update: {
        retainDays: body.retainDays,
        disposalMethod: body.disposalMethod ?? 'SOFT_DELETE',
      },
    });
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('incidents')
  reportIncident(
    @Body()
    body: { severity: string; title: string; description: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    return this.prisma.incident.create({
      data: {
        organisationId,
        severity: body.severity,
        title: body.title,
        description: body.description,
        reportedById: req.user?.userId,
        status: 'OPEN',
      },
    });
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('incidents')
  listIncidents(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    return this.prisma.incident.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
