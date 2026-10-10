import { BadRequestException } from '@nestjs/common';

type CohortClient = {
  cohort: {
    findFirst: (args: {
      where: {
        id: string;
        programmeId: string;
        organisationId: string;
        deletedAt: null;
        archivedAt: null;
      };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

export async function assertCohortForProgramme(
  db: CohortClient,
  cohortId: string | undefined | null,
  programmeId: string | undefined | null,
  organisationId: string,
): Promise<{ id: string } | null> {
  if (!cohortId) return null;
  if (!programmeId) {
    throw new BadRequestException(
      'A programme is required when assigning a cohort',
    );
  }
  const cohort = await db.cohort.findFirst({
    where: {
      id: cohortId,
      programmeId,
      organisationId,
      deletedAt: null,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!cohort) {
    throw new BadRequestException(
      'Selected cohort does not belong to this programme and organisation',
    );
  }
  return cohort;
}
