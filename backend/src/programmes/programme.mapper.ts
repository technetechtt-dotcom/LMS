import type {
  Organisation,
  Programme,
  ProgrammeModule,
  Qualification,
  FacilitatorAssignment,
} from '@prisma/client';
import { OrganisationType } from '@prisma/client';

export type ProgrammeWithRelations = Programme & {
  qualification: Qualification | null;
  organisation: Organisation | null;
  modules?: ProgrammeModule[];
  facilitatorAssignments?: FacilitatorAssignment[];
  enrollments?: Array<{ status: string; completedAt: Date | null }>;
  _count?: { enrollments: number };
};

/** Maps DB programme → frontend `Programme` contract */
export function mapProgrammeToApi(p: ProgrammeWithRelations): Record<string, unknown> {
  const q = p.qualification;
  const nqf = q?.nqfLevel ?? 4;
  const credits = q?.totalCredits ?? 120;
  const setaLabel =
    q?.seta?.trim() ||
    (p.organisation?.type === OrganisationType.SETA ? p.organisation.name : 'MICT SETA');

  const mappedModules = (p.modules ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    code: m.code,
    moduleType: m.moduleType,
    programmeId: m.programmeId,
    unitStandardId: m.unitStandardId,
    order: m.order,
    credits: m.credits,
    description: m.description ?? '',
    assessmentIds: [],
    materialIds: [],
    createdAt: m.createdAt.toISOString().slice(0, 10),
    updatedAt: m.updatedAt.toISOString().slice(0, 10),
  }));

  const facilitatorIds = (p.facilitatorAssignments ?? [])
    .filter((fa) => fa.isActive)
    .map((fa) => fa.facilitatorId);

  const totalEnrollments = p._count?.enrollments ?? (p.enrollments ? p.enrollments.length : 0);
  let completionRate = 0;
  if (p.enrollments && p.enrollments.length > 0) {
    const completed = p.enrollments.filter(
      (e) => e.status === 'COMPLETED' || Boolean(e.completedAt),
    ).length;
    completionRate = Math.round((completed / p.enrollments.length) * 100);
  }

  return {
    id: p.id,
    organisationId: p.organisationId,
    qualificationId: p.qualificationId,
    title: p.title,
    code: p.code,
    programmeKind: p.programmeKind,
    nqfLevel: nqf,
    credits,
    seta: setaLabel,
    status: p.status || 'draft',
    description: p.description?.trim() || q?.title || p.title,
    modules: mappedModules,
    facilitatorIds,
    learnerCount: totalEnrollments,
    completionRate,
    createdAt: p.createdAt.toISOString().slice(0, 10),
    updatedAt: p.updatedAt.toISOString().slice(0, 10),
  };
}
