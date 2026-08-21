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
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<NLRDExport batchId="${batchId}" organisationId="${organisationId}" generatedAt="${new Date().toISOString()}">`,
      `<Validation valid="${errors.length === 0}" errorCount="${errors.length}"/>`,
      ...errors.map((err) => `<Error>${this.xmlEscape(err)}</Error>`),
      '<Learners>',
      ...rowsXml,
      '</Learners>',
      '</NLRDExport>',
    ].join('');

    await this.prisma.document.create({
      data: {
        organisationId,
        category: 'seta-submission',
        name: `NLRD ${batchId}`,
        storageKey: `exports/nlrd/${batchId}.xml`,
        url: `/exports/nlrd/${batchId}.xml`,
        metadata: {
          type: 'nlrd',
          reference: batchId,
          status: errors.length ? 'invalid' : 'generated',
          submittedAt: new Date().toISOString(),
          errorCount: errors.length,
        },
      },
    });

    return {
      batchId,
      valid: errors.length === 0,
      errors,
      recordCount: enrollments.length,
      xml,
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
    let contentType: string;
    if (format === 'json') {
      body = JSON.stringify(payload, null, 2);
      contentType = 'application/json';
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
      contentType = 'application/xml';
    }

    await this.prisma.document.create({
      data: {
        organisationId,
        category: 'seta-submission',
        name: `SETA export ${batchId}`,
        storageKey: `exports/seta/${batchId}.${format === 'json' ? 'json' : 'xml'}`,
        url: `/exports/seta/${batchId}.${format === 'json' ? 'json' : 'xml'}`,
        metadata: {
          type: 'seta-export',
          reference: batchId,
          status: 'generated',
          contentType,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return {
      batchId,
      format: format === 'json' ? 'json' : 'xml',
      contentType,
      body,
      url: `/exports/seta/${batchId}.${format === 'json' ? 'json' : 'xml'}`,
    };
  }

  private xmlEscape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
