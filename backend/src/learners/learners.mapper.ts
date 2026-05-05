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
  const progress = typeof meta.progress === 'number' ? meta.progress : 45;
  if (meta.atRisk === true || progress < 50) return 'at_risk';
  return 'active';
}

export function mapEnrollmentToLearnerApi(
  e: EnrollmentWithRelations,
  assessment?: { total: number; competent: number },
): Record<string, unknown> {
  const meta = (e.metadata as LearnerMeta | null) ?? {};
  const q = e.programme.qualification;
  const started = e.startedAt ?? e.createdAt;

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
    progress:
      typeof meta.progress === 'number'
        ? meta.progress
        : e.status === 'COMPLETED'
          ? 100
          : 45,
    setaStatus: (meta.setaStatus as 'compliant' | 'pending') ?? 'compliant',
    enrollmentDate: started.toISOString().slice(0, 10),
    expectedCompletionDate:
      meta.expectedCompletionDate ??
      new Date(started.getTime() + 365 * 86400000).toISOString().slice(0, 10),
    status: deriveUiStatus(e.status, meta),
    assessmentTotal: assessment?.total ?? 0,
    assessmentCompetent: assessment?.competent ?? 0,
    lastActivity: meta.lastActivity ?? 'Recently',
    lastActivityDescription:
      meta.lastActivityDescription ?? 'Activity synced from enrolment',
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
