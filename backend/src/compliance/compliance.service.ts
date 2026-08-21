import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Document } from '@prisma/client';
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
  ) {}

  private mapComplianceDoc(doc: Document): Record<string, unknown> {
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
      orderBy: { updatedAt: 'desc' },
    });
    return docs.map((d) => this.mapComplianceDoc(d));
  }

  async listSetaSubmissions(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const docs = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        organisationId,
        category: 'seta-submission',
      },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.mapSetaSubmission(d));
  }

  async uploadDocument(
    file: Express.Multer.File | undefined,
    metadata: Record<string, unknown>,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    let url: string | undefined;
    let storageKey = `compliance/${randomUUID()}`;
    if (file?.buffer?.length) {
      const stored = await this.files.upload(
        file.originalname,
        file.buffer,
        file.mimetype,
        { prefix: 'compliance', organisationId },
      );
      url = stored.url;
      storageKey = stored.key;
    }
    const doc = await this.prisma.document.create({
      data: {
        organisationId,
        category: (metadata.category as string) ?? 'compliance',
        name: (metadata.name as string) ?? file?.originalname ?? 'document',
        storageKey,
        url: url ?? '/materials/placeholder',
        metadata: {
          ...metadata,
          status: metadata.status ?? 'pending_review',
        },
      },
    });
    return this.mapComplianceDoc(doc);
  }

  generateNlrd(programmeId?: string) {
    return {
      batchId: `NLRD-${Date.now()}`,
      xml: `<?xml version="1.0"?><nlrd programmeId="${programmeId ?? ''}"/>`,
    };
  }

  exportSeta(setaId: string, format: string) {
    const ext = format || 'xml';
    return {
      url: `/exports/seta-${encodeURIComponent(setaId)}.${ext}`,
    };
  }
}
