import { BadRequestException, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Document, UploadRecord } from '@prisma/client';
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveSetaAdapter } from './seta-adapters';
import { NLRD_CERTIFICATION, NLRD_SCHEMA_VERSION } from './nlrd-schema';
import type { StagedUploadFile } from '../common/quarantine-upload';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async listDecisions(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.complianceDecision.findMany({
      where: { organisationId },
      orderBy: { controlKey: 'asc' },
      include: {
        decidedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async recordDecision(
    controlKeyRaw: string,
    body: { status?: string; notes?: string; evidenceDocumentIds?: string[] },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    const controlKey = controlKeyRaw.trim().toLowerCase();
    const allowedControls = new Set([
      'learner-registration',
      'assessment-instruments',
      'moderation-reports',
      'workplace-logbooks',
      'health-safety',
    ]);
    const allowedStatuses = new Set([
      'NOT_REVIEWED',
      'IN_REVIEW',
      'SATISFIED',
      'ACTION_REQUIRED',
    ]);
    const status = body.status?.trim().toUpperCase() ?? 'NOT_REVIEWED';
    if (!allowedControls.has(controlKey)) {
      throw new BadRequestException('Unknown compliance control');
    }
    if (!allowedStatuses.has(status)) {
      throw new BadRequestException('Invalid compliance decision status');
    }
    const evidenceDocumentIds = [...new Set(body.evidenceDocumentIds ?? [])];
    if (status === 'SATISFIED') {
      if (!evidenceDocumentIds.length) {
        throw new BadRequestException('Satisfied controls require verified evidence');
      }
      const verified = await this.prisma.document.count({
        where: {
          id: { in: evidenceDocumentIds },
          organisationId,
          deletedAt: null,
          upload: { status: 'VERIFIED', storageKey: { not: null } },
        },
      });
      if (verified !== evidenceDocumentIds.length) {
        throw new BadRequestException('Every compliance evidence document must have a verified upload');
      }
    }
    return this.prisma.complianceDecision.upsert({
      where: { organisationId_controlKey: { organisationId, controlKey } },
      create: {
        organisationId,
        controlKey,
        status,
        notes: body.notes?.trim() || null,
        evidenceDocumentIds,
        decidedById: user.userId,
      },
      update: {
        status,
        notes: body.notes?.trim() || null,
        evidenceDocumentIds,
        decidedById: user.userId,
        decidedAt: new Date(),
      },
    });
  }

  listAlerts(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.complianceAlert.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  createAlert(
    body: { controlKey?: string; title?: string; details?: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!body.controlKey?.trim() || !body.title?.trim()) {
      throw new BadRequestException('controlKey and title are required');
    }
    return this.prisma.complianceAlert.create({
      data: {
        organisationId,
        controlKey: body.controlKey.trim().toLowerCase(),
        title: body.title.trim(),
        details: body.details?.trim(),
      },
    });
  }

  async acknowledgeAlert(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    const row = await this.prisma.complianceAlert.findFirst({ where: { id, organisationId } });
    if (!row) throw new BadRequestException('Compliance alert not found');
    if (row.status === 'RESOLVED') throw new BadRequestException('Resolved alerts are immutable');
    return this.prisma.complianceAlert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED', acknowledgedById: user.userId, acknowledgedAt: new Date() },
    });
  }

  async resolveAlert(
    id: string,
    body: { notes?: string; evidenceDocumentIds?: string[] },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    const evidenceDocumentIds = [...new Set(body.evidenceDocumentIds ?? [])];
    if (!evidenceDocumentIds.length) {
      throw new BadRequestException('Resolution requires verified evidence');
    }
    const [row, verified] = await Promise.all([
      this.prisma.complianceAlert.findFirst({ where: { id, organisationId } }),
      this.prisma.document.count({
        where: {
          id: { in: evidenceDocumentIds },
          organisationId,
          deletedAt: null,
          upload: { status: 'VERIFIED', storageKey: { not: null } },
        },
      }),
    ]);
    if (!row) throw new BadRequestException('Compliance alert not found');
    if (verified !== evidenceDocumentIds.length) {
      throw new BadRequestException('Resolution evidence must be verified');
    }
    return this.prisma.complianceAlert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedById: user.userId,
        resolvedAt: new Date(),
        resolutionNotes: body.notes?.trim(),
        evidenceDocumentIds,
      },
    });
  }

  private mapComplianceDoc(
    doc: Document & { upload?: UploadRecord | null },
  ): Record<string, unknown> {
    const meta = (doc.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      status:
        (meta.status as string) ??
        (doc.verifiedAt ? 'approved' : 'pending_review'),
      lastUpdated: doc.updatedAt.toISOString(),
      expiryDate: meta.expiryDate as string | undefined,
      fileUrl: doc.url,
      uploadedBy: meta.uploadedBy as string | undefined,
      uploadStatus: doc.upload?.status ?? 'LEGACY_UNTRACKED',
      scanResult: doc.upload?.scanResult ?? (meta.scanResult as string | undefined),
      scannedAt: doc.upload?.scannedAt?.toISOString(),
      verifiedAt: doc.upload?.verifiedAt?.toISOString() ?? doc.verifiedAt?.toISOString(),
      retentionUntil: doc.upload?.retentionUntil?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private mapSetaSubmission(doc: Document): Record<string, unknown> {
    const meta = (doc.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: doc.id,
      type: (meta.type as string) ?? doc.category,
      reference: (meta.reference as string) ?? doc.name,
      dueDate:
        (meta.dueDate as string) ?? doc.createdAt.toISOString().slice(0, 10),
      status: (meta.status as string) ?? 'pending',
      submittedBy: meta.submittedBy as string | undefined,
      submittedAt: meta.submittedAt as string | undefined,
      setaResponse: meta.setaResponse as string | undefined,
      fileUrl: doc.url,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async listDocuments(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const docs = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        organisationId,
        category: { startsWith: 'compliance' },
      },
      include: { upload: true },
      orderBy: { updatedAt: 'desc' },
    });
    return docs.map((d) => this.mapComplianceDoc(d));
  }

  private mapSchedule(row: {
    id: string;
    kind: string;
    type: string;
    reference: string | null;
    scheduledFor: Date;
    status: string;
    notes: string | null;
    conductor: string | null;
    reminderSentAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Record<string, unknown> {
    const now = new Date();
    const liveStatus =
      row.status === 'SCHEDULED' && row.scheduledFor < now ? 'OVERDUE' : row.status;
    const uiStatus =
      liveStatus === 'COMPLETED'
        ? 'completed'
        : liveStatus === 'CANCELLED'
          ? 'cancelled'
          : liveStatus === 'OVERDUE'
            ? 'overdue'
            : row.kind === 'AUDIT'
              ? 'scheduled'
              : 'upcoming';
    return {
      id: row.id,
      kind: row.kind,
      type: row.type,
      reference: row.reference ?? `${row.kind}-${row.id.slice(0, 8)}`,
      dueDate: row.scheduledFor.toISOString().slice(0, 10),
      scheduledFor: row.scheduledFor.toISOString(),
      status: uiStatus,
      lifecycleStatus: liveStatus,
      submittedBy: row.conductor ?? undefined,
      submittedAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      reminderSentAt: row.reminderSentAt?.toISOString(),
      setaResponse: row.notes ?? (row.kind === 'AUDIT' ? 'Audit scheduled' : 'Pending submission'),
      fileUrl: undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listSetaSubmissions(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const [docs, gateway, schedules] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          organisationId,
          category: 'seta-submission',
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.setaGatewaySubmission.findMany({
        where: { organisationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.complianceSchedule.findMany({
        where: { organisationId },
        orderBy: { scheduledFor: 'asc' },
      }),
    ]);
    await this.reconcileScheduleLifecycle(schedules);
    const fromDocs = docs.map((d) => this.mapSetaSubmission(d));
    const fromGateway = gateway.map((g) => ({
      id: g.id,
      type: 'gateway',
      reference: g.batchId,
      dueDate: (g.submittedAt ?? g.createdAt).toISOString().slice(0, 10),
      status: g.status,
      submittedBy: g.adapter,
      submittedAt: g.submittedAt?.toISOString(),
      setaResponse: g.responseBody ?? g.externalReference ?? undefined,
      fileUrl: undefined,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.createdAt.toISOString(),
    }));
    return [...schedules.map((row) => this.mapSchedule(row)), ...fromGateway, ...fromDocs];
  }

  private async reconcileScheduleLifecycle(
    rows: Array<{
      id: string;
      kind: string;
      type: string;
      reference: string | null;
      status: string;
      scheduledFor: Date;
      reminderSentAt: Date | null;
      createdById: string;
      organisationId?: string;
    }>,
  ) {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 86_400_000);
    for (const row of rows) {
      if (row.status === 'SCHEDULED' && row.scheduledFor < now) {
        await this.prisma.complianceSchedule.update({
          where: { id: row.id },
          data: { status: 'OVERDUE' },
        });
        row.status = 'OVERDUE';
      } else if (
        (row.status === 'SCHEDULED' || row.status === 'OVERDUE') &&
        !row.reminderSentAt &&
        row.scheduledFor <= soon
      ) {
        const sent = await this.sendScheduleReminder(row);
        if (!sent) continue;
        await this.prisma.complianceSchedule.update({
          where: { id: row.id },
          data: { status: row.status === 'OVERDUE' ? 'OVERDUE' : 'REMINDED', reminderSentAt: now },
        });
        if (row.status === 'SCHEDULED') row.status = 'REMINDED';
        row.reminderSentAt = now;
      }
    }
  }

  private async sendScheduleReminder(row: {
    id: string;
    kind: string;
    type: string;
    reference: string | null;
    scheduledFor: Date;
    createdById: string;
  }): Promise<boolean> {
    if (!this.notifications) return false;
    const schedule = await this.prisma.complianceSchedule.findUnique({
      where: { id: row.id },
      select: { organisationId: true },
    });
    if (!schedule) return false;
    const staff = await this.prisma.userOrganisation.findMany({
      where: {
        organisationId: schedule.organisationId,
        deletedAt: null,
        role: { code: { in: ['ADMIN', 'QA_OFFICER', 'FACILITATOR'] } },
      },
      select: { userId: true },
    });
    const recipients = new Set(staff.map((item) => item.userId));
    recipients.add(row.createdById);
    const due = row.scheduledFor.toISOString().slice(0, 10);
    const title = `Compliance ${row.kind.toLowerCase()} reminder`;
    const body = `${row.type} (${row.reference ?? row.id.slice(0, 8)}) is due ${due}.`;
    await Promise.all(
      [...recipients].map((userId) =>
        this.notifications!.notify(userId, 'compliance', title, body, {
          scheduleId: row.id,
          kind: row.kind,
        }),
      ),
    );
    return true;
  }

  async scheduleSubmission(
    body: {
      type: string;
      reference: string;
      dueDate: string;
      notes?: string;
    },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    if (!body.type || !body.dueDate) {
      throw new BadRequestException('Submission type and due date are required');
    }
    const scheduledFor = new Date(body.dueDate);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('dueDate must be a valid date');
    }
    const row = await this.prisma.complianceSchedule.create({
      data: {
        organisationId,
        kind: 'SUBMISSION',
        type: body.type.trim(),
        reference: body.reference?.trim() || `SETA-SUB-${Date.now()}`,
        scheduledFor,
        notes: body.notes?.trim() || undefined,
        conductor: user.email,
        createdById: user.userId,
      },
    });
    return this.mapSchedule(row);
  }

  async scheduleAudit(
    body: {
      type: string;
      reference: string;
      auditDate: string;
      conductor?: string;
      notes?: string;
    },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    if (!body.type || !body.auditDate) {
      throw new BadRequestException('Audit type and date are required');
    }
    const scheduledFor = new Date(body.auditDate);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('auditDate must be a valid date');
    }
    const row = await this.prisma.complianceSchedule.create({
      data: {
        organisationId,
        kind: 'AUDIT',
        type: body.type.trim(),
        reference: body.reference?.trim() || `AUDIT-${Date.now()}`,
        scheduledFor,
        notes: body.notes?.trim() || undefined,
        conductor: body.conductor?.trim() || user.email,
        createdById: user.userId,
      },
    });
    return this.mapSchedule(row);
  }

  async transitionSchedule(
    id: string,
    body: { status?: 'COMPLETED' | 'CANCELLED'; scheduledFor?: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.complianceSchedule.findFirst({
      where: { id, organisationId },
    });
    if (!row) throw new BadRequestException('Compliance schedule not found');
    if (body.scheduledFor) {
      if (row.status === 'COMPLETED' || row.status === 'CANCELLED') {
        throw new BadRequestException('Closed schedules cannot be rescheduled');
      }
      const scheduledFor = new Date(body.scheduledFor);
      if (Number.isNaN(scheduledFor.getTime())) {
        throw new BadRequestException('scheduledFor must be a valid date');
      }
      const updated = await this.prisma.complianceSchedule.update({
        where: { id },
        data: {
          scheduledFor,
          status: 'SCHEDULED',
          reminderSentAt: null,
          completedAt: null,
          cancelledAt: null,
        },
      });
      return this.mapSchedule(updated);
    }
    if (body.status !== 'COMPLETED' && body.status !== 'CANCELLED') {
      throw new BadRequestException('status must be COMPLETED or CANCELLED');
    }
    if (row.status === 'COMPLETED' || row.status === 'CANCELLED') {
      throw new BadRequestException('Schedule is already closed');
    }
    const updated = await this.prisma.complianceSchedule.update({
      where: { id },
      data: {
        status: body.status,
        completedAt: body.status === 'COMPLETED' ? new Date() : row.completedAt,
        cancelledAt: body.status === 'CANCELLED' ? new Date() : row.cancelledAt,
      },
    });
    return this.mapSchedule(updated);
  }

  async uploadDocument(
    file: StagedUploadFile | undefined,
    metadata: Record<string, unknown>,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!file) throw new BadRequestException('A compliance evidence file is required');
    const stored = await this.files.uploadStaged(file, {
      prefix: 'compliance',
      organisationId,
      uploadedById: user?.userId,
    });
    let doc;
    try {
      doc = await this.prisma.document.create({
        data: {
          organisationId,
          category: (metadata.category as string) ?? 'compliance',
          uploadId: stored.uploadId,
          name: (metadata.name as string) ?? file.originalname,
          storageKey: stored.key,
          url: stored.url,
          metadata: {
            ...metadata,
            checksum: stored.sha256,
            uploaderId: user?.userId,
            scanResult: stored.status,
            status: metadata.status ?? 'pending_review',
          },
        },
        include: { upload: true },
      });
    } catch (error) {
      await this.files.rollbackUpload?.(stored.uploadId);
      throw error;
    }
    return this.mapComplianceDoc(doc);
  }

  async generateNlrd(user?: AuthUser, programmeId?: string) {
    const organisationId = requireOrganisationId(user);
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        deletedAt: null,
        ...(programmeId ? { programmeId } : {}),
        OR: [
          { sdioOrganisationId: organisationId },
          { programme: { organisationId } },
        ],
      },
      include: {
        learner: true,
        programme: { include: { qualification: true } },
      },
      take: 2000,
    });

    const errors: string[] = [];
    const rowsXml: string[] = [];
    for (const e of enrollments) {
      const meta = (e.metadata as Record<string, unknown> | null) ?? {};
      const idNumber = String(meta.idNumber ?? '').trim();
      if (!idNumber || idNumber === '—') {
        errors.push(`Enrollment ${e.id}: missing idNumber`);
      }
      const q = e.programme.qualification;
      rowsXml.push(
        [
          '<LearnerRecord>',
          `<EnrollmentId>${e.id}</EnrollmentId>`,
          `<NationalId>${this.xmlEscape(idNumber)}</NationalId>`,
          `<FirstName>${this.xmlEscape(e.learner.firstName)}</FirstName>`,
          `<Surname>${this.xmlEscape(e.learner.lastName)}</Surname>`,
          `<Email>${this.xmlEscape(e.learner.email)}</Email>`,
          `<ProgrammeCode>${this.xmlEscape(e.programme.code)}</ProgrammeCode>`,
          `<QualificationSaqaId>${this.xmlEscape(q?.saqaId ?? '')}</QualificationSaqaId>`,
          `<NQFLevel>${q?.nqfLevel ?? ''}</NQFLevel>`,
          `<Status>${e.status}</Status>`,
          `<StartedAt>${(e.startedAt ?? e.createdAt).toISOString()}</StartedAt>`,
          '</LearnerRecord>',
        ].join(''),
      );
    }

    const batchId = `NLRD-${Date.now()}`;
    const generatedAt = new Date().toISOString();
    const renderXml = () =>
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<NLRDExport xmlns="urn:saqa:nlrd:internal-export:v1" schemaVersion="${NLRD_SCHEMA_VERSION}" certification="${NLRD_CERTIFICATION}" batchId="${batchId}" organisationId="${organisationId}" generatedAt="${generatedAt}">`,
        `<Validation valid="${errors.length === 0}" errorCount="${errors.length}"/>`,
        ...errors.map((err) => `<Error>${this.xmlEscape(err)}</Error>`),
        '<Learners>',
        ...rowsXml,
        '</Learners>',
        '</NLRDExport>',
      ].join('');
    let xml = renderXml();

    const adapter = resolveSetaAdapter();
    const schemaCheck = adapter.validateXml(xml);
    if (!schemaCheck.valid) {
      errors.push(...schemaCheck.errors.map((e) => `Schema: ${e}`));
      xml = renderXml();
    }

    const stored = await this.files.upload(
      `${batchId}.xml`,
      Buffer.from(xml, 'utf8'),
      'application/xml',
      { prefix: 'exports/nlrd', organisationId },
    );

    try {
      await this.prisma.document.create({
        data: {
        organisationId,
        category: 'seta-submission',
        name: `NLRD ${batchId}`,
        storageKey: stored.key,
        url: this.files.storageLocator(stored.key, stored.bucket),
        metadata: {
          type: 'nlrd',
          schemaVersion: NLRD_SCHEMA_VERSION,
          certification: NLRD_CERTIFICATION,
          adapter: adapter.id,
          reference: batchId,
          status: errors.length ? 'invalid' : 'generated',
          submissionStatus: 'generated_not_accepted',
          submittedAt: new Date().toISOString(),
          errorCount: errors.length,
          },
        },
      });
    } catch (error) {
      await this.files.rollbackUpload?.(stored.uploadId);
      throw error;
    }

    return {
      batchId,
      schemaVersion: NLRD_SCHEMA_VERSION,
      certification: NLRD_CERTIFICATION,
      adapter: adapter.id,
      valid: errors.length === 0,
      errors,
      recordCount: enrollments.length,
      storageKey: stored.key,
      gateway:
        errors.length === 0
          ? await this.submitToGateway(
              organisationId,
              batchId,
              adapter.id,
              xml,
              'application/xml',
            )
          : {
              status: 'validation_failed',
              gatewayUrl: null as string | null,
              message:
                'Export validation failed; the file was stored locally and was not submitted.',
            },
      receipt: adapter.reconcile(batchId, 'generated'),
    };
  }

  async exportSeta(user?: AuthUser, setaId?: string, format = 'xml') {
    const organisationId = requireOrganisationId(user);
    const snapshot = await this.prisma.enrollment.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        OR: [
          { sdioOrganisationId: organisationId },
          { programme: { organisationId } },
        ],
      },
      _count: { _all: true },
    });
    const docs = await this.prisma.document.count({
      where: { deletedAt: null, organisationId, category: { startsWith: 'compliance' } },
    });
    const batchId = `SETA-${setaId ?? 'default'}-${Date.now()}`;
    const payload = {
      setaId: setaId ?? 'default',
      organisationId,
      generatedAt: new Date().toISOString(),
      enrollmentByStatus: Object.fromEntries(
        snapshot.map((s) => [s.status, s._count._all]),
      ),
      complianceDocumentCount: docs,
    };

    let body: string;
    if (format === 'json') {
      body = JSON.stringify(payload, null, 2);
    } else {
      body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<SETAExport id="${batchId}">`,
        `<OrganisationId>${organisationId}</OrganisationId>`,
        `<GeneratedAt>${payload.generatedAt}</GeneratedAt>`,
        ...snapshot.map(
          (s) =>
            `<StatusCount code="${s.status}" count="${s._count._all}"/>`,
        ),
        `<ComplianceDocuments count="${docs}"/>`,
        '</SETAExport>',
      ].join('');
    }

    const adapter = resolveSetaAdapter(setaId);
    const packaged = adapter.buildExport(format === 'json' ? payload : body);
    const extension = format === 'json' ? 'json' : 'xml';
    const stored = await this.files.upload(
      `${batchId}.${extension}`,
      Buffer.from(packaged.body, 'utf8'),
      packaged.contentType,
      { prefix: 'exports/seta', organisationId },
    );

    try {
      await this.prisma.document.create({
        data: {
        organisationId,
        category: 'seta-submission',
        name: `SETA export ${batchId}`,
        storageKey: stored.key,
        url: this.files.storageLocator(stored.key, stored.bucket),
        metadata: {
          type: 'seta-export',
          adapter: adapter.id,
          schemaVersion: packaged.schemaVersion,
          certification: packaged.certification,
          reference: batchId,
          status: 'generated',
          contentType: packaged.contentType,
          submittedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      await this.files.rollbackUpload?.(stored.uploadId);
      throw error;
    }

    return {
      batchId,
      adapter: adapter.id,
      format: format === 'json' ? 'json' : 'xml',
      contentType: packaged.contentType,
      body: packaged.body,
      url: await this.files.getSignedDownloadUrl(stored.key),
      gateway: await this.submitToGateway(
        organisationId,
        batchId,
        adapter.id,
        packaged.body,
        packaged.contentType,
      ),
      receipt: adapter.reconcile(batchId, 'generated'),
    };
  }

  private async submitToGateway(
    organisationId: string,
    batchId: string,
    adapter: string,
    body: string,
    contentType: string,
  ) {
    const configuredGatewayUrl = this.config.get<string>('SETA_GATEWAY_URL')?.trim();
    const adapterIsCertified = adapter !== 'generic-internal';
    const gatewayUrl = adapterIsCertified ? configuredGatewayUrl : undefined;
    const row = await this.prisma.setaGatewaySubmission.create({
      data: {
        organisationId,
        batchId,
        adapter,
        status: gatewayUrl ? 'submitting' : 'generated_not_submitted',
        gatewayUrl: gatewayUrl || null,
      },
    });
    if (!gatewayUrl) {
      return {
        id: row.id,
        status: 'generated_not_submitted',
        gatewayUrl: null as string | null,
        message: adapterIsCertified
          ? 'SETA_GATEWAY_URL is not configured; export stored pending regulator submission'
          : 'Internal adapter is not certified; external regulator submission was blocked',
      };
    }
    try {
      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'X-Organisation-Id': organisationId,
          'X-Batch-Id': batchId,
        },
        body,
      });
      const responseBody = (await res.text()).slice(0, 8000);
      const status = res.ok ? 'submitted' : 'rejected';
      const updated = await this.prisma.setaGatewaySubmission.update({
        where: { id: row.id },
        data: {
          status,
          responseBody,
          submittedAt: new Date(),
          externalReference: res.headers.get('x-reference') ?? undefined,
        },
      });
      return {
        id: updated.id,
        status: updated.status,
        gatewayUrl,
        externalReference: updated.externalReference,
      };
    } catch (err) {
      await this.prisma.setaGatewaySubmission.update({
        where: { id: row.id },
        data: {
          status: 'failed',
          responseBody: String(err instanceof Error ? err.message : err).slice(
            0,
            8000,
          ),
        },
      });
      throw new ServiceUnavailableException(
        'SETA/NLRD gateway is unreachable. The export was stored; retry once the regulator endpoint is available.',
      );
    }
  }

  private xmlEscape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
