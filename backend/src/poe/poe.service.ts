import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Document, PoeLearningArtifact } from '@prisma/client';
import PDFDocument = require('pdfkit');
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentActorWhere,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import type { StagedUploadFile } from '../common/quarantine-upload';

type EnrollmentCtx = {
  id: string;
  learnerId: string;
  learnerName: string;
  organisationId: string | null;
  programmeTitle: string;
  lifecycleStatus: string;
};

@Injectable()
export class PoeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
  ) {}

  private async enrollmentCtx(
    enrollmentId: string,
    user?: AuthUser,
  ): Promise<EnrollmentCtx> {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
        ...enrollmentActorWhere(user),
      },
      include: { learner: true, programme: true },
    });
    if (!row) throw new NotFoundException('Learner enrolment not found');
    assertEnrollmentAccess(user, row, 'PoE');
    return {
      id: row.id,
      learnerId: row.learnerId,
      learnerName: `${row.learner.firstName} ${row.learner.lastName}`.trim(),
      organisationId: row.sdioOrganisationId,
      programmeTitle: row.programme.title,
      lifecycleStatus: row.status,
    };
  }

  private mapDocument(
    doc: Document,
    ctx: EnrollmentCtx,
  ): Record<string, unknown> {
    const meta = (doc.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: doc.id,
      learnerId: ctx.id,
      learnerName: ctx.learnerName,
      type: (meta.type as string) ?? doc.category,
      category: doc.category,
      fileName: doc.name,
      fileUrl: doc.url,
      fileSize: (meta.fileSize as string) ?? '0 MB',
      mimeType: (meta.mimeType as string) ?? 'application/pdf',
      status: doc.verifiedAt ? 'verified' : ((meta.status as string) ?? 'submitted'),
      version: (meta.version as number) ?? 1,
      versionHistory: (meta.versionHistory as unknown[]) ?? [],
      verifiedBy: doc.verifiedById ?? undefined,
      verifiedAt: doc.verifiedAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async listDocuments(enrollmentId: string, user?: AuthUser) {
    const ctx = await this.enrollmentCtx(enrollmentId, user);
    const docs = await this.prisma.document.findMany({
      where: { enrollmentId: ctx.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.mapDocument(d, ctx));
  }

  async uploadDocument(
    enrollmentId: string,
    file: StagedUploadFile | undefined,
    metadata: Record<string, unknown>,
    user?: AuthUser,
  ) {
    const ctx = await this.enrollmentCtx(enrollmentId, user);
    const uploadedById = user?.userId;
    if (!uploadedById) throw new ForbiddenException('Authentication required');

    if (isLearnerOnly(user) && ctx.learnerId !== uploadedById) {
      throw new ForbiddenException('Learners may only upload to their own PoE');
    }

    const organisationId = requireOrganisationId(user);
    if (!file) throw new BadRequestException('A real evidence file is required');
    const artifactId = typeof metadata.artifactId === 'string' ? metadata.artifactId : undefined;
    const artifact = artifactId
      ? await this.prisma.poeLearningArtifact.findFirst({
          where: { id: artifactId, enrollmentId: ctx.id, deletedAt: null },
          select: { id: true },
        })
      : null;
    if (artifactId && !artifact) {
      await this.files.discardStaged(file);
      throw new BadRequestException('artifactId must identify a PoE artifact for this enrollment');
    }
    const stored = await this.files.uploadStaged(file, {
      prefix: 'poe',
      organisationId,
      uploadedById,
    });
    const now = new Date().toISOString();
    let doc;
    try {
      doc = await this.prisma.$transaction(async (tx) => {
      const upload = await tx.uploadRecord.findUnique({
        where: { id: stored.uploadId },
        select: { retentionUntil: true },
      });
      const created = await tx.document.create({
        data: {
          enrollmentId: ctx.id,
          organisationId,
          uploadId: stored.uploadId,
          category: (metadata.category as string) ?? 'General',
          name: file.originalname,
          storageKey: stored.key,
          url: stored.url,
          metadata: {
            ...metadata,
            type: metadata.type ?? metadata.category ?? 'Evidence',
            mimeType: stored.mimeType,
            fileSize: `${(stored.size / 1024 / 1024).toFixed(1)} MB`,
            checksum: stored.sha256,
            scanResult: stored.status,
            retentionUntil: upload?.retentionUntil?.toISOString(),
            status: 'submitted',
            version: 1,
            versionHistory: [{
              version: 1,
              fileUrl: stored.url,
              fileName: file.originalname,
              uploadedAt: now,
              uploadedBy: uploadedById,
              checksum: stored.sha256,
            }],
          },
        },
      });
      if (artifact) {
        await tx.poeArtifactUpload.create({
          data: { artifactId: artifact.id, uploadId: stored.uploadId, linkedById: uploadedById },
        });
        await tx.poeLearningArtifact.update({
          where: { id: artifact.id },
          data: { storageKey: stored.key, url: stored.url },
        });
      }
        return created;
      });
    } catch (error) {
      await this.files.rollbackUpload?.(stored.uploadId);
      throw error;
    }
    return this.mapDocument(doc, ctx);
  }

  async verifyDocument(documentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const verifierId = user?.userId;
    if (!verifierId) throw new ForbiddenException('Authentication required');

    const doc = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        OR: [
          {
            organisationId,
            ...(docEnrollmentScope(user)),
          },
          {
            enrollment: {
              deletedAt: null,
              ...enrollmentOrgWhere(organisationId),
              ...enrollmentActorWhere(user),
            },
          },
        ],
      },
      include: { enrollment: { select: { learnerId: true } } },
    });
    if (!doc) throw new NotFoundException('POE document not found');

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verifiedById: verifierId,
        verifiedAt: new Date(),
        organisationId: doc.organisationId ?? organisationId,
      },
    });
    return {
      id: updated.id,
      status: 'verified',
      verifiedBy: verifierId,
      verifiedAt: updated.verifiedAt?.toISOString(),
    };
  }

  async exportPoe(enrollmentId: string, user?: AuthUser) {
    const ctx = await this.enrollmentCtx(enrollmentId, user);
    const pdf = await this.buildPoePdf(ctx);
    const stored = await this.files.upload(
      `poe-${ctx.id}.pdf`,
      pdf,
      'application/pdf',
      { prefix: 'exports/poe', organisationId: ctx.organisationId ?? undefined },
    );
    return {
      url: `/learners/${encodeURIComponent(ctx.id)}/poe-export`,
      storageKey: stored.key,
      fileUrl: stored.url,
      filename: `poe-${ctx.learnerName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
    };
  }

  async exportPdf(enrollmentId: string, user?: AuthUser) {
    const ctx = await this.enrollmentCtx(enrollmentId, user);
    const buffer = await this.buildPoePdf(ctx);
    const filename = `poe-${ctx.learnerName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    return { buffer, filename };
  }

  async assertCanExport(enrollmentId: string, user?: AuthUser) {
    await this.enrollmentCtx(enrollmentId, user);
  }

  private async buildPoePdf(ctx: EnrollmentCtx): Promise<Buffer> {
    const [artifacts, documents, submissions, evidence, workflow, audit] =
      await Promise.all([
        this.prisma.poeLearningArtifact.findMany({
          where: { enrollmentId: ctx.id, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            facilitatorMarkedBy: { select: { firstName: true, lastName: true } },
            assessor: { select: { firstName: true, lastName: true } },
            moderator: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.document.findMany({
          where: { enrollmentId: ctx.id, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 80,
        }),
        this.prisma.assessmentSubmission.findMany({
          where: { enrollmentId: ctx.id },
          include: {
            assessment: {
              include: { unitStandard: { select: { title: true, code: true } } },
            },
            instrument: { select: { title: true, passMark: true } },
          },
          orderBy: { submittedAt: 'asc' },
        }),
        this.prisma.evidence.findMany({
          where: { enrollmentId: ctx.id, deletedAt: null },
          include: {
            uploadedBy: { select: { firstName: true, lastName: true } },
            unitStandard: { select: { title: true, code: true } },
          },
          orderBy: { uploadedAt: 'asc' },
        }),
        this.prisma.enrollmentWorkflow.findMany({
          where: { enrollmentId: ctx.id },
          orderBy: { changedAt: 'asc' },
        }),
        this.prisma.auditLog.findMany({
          where: {
            organisationId: ctx.organisationId ?? undefined,
            OR: [
              { entityId: ctx.id },
              { entityId: ctx.learnerId },
              { entityType: { contains: ctx.id } },
            ],
          },
          include: { actor: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 40,
        }),
      ]);
    const assessmentIds = [...new Set(submissions.map((row) => row.assessmentId))];
    const moderation = assessmentIds.length
      ? await this.prisma.moderation.findMany({
          where: { assessmentId: { in: assessmentIds }, deletedAt: null },
          orderBy: [{ assessmentId: 'asc' }, { round: 'asc' }],
        })
      : [];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      const nameOf = (person?: { firstName: string; lastName: string } | null) =>
        person ? `${person.firstName} ${person.lastName}`.trim() : 'Unrecorded';
      const section = (title: string) => {
        if (doc.y > 720) doc.addPage();
        doc.moveDown(0.6).fontSize(14).text(title);
        doc.moveDown(0.2).fontSize(10);
      };

      doc.fontSize(20).text('Official Portfolio of Evidence');
      doc.moveDown(0.4);
      doc.fontSize(12).text(`Learner: ${ctx.learnerName}`);
      doc.text(`Programme: ${ctx.programmeTitle}`);
      doc.text(`Enrollment: ${ctx.id}`);
      doc.text(`Lifecycle status: ${ctx.lifecycleStatus}`);
      doc.text(`Generated: ${new Date().toISOString()}`);

      section('Assessment results');
      if (!submissions.length) doc.text('No assessment results recorded.');
      for (const row of submissions) {
        const title =
          row.instrument?.title ||
          row.assessment.unitStandard.title ||
          row.assessment.unitStandard.code ||
          'Assessment';
        doc.text(
          `• ${title} — attempt ${row.attemptNumber}, ${row.status}, score ${row.percentage ?? row.score ?? 'n/a'}${row.instrument?.passMark != null ? ` (pass ${row.instrument.passMark}%)` : ''}`,
        );
        if (row.feedback) doc.text(`  Feedback: ${row.feedback}`);
      }

      section('Moderation');
      if (!moderation.length) doc.text('No moderation rounds recorded.');
      for (const row of moderation) {
        doc.text(
          `• Assessment ${row.assessmentId.slice(0, 8)} round ${row.round}: ${row.decision}${row.moderatedAt ? ` at ${row.moderatedAt.toISOString()}` : ''}`,
        );
        if (row.feedback) doc.text(`  Feedback: ${row.feedback}`);
      }

      section('Evidence files');
      if (!evidence.length) doc.text('No evidence files recorded.');
      for (const row of evidence) {
        const unit = row.unitStandard
          ? `${row.unitStandard.code ?? ''} ${row.unitStandard.title}`.trim()
          : 'Unit standard';
        doc.text(
          `• ${row.fileName} [${unit}] uploaded by ${nameOf(row.uploadedBy)}${row.verifiedAt ? `; verified ${row.verifiedAt.toISOString()}${row.verifiedById ? ` by ${row.verifiedById}` : ''}` : '; not verified'}`,
        );
      }

      section('Learning artefacts and signatures');
      if (!artifacts.length) doc.text('No PoE artefacts recorded.');
      for (const artifact of artifacts) {
        doc.text(`• ${artifact.kind} — ${artifact.title} (${artifact.status}${artifact.moderationOutcome ? `, ${artifact.moderationOutcome}` : ''})`);
        if (artifact.facilitatorMarkedAt) {
          doc.text(
            `  Blue pen / facilitator: ${nameOf(artifact.facilitatorMarkedBy)} at ${artifact.facilitatorMarkedAt.toISOString()}`,
          );
          if (artifact.facilitatorFeedback) doc.text(`    ${artifact.facilitatorFeedback}`);
        }
        if (artifact.assessorMarkedAt) {
          doc.text(
            `  Red pen / assessor: ${nameOf(artifact.assessor)} at ${artifact.assessorMarkedAt.toISOString()}`,
          );
          if (artifact.assessorFeedback) doc.text(`    ${artifact.assessorFeedback}`);
        }
        if (artifact.moderatedAt) {
          doc.text(
            `  Green pen / moderator: ${nameOf(artifact.moderator)} at ${artifact.moderatedAt.toISOString()}`,
          );
          if (artifact.moderatorFeedback) doc.text(`    ${artifact.moderatorFeedback}`);
        }
      }

      section('Supporting documents');
      if (!documents.length) doc.text('No supporting documents attached.');
      for (const file of documents) {
        doc.text(
          `• ${file.name} [${file.category}]${file.verifiedAt ? ` verified ${file.verifiedAt.toISOString()}` : ''}`,
        );
      }

      section('Enrollment lifecycle');
      if (!workflow.length) doc.text('No workflow transitions recorded.');
      for (const row of workflow) {
        doc.text(
          `• ${row.action}: ${row.fromState} → ${row.toState} at ${row.changedAt.toISOString()}${row.reason ? ` (${row.reason})` : ''}`,
        );
      }

      section('Audit history');
      if (!audit.length) doc.text('No enrollment audit events recorded.');
      for (const row of audit) {
        doc.text(
          `• ${row.createdAt.toISOString()} ${row.action} on ${row.entityType}${row.entityId ? `/${row.entityId}` : ''} by ${nameOf(row.actor)}`,
        );
      }
      doc.end();
    });
  }

  private artifactSubmission(
    a: PoeLearningArtifact,
  ): 'missing' | 'submitted' | 'verified' {
    if (
      a.status === 'MODERATION_COMPLETE' &&
      a.moderationOutcome === 'APPROVED'
    ) return 'verified';
    if (
      [
        'LEARNER_SUBMITTED',
        'FACILITATOR_MARKED',
        'ALLOCATED_TO_ASSESSOR',
        'ASSESSOR_SATISFACTORY',
        'SUBMITTED_TO_MODERATOR',
      ].includes(a.status)
    ) {
      return 'submitted';
    }
    return 'missing';
  }

  async officialPoeOverview(enrollmentId: string, user?: AuthUser) {
    const ctx = await this.enrollmentCtx(enrollmentId, user);
    const [docs, artifacts] = await Promise.all([
      this.prisma.document.findMany({
        where: { enrollmentId: ctx.id, deletedAt: null },
      }),
      this.prisma.poeLearningArtifact.findMany({
        where: { enrollmentId: ctx.id, deletedAt: null },
      }),
    ]);

    const adminTitles = [
      { id: 'cv', title: 'Learner CV', keys: ['cv', 'admin-cv'] },
      { id: 'addr', title: 'Proof of address', keys: ['address', 'admin-address'] },
      {
        id: 'aff',
        title: 'Affidavit for unemployment',
        keys: ['affidavit', 'admin-affidavit'],
      },
      {
        id: 'g12',
        title: 'Grade 12 certificate',
        keys: ['grade12', 'admin-grade12'],
      },
    ];

    const adminRows = adminTitles.map(({ id, title, keys }) => {
      const match = docs.find((d) =>
        keys.some(
          (k) =>
            d.category.toLowerCase().includes(k) ||
            d.name.toLowerCase().includes(k),
        ),
      );
      let submission: 'missing' | 'submitted' | 'verified' = 'missing';
      if (match) submission = match.verifiedAt ? 'verified' : 'submitted';
      return { id, title, category: 'admin' as const, submission };
    });

    const workbook = artifacts.find((a) => a.kind === 'WORKBOOK');
    const summative = artifacts.find((a) => a.kind === 'SUMMATIVE');
    const moderatorAssigned = artifacts.some((a) => a.moderatorId != null);

    const learningRow = (
      artifact: PoeLearningArtifact | undefined,
      id: string,
      title: string,
      category: 'workbook' | 'summative',
    ) => ({
      id,
      artifactId: artifact?.id,
      workflowStatus: artifact?.status,
      title,
      category,
      submission: artifact ? this.artifactSubmission(artifact) : 'missing',
      // Workflow timestamps prove an action occurred, not that a signature exists.
      facilitatorMarkedSigned: false,
      assessorMarkedSigned: false,
      moderatorMarkedSigned: artifact?.moderatorId ? false : ('na' as const),
    });

    const rows = [
      ...adminRows,
      learningRow(workbook, 'lwb', 'Learner workbook', 'workbook'),
      learningRow(summative, 'sum', 'Summative assessment', 'summative'),
    ];

    return {
      learnerId: ctx.id,
      learnerName: ctx.learnerName,
      moderatorAssigned,
      rows,
      documents: docs.map((d) => this.mapDocument(d, ctx)),
    };
  }
}

function docEnrollmentScope(user?: AuthUser) {
  const scope = enrollmentActorWhere(user);
  return Object.keys(scope).length ? { enrollment: scope } : {};
}
