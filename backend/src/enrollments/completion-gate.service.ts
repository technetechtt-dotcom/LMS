import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkplaceLogsService } from '../workplace-logs/workplace-logs.service';
import { enrollmentOrgWhere } from '../common/tenant/tenant-scope';

export type CompletionCheck = {
  ready: boolean;
  reasons: string[];
  checks: Record<string, boolean>;
};

/**
 * Programme-driven completion gate.
 * Requirements live in Programme.metadata.completionRequirements or ProgrammeRequirement rows.
 */
@Injectable()
export class CompletionGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workplace: WorkplaceLogsService,
  ) {}

  async evaluate(
    enrollmentId: string,
    organisationId: string,
  ): Promise<CompletionCheck> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      include: { programme: true },
    });
    if (!enrollment) {
      return { ready: false, reasons: ['Enrollment not found'], checks: {} };
    }

    const meta =
      (enrollment.programme.metadata as Record<string, unknown> | null) ?? {};
    const reqs =
      (meta.completionRequirements as Record<string, unknown> | undefined) ??
      {};

    const requireAllAssessmentsC = reqs.requireAllAssessmentsC !== false;
    const requireWorkbook = reqs.requireWorkbook !== false;
    const requireSummative = reqs.requireSummative !== false;
    const minVerifiedHours = Number(reqs.minVerifiedWorkplaceHours ?? 0);
    const minAttendanceRate = Number(reqs.minAttendanceRatePercent ?? 0);

    const reasons: string[] = [];
    const checks: Record<string, boolean> = {};

    if (requireAllAssessmentsC) {
      const assessments = await this.prisma.assessment.findMany({
        where: { enrollmentId, deletedAt: null },
      });
      const ok =
        assessments.length > 0 && assessments.every((a) => a.result === 'C');
      checks.allAssessmentsCompetent = ok;
      if (!ok) {
        reasons.push(
          assessments.length
            ? 'Not all assessments are Competent (C)'
            : 'No competency assessments recorded',
        );
      }
    }

    for (const kind of [
      ...(requireWorkbook ? (['WORKBOOK'] as const) : []),
      ...(requireSummative ? (['SUMMATIVE'] as const) : []),
    ]) {
      const approved = await this.prisma.poeLearningArtifact.findFirst({
        where: {
          enrollmentId,
          deletedAt: null,
          kind,
          status: 'MODERATION_COMPLETE',
          moderationOutcome: 'APPROVED',
        },
      });
      const key = `poe_${kind.toLowerCase()}_approved`;
      checks[key] = Boolean(approved);
      if (!approved) {
        reasons.push(`Missing approved ${kind} PoE artefact`);
      }
    }

    if (minVerifiedHours > 0) {
      const hours = await this.workplace.verifiedHours(enrollmentId);
      const ok = hours >= minVerifiedHours;
      checks.verifiedWorkplaceHours = ok;
      if (!ok) {
        reasons.push(
          `Verified workplace hours ${hours} < required ${minVerifiedHours}`,
        );
      }
    }

    if (minAttendanceRate > 0) {
      const scheduledSessions = await this.prisma.attendanceSession.count({
        where: {
          programmeId: enrollment.programmeId,
          closedAt: { not: null },
          scheduledAt: { lte: new Date() },
        },
      });
      let rate = 0;
      if (scheduledSessions > 0) {
        const [present, excused] = await Promise.all([
          this.prisma.attendance.findMany({
            where: {
              enrollmentId,
              deletedAt: null,
              sessionId: { not: null },
              session: { closedAt: { not: null }, scheduledAt: { lte: new Date() } },
              status: { in: ['PRESENT', 'LATE'] },
            },
            select: { sessionId: true },
            distinct: ['sessionId'],
          }),
          this.prisma.attendance.findMany({
            where: {
              enrollmentId,
              deletedAt: null,
              sessionId: { not: null },
              session: { closedAt: { not: null }, scheduledAt: { lte: new Date() } },
              status: 'EXCUSED',
            },
            select: { sessionId: true },
            distinct: ['sessionId'],
          }),
        ]);
        const requiredSessions = Math.max(0, scheduledSessions - excused.length);
        rate = requiredSessions > 0 ? (present.length / requiredSessions) * 100 : 100;
      } else {
        const rows = await this.prisma.attendance.findMany({
          where: { enrollmentId, deletedAt: null },
        });
        const present = rows.filter(
          (r) => r.status === 'PRESENT' || r.status === 'LATE',
        ).length;
        const requiredRows = rows.filter((r) => r.status !== 'EXCUSED').length;
        rate = requiredRows > 0 ? (present / requiredRows) * 100 : rows.length ? 100 : 0;
      }
      const ok = rate >= minAttendanceRate;
      checks.attendanceRate = ok;
      if (!ok) {
        reasons.push(
          `Attendance rate ${rate.toFixed(0)}% < required ${minAttendanceRate}%`,
        );
      }
    }

    return { ready: reasons.length === 0, reasons, checks };
  }
}
