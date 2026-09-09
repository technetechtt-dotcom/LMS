import { ModerationService } from './moderation.service';

describe('ModerationService immutable rounds', () => {
  const moderator = {
    userId: 'moderator-1',
    email: 'moderator@example.com',
    organisationId: 'organisation-1',
    roleCodes: ['MODERATOR'],
  };
  const assessment = {
    id: 'assessment-1',
    result: 'C',
    moderatorId: 'moderator-1',
    submissions: [{ status: 'assessor_verified' }],
  };

  it('updates only an undecided allocation round', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'round-1', decision: 'APPROVED' });
    const create = jest.fn();
    const service = new ModerationService({
      assessment: { findFirst: jest.fn().mockResolvedValue(assessment) },
      moderation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'round-1',
          round: 1,
          moderatorId: 'moderator-1',
          decision: 'PENDING',
          trail: [],
        }),
        update,
        create,
      },
    } as never);
    await service.create({
      assessmentId: 'assessment-1',
      decision: 'APPROVED',
      feedback: 'Sample accepted',
      sampledRecordIds: ['submission-1'],
    }, moderator);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'round-1' } }));
    expect(create).not.toHaveBeenCalled();
  });

  it('preserves a decided round and creates a linked superseding correction', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'round-2', round: 2 });
    const update = jest.fn();
    const service = new ModerationService({
      assessment: { findFirst: jest.fn().mockResolvedValue(assessment) },
      moderation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'round-1',
          round: 1,
          moderatorId: 'moderator-1',
          decision: 'REJECTED',
          trail: [{ action: 'decision_recorded' }],
        }),
        update,
        create,
      },
    } as never);
    await service.create({
      assessmentId: 'assessment-1',
      decision: 'APPROVED',
      feedback: 'Correction approved',
      sampledRecordIds: ['submission-2'],
    }, moderator);
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        round: 2,
        previousOutcome: 'REJECTED',
        supersedesId: 'round-1',
        submittedVersion: 1,
        sampledRecords: ['submission-2'],
        moderatorId: 'moderator-1',
      }),
    });
  });

  it('never lets an unallocated moderator decide a round', async () => {
    const service = new ModerationService({
      assessment: { findFirst: jest.fn().mockResolvedValue(assessment) },
      moderation: { findFirst: jest.fn() },
    } as never);
    await expect(service.create({
      assessmentId: 'assessment-1',
      decision: 'APPROVED',
    }, { ...moderator, userId: 'other-moderator' })).rejects.toThrow(
      'allocated moderator',
    );
  });
});
