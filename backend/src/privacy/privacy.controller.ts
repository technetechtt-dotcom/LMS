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
      include: {
        subject: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('dsar')
  create(
    @Body()
    body: {
      type: (typeof DSAR_TYPES)[number];
      notes?: string;
      subjectUserId?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    if (!DSAR_TYPES.includes(body.type)) {
      throw new BadRequestException('Invalid DSAR type');
    }
    const subjectUserId = body.subjectUserId?.trim() || req.user!.userId;
    const dueAt = new Date(Date.now() + 30 * 86_400_000);
    return this.prisma.dataSubjectRequest.create({
      data: {
        organisationId,
        subjectUserId,
        type: body.type,
        notes: body.notes,
        status: 'RECEIVED',
        dueAt,
        statusHistory: [
          {
            status: 'RECEIVED',
            at: new Date().toISOString(),
            by: req.user!.userId,
          },
        ],
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
      assignedToId?: string;
      evidenceDocumentIds?: string[];
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const row = await this.prisma.dataSubjectRequest.findFirst({
      where: { id, organisationId },
    });
    if (!row) throw new BadRequestException('DSAR not found');
    const history = Array.isArray(row.statusHistory)
      ? [...(row.statusHistory as object[])]
      : [];
    history.push({
      status: body.status,
      at: new Date().toISOString(),
      by: req.user!.userId,
      notes: body.notes ?? null,
    });
    return this.prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes ?? row.notes,
        assignedToId: body.assignedToId ?? row.assignedToId,
        evidenceDocumentIds: body.evidenceDocumentIds ?? row.evidenceDocumentIds ?? undefined,
        statusHistory: history as unknown as object,
        retentionUntil: body.retentionUntil
          ? new Date(body.retentionUntil)
          : row.retentionUntil,
        completedAt:
          body.status === 'COMPLETED' || body.status === 'REJECTED'
            ? new Date()
            : row.completedAt,
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
    body: {
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      title: string;
      description: string;
      assignedToId?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const severity = String(body.severity ?? '').toUpperCase();
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      throw new BadRequestException('severity must be LOW, MEDIUM, HIGH, or CRITICAL');
    }
    if (!body.title?.trim() || body.title.trim().length < 3) {
      throw new BadRequestException('title must be at least 3 characters');
    }
    if (!body.description?.trim() || body.description.trim().length < 10) {
      throw new BadRequestException('description must be at least 10 characters');
    }
    const now = new Date().toISOString();
    return this.prisma.incident.create({
      data: {
        organisationId,
        severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        title: body.title.trim(),
        description: body.description.trim(),
        reportedById: req.user?.userId,
        assignedToId: body.assignedToId,
        status: 'OPEN',
        timeline: [
          {
            event: 'REPORTED',
            at: now,
            by: req.user?.userId,
          },
        ],
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

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch('incidents/:id')
  async progressIncident(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      description?: string;
      assignedToId?: string;
      resolutionNotes?: string;
      evidenceDocumentIds?: string[];
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const allowed = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!allowed.includes(body.status)) {
      throw new BadRequestException(`status must be one of ${allowed.join(', ')}`);
    }
    const row = await this.prisma.incident.findFirst({
      where: { id, organisationId },
    });
    if (!row) throw new BadRequestException('Incident not found');
    const timeline = Array.isArray(row.timeline) ? [...(row.timeline as object[])] : [];
    timeline.push({
      event: body.status,
      at: new Date().toISOString(),
      by: req.user?.userId,
      notes: body.resolutionNotes ?? body.description ?? null,
    });
    return this.prisma.incident.update({
      where: { id },
      data: {
        status: body.status,
        description: body.description ?? row.description,
        assignedToId: body.assignedToId ?? row.assignedToId,
        resolutionNotes: body.resolutionNotes ?? row.resolutionNotes,
        evidenceDocumentIds: body.evidenceDocumentIds ?? row.evidenceDocumentIds ?? undefined,
        timeline: timeline as unknown as object,
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(body.status)
          ? new Date()
          : row.resolvedAt,
      },
    });
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('exports')
  listExports(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    return this.prisma.dataExportJob.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('exports/:id/download')
  async downloadExport(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const job = await this.prisma.dataExportJob.findFirst({
      where: { id, organisationId },
    });
    if (!job?.storageKey) throw new BadRequestException('Export not available');
    const downloadUrl = await this.files.getSignedDownloadUrl(job.storageKey);
    return { id: job.id, downloadUrl, storageKey: job.storageKey, status: job.status };
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('retention-enforcement')
  async retentionEnforcement(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = requireOrganisationId(req.user);
    const [policies, purged, pending] = await Promise.all([
      this.prisma.retentionPolicy.findMany({ where: { organisationId } }),
      this.prisma.uploadRecord.count({
        where: { organisationId, status: 'PURGED' },
      }),
      this.prisma.uploadRecord.count({
        where: {
          organisationId,
          status: { not: 'PURGED' },
          retentionUntil: { lte: new Date() },
        },
      }),
    ]);
    return {
      policies,
      purgedUploads: purged,
      pendingDisposal: pending,
      checkedAt: new Date().toISOString(),
    };
  }
}
