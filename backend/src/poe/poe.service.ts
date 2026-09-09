import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Document, PoeLearningArtifact } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

type EnrollmentCtx = {
  id: string;
  learnerId: string;
  learnerName: string;
  organisationId: string | null;
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
      },
      include: { learner: true },
    });
    if (!row) throw new NotFoundException('Learner enrolment not found');
    assertEnrollmentAccess(user, row, 'PoE');
    return {
      id: row.id,
      learnerId: row.learnerId,
      learnerName: `${row.learner.firstName} ${row.learner.lastName}`.trim(),
      organisationId: row.sdioOrganisationId,
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
    file: Express.Multer.File | undefined,
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
    const now = new Date().toISOString();
    let url = '/materials/placeholder';
    let storageKey = `local/${randomUUID()}`;
    if (file?.buffer?.length) {
      const stored = await this.files.upload(
        file.originalname,
        file.buffer,
        file.mimetype,
        { prefix: 'poe', organisationId },
      );
      url = stored.url;
      storageKey = stored.key;
    }
    const doc = await this.prisma.document.create({
      data: {
        enrollmentId: ctx.id,
        organisationId,
        category: (metadata.category as string) ?? 'General',
        name: file?.originalname ?? (metadata.name as string) ?? 'upload.bin',
        storageKey,
        url,
        metadata: {
          ...metadata,
          type: metadata.type ?? metadata.category ?? 'Evidence',
          mimeType: file?.mimetype ?? 'application/octet-stream',
          fileSize: file
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : '0 MB',
          status: 'submitted',
          version: 1,
          versionHistory: [
            {
              version: 1,
              fileUrl: url,
              fileName: file?.originalname ?? 'upload.bin',
              uploadedAt: now,
              uploadedBy: uploadedById,
            },
          ],
        },
      },
    });
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
          { organisationId },
          {
            enrollment: {
              deletedAt: null,
              ...enrollmentOrgWhere(organisationId),
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

  exportPoe(enrollmentId: string, user?: AuthUser) {
    // Access check via enrollmentCtx (async) — call from controller after await
    return {
      url: `/exports/poe-${encodeURIComponent(enrollmentId)}.pdf`,
    };
  }

  async assertCanExport(enrollmentId: string, user?: AuthUser) {
    await this.enrollmentCtx(enrollmentId, user);
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
