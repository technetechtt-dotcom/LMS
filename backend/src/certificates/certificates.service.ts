import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../common/file-storage.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { PoeWorkflowService } from '../poe/poe-workflow.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly poeWorkflow: PoeWorkflowService,
    private readonly config: ConfigService,
  ) {}

  private mapDoc(doc: {
    id: string;
    name: string;
    url: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    enrollmentId: string | null;
  }) {
    const meta = (doc.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: doc.id,
      title: doc.name,
      learnerId: doc.enrollmentId,
      learnerName: meta.learnerName as string | undefined,
      programmeName: meta.programmeName as string | undefined,
      issuedAt: (meta.issuedAt as string) ?? doc.createdAt.toISOString(),
      certificateNumber:
        (meta.certificateNumber as string) ?? doc.id.slice(0, 8),
      verificationCode: meta.verificationCode as string | undefined,
      status: (meta.status as string) ?? 'issued',
      fileUrl: doc.url,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async list(user?: AuthUser, enrollmentId?: string) {
    const organisationId = requireOrganisationId(user);
    const docs = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        organisationId,
        category: 'certificate',
        ...(enrollmentId ? { enrollmentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.mapDoc(d));
  }

  private async buildPdf(opts: {
    title: string;
    learnerName: string;
    programmeName: string;
    certNo: string;
    issuedAt: string;
    verifyUrl: string;
  }): Promise<Buffer> {
    const qrPng = await QRCode.toBuffer(opts.verifyUrl, {
      type: 'png',
      width: 140,
      margin: 1,
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).text('Certificate of Competence', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(opts.title, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text('This is to certify that', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).text(opts.learnerName, { align: 'center', underline: true });
      doc.moveDown();
      doc.fontSize(12).text('has been found competent in', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(opts.programmeName, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(10).text(`Certificate No: ${opts.certNo}`, { align: 'center' });
      doc.text(`Issued: ${opts.issuedAt}`, { align: 'center' });
      doc.moveDown();
      doc.image(qrPng, doc.page.width / 2 - 70, doc.y, { width: 140 });
      doc.moveDown(8);
      doc.fontSize(8).text(`Verify: ${opts.verifyUrl}`, { align: 'center' });
      doc.end();
    });
  }

  async issue(
    body: {
      enrollmentId: string;
      title?: string;
      programmeName?: string;
      learnerName?: string;
    },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const gate = await this.poeWorkflow.enrollmentReadyForCertificate(
      body.enrollmentId,
    );
    if (!gate.ready) {
      throw new BadRequestException({
        message: 'Enrolment is not ready for certificate issue',
        reasons: gate.reasons,
      });
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: body.enrollmentId,
        deletedAt: null,
        OR: [
          { sdioOrganisationId: organisationId },
          { programme: { organisationId } },
        ],
      },
      include: {
        learner: true,
        programme: true,
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const learnerName =
      body.learnerName ??
      `${enrollment.learner.firstName} ${enrollment.learner.lastName}`.trim();
    const title =
      body.title ?? `Certificate of Competence — ${enrollment.programme.title}`;
    const certNo = `CERT-${Date.now().toString(36).toUpperCase()}`;
    const verificationCode = createHash('sha256')
      .update(`${certNo}:${enrollment.id}:${randomUUID()}`)
      .digest('hex')
      .slice(0, 24);
    const issuedAt = new Date().toISOString();
    const front =
      this.config.get<string>('FRONTEND_ORIGIN')?.split(',')[0]?.trim() ??
      'http://localhost:5173';
    const verifyUrl = `${front}/certificates/verify/${verificationCode}`;

    const pdf = await this.buildPdf({
      title,
      learnerName,
      programmeName: body.programmeName ?? enrollment.programme.title,
      certNo,
      issuedAt: issuedAt.slice(0, 10),
      verifyUrl,
    });

    const stored = await this.files.upload(
      `${certNo}.pdf`,
      pdf,
      'application/pdf',
      { prefix: 'certificates', organisationId },
    );

    const doc = await this.prisma.document.create({
      data: {
        organisationId,
        enrollmentId: enrollment.id,
        category: 'certificate',
        name: title,
        storageKey: stored.key,
        url: stored.url,
        metadata: {
          status: 'issued',
          certificateNumber: certNo,
          verificationCode,
          learnerName,
          programmeName: body.programmeName ?? enrollment.programme.title,
          issuedAt,
          issuedBy: user?.userId,
          verifyUrl,
        },
      },
    });
    return this.mapDoc(doc);
  }

  async verify(code: string) {
    const docs = await this.prisma.document.findMany({
      where: { deletedAt: null, category: 'certificate' },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });
    const doc = docs.find((d) => {
      const meta = (d.metadata as Record<string, unknown> | null) ?? {};
      return meta.verificationCode === code;
    });
    if (!doc) throw new NotFoundException('Certificate not found');
    return {
      valid: true,
      ...this.mapDoc(doc),
    };
  }
}
