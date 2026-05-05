import type { Organisation, Programme, Qualification } from '@prisma/client';
import { OrganisationType } from '@prisma/client';

export type ProgrammeWithRelations = Programme & {
  qualification: Qualification | null;
  organisation: Organisation | null;
  _count?: { enrollments: number };
};

/** Maps DB programme → frontend `Programme` contract */
export function mapProgrammeToApi(p: ProgrammeWithRelations): Record<string, unknown> {
  const q = p.qualification;
  const nqf = q?.nqfLevel ?? 4;
  const credits = q?.totalCredits ?? 120;
  const setaLabel =
    p.organisation?.type === OrganisationType.SETA
      ? p.organisation.name
      : 'MICT SETA';

  return {
    id: p.id,
    organisationId: p.organisationId,
    title: p.title,
    code: p.code,
    programmeKind: p.programmeKind,
    nqfLevel: nqf,
    credits,
    seta: setaLabel,
    status: 'active',
    description: q?.title ?? p.title,
    modules: [],
    facilitatorIds: [],
    learnerCount: p._count?.enrollments ?? 0,
    completionRate: 72,
    createdAt: p.createdAt.toISOString().slice(0, 10),
    updatedAt: p.updatedAt.toISOString().slice(0, 10),
  };
}
