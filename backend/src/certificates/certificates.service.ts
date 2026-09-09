import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../common/file-storage.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  enrollmentActorWhere,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { PoeWorkflowService } from '../poe/poe-workflow.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
    private readonly poeWorkflow: PoeWorkflowService,
    private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private credentialSignature(input: {
    certificateNumber: string;
    enrollmentId: string;
    learnerName: string;
    programmeName: string;
    issuedAt: Date;
    pdfSha256: string;
  }) {
    const secret = this.config.get<string>('CREDENTIAL_SIGNING_SECRET')?.trim()
      || this.config.get<string>('FILE_SIGNING_SECRET')?.trim()
      || this.config.get<string>('JWT_SECRET')?.trim()
      || 'development-credential-signing-key';
    const canonical = [
      'credential-signature-v1',
      input.certificateNumber,
      input.enrollmentId,
      input.learnerName,
      input.programmeName,
      input.issuedAt.toISOString(),
      input.pdfSha256,
    ].join('\n');
    return createHmac('sha256', secret).update(canonical).digest('base64url');
  }

  private mapCredential(row: {
    id: string;
    title: string;
    enrollmentId: string;
    learnerName: string;
    programmeName: string;
    certificateNumber: string;
    verificationCode: string;
    status: string;
    issuedAt: Date;
    pdfStorageKey: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      learnerId: row.enrollmentId,
      learnerName: row.learnerName,
      programmeName: row.programmeName,
      issuedAt: row.issuedAt.toISOString(),
      certificateNumber: row.certificateNumber,
      verificationCode: row.verificationCode,
      status: row.status.toLowerCase(),
      fileUrl: `/documents/by-key/download`, // clients should use GET /certificates/:id/download
      storageKey: row.pdfStorageKey,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(user?: AuthUser, enrollmentId?: string) {
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.credential.findMany({
      where: {
        organisationId,
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: enrollmentActorWhere(user),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((d) => this.mapCredential(d));
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
    body: { enrollmentId: string },
    user?: AuthUser,
    supersedingCredentialId?: string,
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

    const existingActive = await this.prisma.credential.findFirst({
      where: {
        enrollmentId: enrollment.id,
        organisationId,
        status: 'ISSUED',
        ...(supersedingCredentialId ? { id: { not: supersedingCredentialId } } : {}),
      },
      select: { id: true },
    });
    if (existingActive) {
      throw new BadRequestException('An active credential already exists for this enrollment');
    }

    const learnerName =
      `${enrollment.learner.firstName} ${enrollment.learner.lastName}`.trim();
    const programmeName = enrollment.programme.title;
    const title = `Certificate of Competence — ${programmeName}`;
    const certNo = `CERT-${Date.now().toString(36).toUpperCase()}`;
    const verificationCode = createHash('sha256')
      .update(`${certNo}:${enrollment.id}:${randomUUID()}`)
      .digest('hex')
      .slice(0, 24);
    const issuedAt = new Date();
    const front =
      this.config.get<string>('FRONTEND_ORIGIN')?.split(',')[0]?.trim() ??
      'http://localhost:5173';
    const verifyUrl = `${front}/certificates/verify/${verificationCode}`;

    const pdf = await this.buildPdf({
      title,
      learnerName,
      programmeName,
      certNo,
      issuedAt: issuedAt.toISOString().slice(0, 10),
      verifyUrl,
    });
    const pdfSha256 = createHash('sha256').update(pdf).digest('hex');
    const credentialSignature = this.credentialSignature({
      certificateNumber: certNo,
      enrollmentId: enrollment.id,
      learnerName,
      programmeName,
      issuedAt,
      pdfSha256,
    });

    const stored = await this.files.upload(
      `${certNo}.pdf`,
      pdf,
      'application/pdf',
      { prefix: 'certificates', organisationId },
    );
    await this.files.assertUploadAvailable(stored.uploadId, organisationId);

    const locator = this.files.storageLocator(stored.key, stored.bucket);

    const credential = await this.prisma.$transaction(async (tx) => {
      const active = await tx.credential.findFirst({
        where: {
          enrollmentId: enrollment.id,
          organisationId,
          status: 'ISSUED',
          ...(supersedingCredentialId ? { id: { not: supersedingCredentialId } } : {}),
        },
        select: { id: true },
      });
      if (active) throw new BadRequestException('An active credential already exists for this enrollment');
      if (supersedingCredentialId) {
        await tx.credential.update({
          where: { id: supersedingCredentialId },
          data: { status: 'SUPERSEDED' },
        });
      }
      const doc = await tx.document.create({
        data: {
          organisationId,
          enrollmentId: enrollment.id,
          uploadId: stored.uploadId,
          category: 'certificate',
          name: title,
          storageKey: stored.key,
          url: locator,
          metadata: { certificateNumber: certNo, verificationCode, checksum: pdfSha256 },
        },
      });
      const created = await tx.credential.create({
        data: {
          organisationId,
          enrollmentId: enrollment.id,
          certificateNumber: certNo,
          verificationCode,
          title,
          learnerName,
          programmeName,
          status: 'ISSUED',
          issuedAt,
          issuedById: user?.userId,
          supersedesId: supersedingCredentialId,
          pdfStorageKey: stored.key,
          pdfSha256,
          documentId: doc.id,
          metadata: {
            verifyUrl,
            signature: credentialSignature,
            signatureAlgorithm: 'HMAC-SHA256',
            signedPayloadVersion: 1,
          },
        },
      });
      if (supersedingCredentialId) {
        await tx.credential.update({
          where: { id: supersedingCredentialId },
          data: {
            metadata: {
              ...((await tx.credential.findUnique({ where: { id: supersedingCredentialId } }))?.metadata as object ?? {}),
              supersededAt: new Date().toISOString(),
              supersededByActor: user?.userId,
              replacementId: created.id,
            },
          },
        });
      }
      return created;
    });

    await this.notifications?.notify(
      enrollment.learnerId,
      'credential',
      'Certificate issued',
      `A certificate of competence has been issued for ${programmeName}.`,
      { credentialId: credential.id, verificationCode },
    );

    return this.mapCredential(credential);
  }

  async revoke(
    id: string,
    body: { reason: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!body.reason?.trim()) {
      throw new BadRequestException('revocation reason is required');
    }
    const row = await this.prisma.credential.findFirst({
      where: { id, organisationId },
    });
    if (!row) throw new NotFoundException('Credential not found');
    if (row.status === 'REVOKED') {
      throw new BadRequestException('Credential already revoked');
    }
    return this.prisma.credential.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: body.reason.trim(),
        metadata: {
          ...((row.metadata as object) ?? {}),
          revokedBy: user?.userId,
        },
      },
    }).then((c) => this.mapCredential(c));
  }

  /** Reissue: issue a replacement first, then mark the prior credential SUPERSEDED. */
  async reissue(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const prior = await this.prisma.credential.findFirst({
      where: { id, organisationId },
    });
    if (!prior) throw new NotFoundException('Credential not found');
    if (prior.status === 'REVOKED') {
      throw new BadRequestException('Cannot reissue a revoked credential');
    }

    const replacement = await this.issue(
      { enrollmentId: prior.enrollmentId },
      user,
      prior.id,
    );

    return { priorId: prior.id, replacement };
  }

  async download(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.credential.findFirst({
      where: {
        id,
        organisationId,
        enrollment: enrollmentActorWhere(user),
      },
    });
    if (!row) throw new NotFoundException('Credential not found');
    const downloadUrl = await this.files.getSignedDownloadUrl(
      row.pdfStorageKey,
      900,
    );
    return {
      id: row.id,
      storageKey: row.pdfStorageKey,
      downloadUrl,
      expiresInSeconds: 900,
    };
  }

  async verify(code: string) {
    const row = await this.prisma.credential.findFirst({
      where: { verificationCode: code },
    });
    if (!row) throw new NotFoundException('Certificate not found');
    const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
    const suppliedSignature = typeof metadata.signature === 'string'
      ? metadata.signature
      : '';
    const expectedSignature = row.pdfSha256
      ? this.credentialSignature({
          certificateNumber: row.certificateNumber,
          enrollmentId: row.enrollmentId,
          learnerName: row.learnerName,
          programmeName: row.programmeName,
          issuedAt: row.issuedAt,
          pdfSha256: row.pdfSha256,
        })
      : '';
    const signatureValid = Boolean(
      suppliedSignature
        && expectedSignature
        && suppliedSignature.length === expectedSignature.length
        && timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature)),
    );
    const learnerInitials = row.learnerName
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return {
      valid: row.status === 'ISSUED' && signatureValid,
      signatureValid,
      signatureAlgorithm: metadata.signatureAlgorithm ?? null,
      credentialStatus: row.status,
      certificateNumber: row.certificateNumber,
      title: row.title,
      programmeName: row.programmeName,
      issuedAt: row.issuedAt.toISOString(),
      learnerInitials,
    };
  }
}
