import { BadRequestException } from '@nestjs/common';
import { assertCohortForProgramme } from './cohort-integrity';

describe('assertCohortForProgramme', () => {
  it('accepts a missing cohort id', async () => {
    const db = { cohort: { findFirst: jest.fn() } };
    await expect(
      assertCohortForProgramme(db, undefined, 'programme-1', 'org-1'),
    ).resolves.toBeNull();
    expect(db.cohort.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a cohort without a programme', async () => {
    const db = { cohort: { findFirst: jest.fn() } };
    await expect(
      assertCohortForProgramme(db, 'cohort-1', undefined, 'org-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a cohort that is not in the programme and organisation', async () => {
    const db = { cohort: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(
      assertCohortForProgramme(db, 'cohort-1', 'programme-1', 'org-1'),
    ).rejects.toThrow(
      'Selected cohort does not belong to this programme and organisation',
    );
    expect(db.cohort.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cohort-1',
        programmeId: 'programme-1',
        organisationId: 'org-1',
        deletedAt: null,
        archivedAt: null,
      },
      select: { id: true },
    });
  });

  it('returns the matching organisation-scoped cohort', async () => {
    const db = {
      cohort: { findFirst: jest.fn().mockResolvedValue({ id: 'cohort-1' }) },
    };
    await expect(
      assertCohortForProgramme(db, 'cohort-1', 'programme-1', 'org-1'),
    ).resolves.toEqual({ id: 'cohort-1' });
  });
});
