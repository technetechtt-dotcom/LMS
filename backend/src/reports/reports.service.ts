import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

export type ReportFilters = {
  programmeId?: string;
  qualificationId?: string;
  employerOrganisationId?: string;
  asOf?: string;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgEnrollmentWhere(organisationId: string, filters: ReportFilters = {}) {
    const asOf = filters.asOf ? new Date(`${filters.asOf}T23:59:59.999Z`) : null;
    if (asOf && Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('asOf must be a valid date');
    }
    return {
      deletedAt: null as null,
      ...(filters.programmeId ? { programmeId: filters.programmeId } : {}),
      ...(filters.employerOrganisationId
        ? { employerOrganisationId: filters.employerOrganisationId }
        : {}),
      ...(filters.qualificationId
        ? { programme: { qualificationId: filters.qualificationId } }
        : {}),
      ...(asOf ? { createdAt: { lte: asOf } } : {}),
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

  async setaSnapshot(user?: AuthUser, filters: ReportFilters = {}): Promise<SetaSnapshot> {
    const organisationId = requireOrganisationId(user);
    const asOf = filters.asOf ? new Date(`${filters.asOf}T23:59:59.999Z`) : null;
    const enrollmentFiltered = Boolean(
      filters.programmeId || filters.qualificationId || filters.employerOrganisationId,
    );
    const [enrollments, docs, assessments] = await Promise.all([
      this.prisma.enrollment.count({
        where: this.orgEnrollmentWhere(organisationId, filters),
      }),
      this.prisma.document.count({
        where: {
          deletedAt: null,
          organisationId,
          ...(asOf ? { createdAt: { lte: asOf } } : {}),
          ...(enrollmentFiltered
            ? { enrollment: this.orgEnrollmentWhere(organisationId, filters) }
            : {}),
        },
      }),
      this.prisma.assessment.count({
        where: {
          deletedAt: null,
          enrollment: this.orgEnrollmentWhere(organisationId, filters),
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

  async listGenerated(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.generatedReport.findMany({
      where: { organisationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        generatedBy: { select: { firstName: true, lastName: true } },
      },
      take: 100,
    });
  }

  async createGenerated(
    body: { reportType?: string; format?: string; filters?: ReportFilters },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    const reportType = body.reportType?.trim() || 'seta-snapshot';
    const format = body.format === 'pdf' ? 'pdf' : 'csv';
    const filters = body.filters ?? {};
    const snapshot = await this.setaSnapshot(user, filters);
    return this.prisma.generatedReport.create({
      data: {
        organisationId,
        generatedById: user.userId,
        reportType,
        format,
        name: reportType === 'seta-snapshot'
          ? 'SETA operational snapshot'
          : `${reportType.replace(/[-_]/g, ' ')} report`,
        filters: filters as object,
        snapshot: snapshot as unknown as object,
      },
      include: {
        generatedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async deleteGenerated(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.generatedReport.findFirst({
      where: { id, organisationId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Generated report not found');
    await this.prisma.generatedReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  async generatedFile(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.generatedReport.findFirst({
      where: { id, organisationId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Generated report not found');
    const snapshot = row.snapshot as unknown as SetaSnapshot;
    return row.format === 'pdf'
      ? {
          bytes: await this.snapshotToPdf(snapshot),
          type: 'application/pdf',
          filename: `report-${row.id}.pdf`,
        }
      : {
          bytes: Buffer.from(this.snapshotToCsv(snapshot), 'utf8'),
          type: 'text/csv; charset=utf-8',
          filename: `report-${row.id}.csv`,
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
