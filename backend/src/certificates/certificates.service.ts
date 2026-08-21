import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

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
      certificateNumber: (meta.certificateNumber as string) ?? doc.id.slice(0, 8),
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

    const doc = await this.prisma.document.create({
      data: {
        organisationId,
        enrollmentId: enrollment.id,
        category: 'certificate',
        name: title,
        storageKey: `certificates/${organisationId}/${randomUUID()}`,
        url: `/certificates/${certNo}.pdf`,
        metadata: {
          status: 'issued',
          certificateNumber: certNo,
          learnerName,
          programmeName: body.programmeName ?? enrollment.programme.title,
          issuedAt: new Date().toISOString(),
          issuedBy: user?.userId,
        },
      },
    });
    return this.mapDoc(doc);
  }
}
