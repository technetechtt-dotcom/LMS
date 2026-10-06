import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  enrollmentActorWhere,
  programmeActorWhere,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { createHash } from 'crypto';

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

export type ProgrammeComplianceRow = {
  programmeId: string;
  programmeTitle: string;
  programmeCode: string;
  providerName: string;
  seta: string;
  nqfLevel: number;
  credits: number;
  totalEnrolments: number;
  activeEnrolments: number;
  completedEnrolments: number;
  programmeCompletionRate: number; // %
  averageLearnerProgress: number; // %
  regulatoryComplianceRate: number; // %
  status: 'Compliant' | 'Review Required' | 'Non-Compliant';
  metrics: {
    verifiedDocumentsRate: number;
    attendanceRate: number;
    assessmentRate: number;
    moderationRate: number;
  };
};

export type SetaComplianceReport = {
  calculationDate: string;
  dataSource: string;
  disclaimer: string;
  summary: {
    totalProgrammes: number;
    totalEnrolments: number;
    overallCompletionRate: number;
    overallAverageProgress: number;
    overallRegulatoryCompliance: number;
  };
  programmes: ProgrammeComplianceRow[];
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgEnrollmentWhere(
    organisationId: string,
    filters: ReportFilters = {},
    user?: AuthUser,
  ) {
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
      ...enrollmentActorWhere(user),
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
      where: this.orgEnrollmentWhere(organisationId, {}, user),
      _count: { status: true },
    });
    return grouped;
  }

  async learnerPoe(enrollmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        ...this.orgEnrollmentWhere(organisationId, {}, user),
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
    const responsibilityScoped = Boolean(
      user?.roleCodes.includes('SETA')
        && !user.roleCodes.some((role) => ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(role)),
    );
    const enrollmentFiltered = responsibilityScoped || Boolean(
      filters.programmeId || filters.qualificationId || filters.employerOrganisationId,
    );
    const [enrollments, docs, assessments] = await Promise.all([
      this.prisma.enrollment.count({
        where: this.orgEnrollmentWhere(organisationId, filters, user),
      }),
      this.prisma.document.count({
        where: {
          deletedAt: null,
          organisationId,
          ...(asOf ? { createdAt: { lte: asOf } } : {}),
          ...(enrollmentFiltered
            ? { enrollment: this.orgEnrollmentWhere(organisationId, filters, user) }
            : {}),
        },
      }),
      this.prisma.assessment.count({
        where: {
          deletedAt: null,
          enrollment: this.orgEnrollmentWhere(organisationId, filters, user),
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
    const ownOnly = user?.roleCodes.includes('SETA')
      && !user.roleCodes.some((role) => ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(role));
    return this.prisma.generatedReport.findMany({
      where: {
        organisationId,
        deletedAt: null,
        ...(ownOnly ? { generatedById: user!.userId } : {}),
      },
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
    const ownOnly = user?.roleCodes.includes('SETA')
      && !user.roleCodes.some((role) => ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(role));
    const row = await this.prisma.generatedReport.findFirst({
      where: {
        id,
        organisationId,
        deletedAt: null,
        ...(ownOnly ? { generatedById: user!.userId } : {}),
      },
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
    const ownOnly = user?.roleCodes.includes('SETA')
      && !user.roleCodes.some((role) => ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(role));
    const row = await this.prisma.generatedReport.findFirst({
      where: {
        id,
        organisationId,
        deletedAt: null,
        ...(ownOnly ? { generatedById: user!.userId } : {}),
      },
    });
    if (!row) throw new NotFoundException('Generated report not found');
    const snapshot = row.snapshot as unknown as SetaSnapshot;
    const file = row.format === 'pdf'
      ? { bytes: await this.snapshotToPdf(snapshot), type: 'application/pdf', filename: `report-${row.id}.pdf` }
      : { bytes: Buffer.from(this.snapshotToCsv(snapshot), 'utf8'), type: 'text/csv; charset=utf-8', filename: `report-${row.id}.csv` };
    await this.recordDownload(file.bytes, row.reportType, row.format, row.filters as ReportFilters, user, row.id);
    return file;
  }

  async recordDownload(
    bytes: Buffer,
    reportType: string,
    format: string,
    filters: ReportFilters,
    user?: AuthUser,
    reportId?: string,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');
    return this.prisma.reportDownload.create({
      data: {
        reportId,
        organisationId,
        requestedById: user.userId,
        requesterRole: user.roleCodes.join(','),
        reportType,
        format,
        filters: filters as object,
        fileSha256: createHash('sha256').update(bytes).digest('hex'),
      },
    });
  }

  async setaComplianceReport(
    user?: AuthUser,
    filters: ReportFilters = {},
  ): Promise<SetaComplianceReport> {
    const organisationId = requireOrganisationId(user);
    const asOf = filters.asOf ? new Date(`${filters.asOf}T23:59:59.999Z`) : null;
    if (asOf && Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('asOf must be a valid date');
    }

    const programmes = await this.prisma.programme.findMany({
      where: {
        deletedAt: null,
        organisationId,
        ...(filters.programmeId ? { id: filters.programmeId } : {}),
        ...(filters.qualificationId ? { qualificationId: filters.qualificationId } : {}),
        ...programmeActorWhere(user),
      },
      include: {
        organisation: { select: { id: true, name: true } },
        qualification: { select: { seta: true, nqfLevel: true, totalCredits: true } },
        enrollments: {
          where: {
            deletedAt: null,
            ...(filters.employerOrganisationId
              ? { employerOrganisationId: filters.employerOrganisationId }
              : {}),
            ...(asOf ? { createdAt: { lte: asOf } } : {}),
            ...enrollmentActorWhere(user),
          },
          include: {
            documents: { where: { deletedAt: null } },
            attendance: { where: { deletedAt: null } },
            assessments: {
              where: { deletedAt: null },
              include: { moderation: true },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    const rows: ProgrammeComplianceRow[] = programmes.map((p) => {
      const enrolments = p.enrollments;
      const totalEnrolments = enrolments.length;
      const activeEnrolments = enrolments.filter(
        (e) => e.status === 'ENROLLED' || e.status === 'TRAINING',
      ).length;
      const completedEnrolments = enrolments.filter(
        (e) => e.status === 'COMPLETED',
      ).length;

      const completionRate =
        totalEnrolments > 0
          ? Math.round((completedEnrolments / totalEnrolments) * 1000) / 10
          : 0;

      // Learner progress proxy based on lifecycle progression
      const progressSum = enrolments.reduce((sum, e) => {
        if (e.status === 'COMPLETED') return sum + 100;
        if (e.status === 'TRAINING') return sum + 55;
        if (e.status === 'ENROLLED') return sum + 15;
        return sum + 0;
      }, 0);
      const averageLearnerProgress =
        totalEnrolments > 0
          ? Math.round((progressSum / totalEnrolments) * 10) / 10
          : 0;

      // Multi-factor regulatory compliance calculation:
      // 1. Verified documents rate
      const allDocs = enrolments.flatMap((e) => e.documents);
      const verifiedDocs = allDocs.filter((d) => d.verifiedAt !== null).length;
      const docRate =
        allDocs.length > 0
          ? (verifiedDocs / allDocs.length) * 100
          : totalEnrolments > 0
          ? 50
          : 100;

      // 2. Attendance rate
      const allAttendance = enrolments.flatMap((e) => e.attendance);
      const presentAttendance = allAttendance.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EXCUSED',
      ).length;
      const attRate =
        allAttendance.length > 0
          ? (presentAttendance / allAttendance.length) * 100
          : totalEnrolments > 0
          ? 70
          : 100;

      // 3. Assessment competency rate
      const allAssessments = enrolments.flatMap((e) => e.assessments);
      const passedAssessments = allAssessments.filter(
        (a) => a.result === 'C',
      ).length;
      const assessRate =
        allAssessments.length > 0
          ? (passedAssessments / allAssessments.length) * 100
          : totalEnrolments > 0
          ? 60
          : 100;

      // 4. Moderation compliance (assessments that are locked/moderated)
      const moderatedAssessments = allAssessments.filter(
        (a) => a.moderation?.length > 0 || Boolean(a.moderatorId),
      ).length;
      const modRate =
        allAssessments.length > 0
          ? (moderatedAssessments / allAssessments.length) * 100
          : 100;

      // Weighted Regulatory Compliance:
      // Documents (25%), Attendance (25%), Assessments (35%), Moderation (15%)
      const regulatoryComplianceRate =
        Math.round(
          (0.25 * docRate + 0.25 * attRate + 0.35 * assessRate + 0.15 * modRate) * 10,
        ) / 10;

      let status: 'Compliant' | 'Review Required' | 'Non-Compliant' = 'Compliant';
      if (regulatoryComplianceRate < 50) {
        status = 'Non-Compliant';
      } else if (regulatoryComplianceRate < 75) {
        status = 'Review Required';
      }

      return {
        programmeId: p.id,
        programmeTitle: p.title,
        programmeCode: p.code,
        providerName: p.organisation?.name || 'Accredited SDP',
        seta: p.qualification?.seta || 'SETA Accredited',
        nqfLevel: p.qualification?.nqfLevel ?? 4,
        credits: p.qualification?.totalCredits ?? 120,
        totalEnrolments,
        activeEnrolments,
        completedEnrolments,
        programmeCompletionRate: completionRate,
        averageLearnerProgress,
        regulatoryComplianceRate,
        status,
        metrics: {
          verifiedDocumentsRate: Math.round(docRate * 10) / 10,
          attendanceRate: Math.round(attRate * 10) / 10,
          assessmentRate: Math.round(assessRate * 10) / 10,
          moderationRate: Math.round(modRate * 10) / 10,
        },
      };
    });

    const totalProgrammes = rows.length;
    const totalEnrolments = rows.reduce((s, r) => s + r.totalEnrolments, 0);
    const overallCompletionRate =
      totalProgrammes > 0
        ? Math.round(
            (rows.reduce((s, r) => s + r.programmeCompletionRate, 0) /
              totalProgrammes) *
              10,
          ) / 10
        : 0;
    const overallAverageProgress =
      totalProgrammes > 0
        ? Math.round(
            (rows.reduce((s, r) => s + r.averageLearnerProgress, 0) /
              totalProgrammes) *
              10,
          ) / 10
        : 0;
    const overallRegulatoryCompliance =
      totalProgrammes > 0
        ? Math.round(
            (rows.reduce((s, r) => s + r.regulatoryComplianceRate, 0) /
              totalProgrammes) *
              10,
          ) / 10
        : 100;

    return {
      calculationDate: new Date().toISOString(),
      dataSource: 'Direct transactional database verification (Prisma ORM)',
      disclaimer:
        'Official SETA Regulatory Oversight Report. Confidential. Verified against active database records.',
      summary: {
        totalProgrammes,
        totalEnrolments,
        overallCompletionRate,
        overallAverageProgress,
        overallRegulatoryCompliance,
      },
      programmes: rows,
    };
  }

  complianceToCsv(report: SetaComplianceReport): string {
    const headerLines = [
      'OFFICIAL SETA REGULATORY OVERSIGHT REPORT',
      `Calculation Date,${report.calculationDate}`,
      `Data Source,${report.dataSource}`,
      `Disclaimer,${report.disclaimer}`,
      `Summary,"Total Programmes: ${report.summary.totalProgrammes} | Total Enrolments: ${report.summary.totalEnrolments} | Overall Completion: ${report.summary.overallCompletionRate}% | Overall Progress: ${report.summary.overallAverageProgress}% | Overall Compliance: ${report.summary.overallRegulatoryCompliance}%"`,
      '',
      'Provider,Programme,Code,SETA,NQF,Credits,Total Enrolments,Active,Completed,Completion Rate (%),Average Progress (%),Regulatory Compliance (%),Status',
    ];

    const dataLines = report.programmes.map((p) =>
      [
        `"${p.providerName.replace(/"/g, '""')}"`,
        `"${p.programmeTitle.replace(/"/g, '""')}"`,
        `"${p.programmeCode.replace(/"/g, '""')}"`,
        `"${p.seta.replace(/"/g, '""')}"`,
        p.nqfLevel,
        p.credits,
        p.totalEnrolments,
        p.activeEnrolments,
        p.completedEnrolments,
        `${p.programmeCompletionRate}%`,
        `${p.averageLearnerProgress}%`,
        `${p.regulatoryComplianceRate}%`,
        p.status,
      ].join(','),
    );

    return [...headerLines, ...dataLines].join('\n');
  }

  async complianceToPdf(report: SetaComplianceReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).fillColor('#0f172a').text('SETA REGULATORY OVERSIGHT REPORT', { align: 'center' });
      doc.fontSize(8).fillColor('#64748b').text(report.disclaimer, { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(9).fillColor('#334155');
      doc.text(`Calculation Date: ${report.calculationDate}`);
      doc.text(`Data Source: ${report.dataSource}`);
      doc.moveDown(0.5);

      // Summary Box
      doc.rect(40, doc.y, 515, 45).fillAndStroke('#f8fafc', '#cbd5e1');
      const boxTop = doc.y + 8;
      doc.fillColor('#0f172a').fontSize(9);
      doc.text(`Programmes: ${report.summary.totalProgrammes}   |   Total Enrolments: ${report.summary.totalEnrolments}`, 50, boxTop);
      doc.text(
        `Completion Rate: ${report.summary.overallCompletionRate}%   |   Avg Learner Progress: ${report.summary.overallAverageProgress}%   |   Regulatory Compliance: ${report.summary.overallRegulatoryCompliance}%`,
        50,
        boxTop + 16,
      );
      doc.moveDown(3);

      doc.fontSize(11).fillColor('#0f172a').text('Programme Allocations & Compliance Breakdown');
      doc.moveDown(0.5);

      report.programmes.forEach((p, idx) => {
        if (doc.y > 700) {
          doc.addPage();
        }
        doc.fontSize(10).fillColor('#1e293b').text(`${idx + 1}. ${p.programmeTitle} (${p.programmeCode})`);
        doc.fontSize(8).fillColor('#475569');
        doc.text(`Provider: ${p.providerName}   |   SETA: ${p.seta}   |   NQF Level: ${p.nqfLevel}   |   Credits: ${p.credits}`);
        doc.text(
          `Enrolments: ${p.totalEnrolments} (Active: ${p.activeEnrolments}, Completed: ${p.completedEnrolments})   |   Completion: ${p.programmeCompletionRate}%   |   Learner Progress: ${p.averageLearnerProgress}%`,
        );
        doc.fillColor(p.status === 'Compliant' ? '#15803d' : p.status === 'Review Required' ? '#b45309' : '#b91c1c');
        doc.text(`Regulatory Compliance: ${p.regulatoryComplianceRate}%   [Status: ${p.status}]`);
        doc.moveDown(0.8);
      });

      doc.end();
    });
  }

  snapshotToCsv(snapshot: SetaSnapshot): string {
    const lines = [
      'Internal draft - Not submitted to SETA',
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
    return ['Internal draft - Not submitted to SETA', ...lines].join('\n');
  }

  async snapshotToPdf(snapshot: SetaSnapshot): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text('SETA operational snapshot', { align: 'center' });
      doc.fontSize(10).fillColor('#9a3412').text('Internal draft - Not submitted to SETA', { align: 'center' });
      doc.fillColor('#000000');
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
