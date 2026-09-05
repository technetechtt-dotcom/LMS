import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Document } from '@prisma/client';
import { FileStorageService } from '../common/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { resolveSetaAdapter } from './seta-adapters';
import { NLRD_CERTIFICATION, NLRD_SCHEMA_VERSION } from './nlrd-schema';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly config: ConfigService,
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
    const [docs, gateway] = await Promise.all([
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
    ]);
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
    return [...fromGateway, ...fromDocs];
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

    await this.prisma.document.create({
      data: {
        organisationId,
        category: 'seta-submission',
        name: `SETA export ${batchId}`,
        storageKey: `exports/seta/${batchId}.${format === 'json' ? 'json' : 'xml'}`,
        url: `/exports/seta/${batchId}.${format === 'json' ? 'json' : 'xml'}`,
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

    return {
      batchId,
      adapter: adapter.id,
      format: format === 'json' ? 'json' : 'xml',
      contentType: packaged.contentType,
      body: packaged.body,
      url: `/exports/seta/${batchId}.${format === 'json' ? 'json' : 'xml'}`,
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
    const gatewayUrl = this.config.get<string>('SETA_GATEWAY_URL')?.trim();
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
        message:
          'SETA_GATEWAY_URL is not configured; export stored locally pending regulator submission',
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
