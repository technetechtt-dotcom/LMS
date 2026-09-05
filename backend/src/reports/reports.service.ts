import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

export type SetaSnapshot = {
  enrollments: number;
  docs: number;
  assessments: number;
  generatedAt: string;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgEnrollmentWhere(organisationId: string) {
    return {
      deletedAt: null as null,
      OR: [
        { sdioOrganisationId: organisationId },
        { employerOrganisationId: organisationId },
        { programme: { organisationId } },
      ],
    };
  }

  async learnershipProgress(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const grouped = await this.prisma.enrollment.groupBy({
      by: ['status'],
      where: this.orgEnrollmentWhere(organisationId),
      _count: { status: true },
    });
    return grouped;
  }

  async learnerPoe(enrollmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        ...this.orgEnrollmentWhere(organisationId),
      },
      select: { id: true },
    });
    if (!enrollment) return [];
    return this.prisma.evidence.findMany({
      where: { enrollmentId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async setaSnapshot(user?: AuthUser): Promise<SetaSnapshot> {
    const organisationId = requireOrganisationId(user);
    const [enrollments, docs, assessments] = await Promise.all([
      this.prisma.enrollment.count({
        where: this.orgEnrollmentWhere(organisationId),
      }),
      this.prisma.document.count({
        where: { deletedAt: null, organisationId },
      }),
      this.prisma.assessment.count({
        where: {
          deletedAt: null,
          enrollment: this.orgEnrollmentWhere(organisationId),
        },
      }),
    ]);
    return {
      enrollments,
      docs,
      assessments,
      generatedAt: new Date().toISOString(),
    };
  }

  snapshotToCsv(snapshot: SetaSnapshot): string {
    const lines = [
      'metric,value',
      `enrollments,${snapshot.enrollments}`,
      `documents,${snapshot.docs}`,
      `assessments,${snapshot.assessments}`,
      `generatedAt,${snapshot.generatedAt}`,
    ];
    return lines.join('\n');
  }

  progressToCsv(
    rows: Array<{ status: string; _count: { status: number } }>,
  ): string {
    const lines = ['status,count', ...rows.map((r) => `${r.status},${r._count.status}`)];
    return lines.join('\n');
  }

  async snapshotToPdf(snapshot: SetaSnapshot): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text('SETA operational snapshot', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text(`Generated: ${snapshot.generatedAt}`);
      doc.moveDown();
      doc.text(`Enrollments: ${snapshot.enrollments}`);
      doc.text(`Documents: ${snapshot.docs}`);
      doc.text(`Assessments: ${snapshot.assessments}`);
      doc.end();
    });
  }
}
