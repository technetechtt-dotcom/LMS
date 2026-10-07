import type {
  Enrollment,
  LearnerLifecycleStatus,
  Organisation,
  Programme,
  Qualification,
  User,
} from '@prisma/client';

export type EnrollmentWithRelations = Enrollment & {
  learner: User;
  programme: Programme & {
    qualification: Qualification | null;
    organisation: Organisation | null;
  };
};

type LearnerMeta = {
  idNumber?: string;
  phone?: string;
  progress?: number;
  setaStatus?: string;
  lastActivity?: string;
  lastActivityDescription?: string;
  expectedCompletionDate?: string;
  atRisk?: boolean;
  withdrawn?: boolean;
};

function deriveUiStatus(
  lifecycle: LearnerLifecycleStatus,
  meta: LearnerMeta,
): 'active' | 'completed' | 'withdrawn' | 'at_risk' {
  if (meta.withdrawn === true) return 'withdrawn';
  if (lifecycle === 'COMPLETED') return 'completed';
  if (meta.atRisk === true) return 'at_risk';
  return 'active';
}

export function mapEnrollmentToLearnerApi(
  e: EnrollmentWithRelations,
  assessment?: { total: number; competent: number },
): Record<string, unknown> {
  const meta = (e.metadata as LearnerMeta | null) ?? {};
  const q = e.programme.qualification;
  const started = e.startedAt ?? e.createdAt;

  const progressVal =
    typeof meta.progress === 'number'
      ? meta.progress
      : e.status === 'COMPLETED'
        ? 100
        : 0;

  const isManualFlag = meta.atRisk === true;
  const riskFactors: string[] = [];

  if (isManualFlag) {
    riskFactors.push('Manual flag: flagged by coordinator/facilitator');
  }

  if (assessment && assessment.total > 0) {
    const passRate = assessment.competent / assessment.total;
    if (passRate < 0.5) {
      riskFactors.push(`Low assessment pass rate (${Math.round(passRate * 100)}% competent)`);
    }
  }

  const lastActiveDate = meta.lastActivity ? new Date(meta.lastActivity) : e.updatedAt;
  const daysInactive = Math.max(0, Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)));
  if (daysInactive > 30 && e.status !== 'COMPLETED') {
    riskFactors.push(`No recorded activity in ${daysInactive} days`);
  }

  if (e.status !== 'COMPLETED' && progressVal < 25 && daysInactive > 14) {
    riskFactors.push('Pacing lag: progress under 25% with ongoing enrolment');
  }

  let calculatedRisk: 'low' | 'medium' | 'high' = 'low';
  if (isManualFlag || riskFactors.length >= 2 || (assessment && assessment.total > 0 && assessment.competent === 0)) {
    calculatedRisk = 'high';
  } else if (riskFactors.length === 1) {
    calculatedRisk = 'medium';
  }

  return {
    id: e.id,
    userId: e.learnerId,
    name: `${e.learner.firstName} ${e.learner.lastName}`.trim(),
    email: e.learner.email,
    idNumber: meta.idNumber ?? '—',
    phone: meta.phone ?? undefined,
    programmeId: e.programmeId,
    programmeName: e.programme.title,
    nqfLevel: q ? `Level ${q.nqfLevel} NQF` : '—',
    progress: progressVal,
    setaStatus: (meta.setaStatus as 'compliant' | 'pending') ?? 'pending',
    enrollmentDate: started.toISOString().slice(0, 10),
    expectedCompletionDate:
      meta.expectedCompletionDate ??
      e.programme.endDate?.toISOString().slice(0, 10) ?? '—',
    status: deriveUiStatus(e.status, meta),
    academicRisk: calculatedRisk,
    isManualRiskFlag: isManualFlag,
    riskFactors,
    riskSource: isManualFlag ? 'manual_flag' : riskFactors.length > 0 ? 'calculated_evidence' : 'nominal',
    assessmentTotal: assessment?.total ?? 0,
    assessmentCompetent: assessment?.competent ?? 0,
    lastActivity: meta.lastActivity ?? e.updatedAt.toISOString(),
    lastActivityDescription:
      meta.lastActivityDescription ?? 'No activity description recorded',
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
