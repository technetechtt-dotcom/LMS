import { AssessmentsService } from './assessments.service';

describe('AssessmentsService attempt refresh and resume', () => {
  const learner = {
    userId: 'learner-1',
    email: 'learner@example.com',
    organisationId: 'organisation-1',
    roleCodes: ['LEARNER'],
  };
  const assessment = {
    id: 'assessment-1',
    unitStandardId: 'unit-1',
    enrollmentId: 'enrollment-1',
    enrollment: { learnerId: 'learner-1' },
  };

  it('resumes the same attempt and reports an expired server-derived window', async () => {
    const createdAt = new Date(Date.now() - 61_000);
    const open = {
      id: 'attempt-1',
      createdAt,
      instrument: { timeLimitMinutes: 1 },
    };
    const prisma = {
      assessment: { findFirst: jest.fn().mockResolvedValue(assessment) },
      assessmentSubmission: { findFirst: jest.fn().mockResolvedValue(open) },
      assessmentInstrument: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new AssessmentsService(prisma as never);

    const resumed = await service.startAttempt('assessment-1', learner);
    expect(resumed).toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        timeLimitMinutes: 1,
        expired: true,
      }),
    );
    expect(prisma.assessmentSubmission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { instrument: { select: { timeLimitMinutes: true } } },
      }),
    );
  });

  it('creates an untimed attempt without inventing a countdown', async () => {
    const createdAt = new Date();
    const create = jest.fn().mockResolvedValue({ id: 'attempt-2', createdAt });
    const service = new AssessmentsService({
      assessment: { findFirst: jest.fn().mockResolvedValue(assessment) },
      assessmentSubmission: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create,
      },
      assessmentInstrument: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'instrument-1',
          maxAttempts: 2,
          timeLimitMinutes: null,
        }),
      },
    } as never);

    const started = await service.startAttempt('assessment-1', learner);
    expect(started).toEqual(
      expect.objectContaining({
        id: 'attempt-2',
        expiresAt: null,
        timeLimitMinutes: null,
        expired: false,
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptNumber: 1, status: 'in_progress' }),
      }),
    );
  });

  it('enforces maximum attempts before creating another', async () => {
    const create = jest.fn();
    const service = new AssessmentsService({
      assessment: { findFirst: jest.fn().mockResolvedValue(assessment) },
      assessmentSubmission: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(2),
        create,
      },
      assessmentInstrument: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'instrument-1',
          maxAttempts: 2,
          timeLimitMinutes: 30,
        }),
      },
    } as never);

    await expect(service.startAttempt('assessment-1', learner)).rejects.toThrow(
      'Maximum attempts',
    );
    expect(create).not.toHaveBeenCalled();
  });
});
