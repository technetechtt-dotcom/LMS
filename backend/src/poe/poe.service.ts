import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Document, PoeLearningArtifact } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';

type EnrollmentCtx = {
  id: string;
  learnerName: string;
};

@Injectable()
export class PoeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
  ) {}

  private async enrollmentCtx(enrollmentId: string): Promise<EnrollmentCtx> {
    const row = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, deletedAt: null },
      include: { learner: true },
    });
    if (!row) throw new NotFoundException('Learner enrolment not found');
    return {
      id: row.id,
      learnerName: `${row.learner.firstName} ${row.learner.lastName}`.trim(),
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

  async listDocuments(enrollmentId: string) {
    const ctx = await this.enrollmentCtx(enrollmentId);
    const docs = await this.prisma.document.findMany({
      where: { enrollmentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.mapDocument(d, ctx));
  }

  async uploadDocument(
    enrollmentId: string,
    file: Express.Multer.File | undefined,
    metadata: Record<string, unknown>,
    uploadedById: string,
  ) {
    const ctx = await this.enrollmentCtx(enrollmentId);
    const now = new Date().toISOString();
    let url = '/materials/placeholder';
    let storageKey = `local/${randomUUID()}`;
    if (file?.buffer?.length) {
      const stored = await this.files.upload(
        file.originalname,
        file.buffer,
        file.mimetype,
      );
      url = stored.url;
      storageKey = stored.key;
    }
    const doc = await this.prisma.document.create({
      data: {
        enrollmentId,
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

  async verifyDocument(documentId: string, verifierId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('POE document not found');
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verifiedById: verifierId,
        verifiedAt: new Date(),
      },
    });
    return {
      id: updated.id,
      status: 'verified',
      verifiedBy: verifierId,
      verifiedAt: updated.verifiedAt?.toISOString(),
    };
  }

  exportPoe(enrollmentId: string) {
    return {
      url: `/exports/poe-${encodeURIComponent(enrollmentId)}.pdf`,
    };
  }

  private artifactSubmission(
    a: PoeLearningArtifact,
  ): 'missing' | 'submitted' | 'verified' {
    if (a.status === 'MODERATION_COMPLETE' || a.moderatorId) return 'verified';
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

  async officialPoeOverview(enrollmentId: string) {
    const ctx = await this.enrollmentCtx(enrollmentId);
    const [docs, artifacts] = await Promise.all([
      this.prisma.document.findMany({
        where: { enrollmentId, deletedAt: null },
      }),
      this.prisma.poeLearningArtifact.findMany({
        where: { enrollmentId, deletedAt: null },
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

    const rows = [
      ...adminRows,
      {
        id: 'lwb',
        title: 'Learner workbook',
        category: 'workbook' as const,
        submission: workbook ? this.artifactSubmission(workbook) : 'missing',
        facilitatorMarkedSigned: Boolean(workbook?.facilitatorMarkedAt),
      },
      {
        id: 'sum',
        title: 'Summative assessment',
        category: 'summative' as const,
        submission: summative ? this.artifactSubmission(summative) : 'missing',
        assessorMarkedSigned: Boolean(summative?.assessorMarkedAt),
        moderatorMarkedSigned: summative?.moderationOutcome === 'APPROVED'
          ? true
          : summative?.moderatorId
            ? false
            : ('na' as const),
      },
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
