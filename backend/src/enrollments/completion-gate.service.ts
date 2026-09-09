import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkplaceLogsService } from '../workplace-logs/workplace-logs.service';
import { enrollmentOrgWhere } from '../common/tenant/tenant-scope';
import { FileStorageService } from '../common/file-storage.service';

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
    @Optional() private readonly files?: FileStorageService,
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
      include: { programme: true, learner: true },
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

    const validRecords =
      enrollment.learner.deletedAt == null &&
      enrollment.learner.isActive &&
      enrollment.programme.deletedAt == null;
    checks.learnerAndProgrammeValid = validRecords;
    if (!validRecords) reasons.push('Learner or programme record is inactive');

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
        include: {
          uploads: {
            where: {
              upload: {
                organisationId,
                status: 'VERIFIED',
                storageKey: { not: null },
                OR: [{ retentionUntil: null }, { retentionUntil: { gt: new Date() } }],
              },
            },
            select: { uploadId: true },
          },
        },
      });
      const key = `poe_${kind.toLowerCase()}_approved`;
      const hasEvidence = Boolean(approved?.uploads.length);
      checks[key] = Boolean(approved) && hasEvidence;
      if (!approved || !hasEvidence) {
        reasons.push(`Missing approved ${kind} PoE artefact`);
      } else {
        for (const link of approved.uploads) {
          try {
            await this.files?.assertUploadAvailable(link.uploadId, organisationId);
          } catch {
            checks[key] = false;
            reasons.push(`${kind} PoE evidence object is unavailable`);
            break;
          }
        }
      }
    }

    const assessmentsForModeration = await this.prisma.assessment.findMany({
      where: { enrollmentId, deletedAt: null },
      select: {
        id: true,
        moderation: {
          where: { deletedAt: null },
          orderBy: { round: 'desc' },
          take: 1,
          select: { decision: true },
        },
      },
    });
    const moderationApproved = assessmentsForModeration.every(
      (assessment) => assessment.moderation[0]?.decision === 'APPROVED',
    );
    checks.requiredModerationApproved = moderationApproved;
    if (!moderationApproved) reasons.push('Required assessment moderation is not approved');

    const blockingCompliance = await this.prisma.complianceDecision.count({
      where: { organisationId, status: 'ACTION_REQUIRED' },
    });
    checks.noBlockingComplianceDecision = blockingCompliance === 0;
    if (blockingCompliance > 0) reasons.push('A blocking compliance decision is unresolved');

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
      const openMandatory = await this.prisma.attendanceSession.count({
        where: {
          programmeId: enrollment.programmeId,
          scheduledAt: { lte: new Date() },
          closedAt: null,
        },
      });
      checks.mandatoryAttendanceSessionsClosed = openMandatory === 0;
      if (openMandatory > 0) reasons.push('Mandatory attendance sessions remain open');
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
