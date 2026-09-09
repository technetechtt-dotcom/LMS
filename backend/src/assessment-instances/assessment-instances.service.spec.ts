import { AssessmentInstancesService } from './assessment-instances.service';

describe('AssessmentInstancesService.autoGrade', () => {
  const service = new AssessmentInstancesService({} as never);

  it('ignores client-supplied score fields', () => {
    const tampered = {
      questionId: 'q1',
      answer: 'hello',
      score: 999,
      isCorrect: true,
      maxScore: 50,
    };
    const graded = service.autoGrade([
      tampered as { questionId: string; answer?: unknown },
    ]);
    expect(graded[0].score).toBe(0);
    expect(graded[0].maxScore).toBe(1);
    expect(graded[0].isCorrect).toBe(false);
  });
});

describe('AssessmentInstancesService.uploadAnswerFile', () => {
  it('only looks up in-progress attempts', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new AssessmentInstancesService(
      { assessmentSubmission: { findFirst } } as never,
      { upload: jest.fn() } as never,
    );

    await expect(
      service.uploadAnswerFile(
        'submission-1',
        'question-1',
        {
          originalname: 'answer.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('answer'),
        } as Express.Multer.File,
        {
          userId: 'learner-1',
          email: 'learner@example.com',
          organisationId: 'organisation-1',
          roleCodes: ['LEARNER'],
        },
      ),
    ).rejects.toThrow('Submission not found');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'in_progress' }),
      }),
    );
  });

  it('rejects file uploads after a timed attempt expires without storing bytes', async () => {
    const upload = jest.fn();
    const service = new AssessmentInstancesService(
      {
        assessmentSubmission: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'submission-1',
            createdAt: new Date(Date.now() - 2 * 60_000),
            responses: [],
            enrollment: { learnerId: 'learner-1' },
            instrument: {
              timeLimitMinutes: 1,
              questions: [{ questionType: 'file_upload' }],
            },
          }),
        },
      } as never,
      { upload } as never,
    );

    await expect(
      service.uploadAnswerFile(
        'submission-1',
        'question-1',
        {
          originalname: 'answer.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('answer'),
        } as Express.Multer.File,
        {
          userId: 'learner-1',
          email: 'learner@example.com',
          organisationId: 'organisation-1',
          roleCodes: ['LEARNER'],
        },
      ),
    ).rejects.toThrow('Assessment time has expired');
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('AssessmentInstancesService.saveProgress expiry enforcement', () => {
  const learner = {
    userId: 'learner-1',
    email: 'learner@example.com',
    organisationId: 'organisation-1',
    roleCodes: ['LEARNER'],
  };

  it('rejects autosave after expiry and performs no mutation', async () => {
    const update = jest.fn();
    const service = new AssessmentInstancesService({
      assessmentSubmission: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'submission-1',
          createdAt: new Date(Date.now() - 61_000),
          enrollment: { learnerId: 'learner-1' },
          instrument: { timeLimitMinutes: 1 },
        }),
        update,
      },
    } as never);

    await expect(
      service.saveProgress('submission-1', [], learner),
    ).rejects.toThrow('Assessment time has expired');
    expect(update).not.toHaveBeenCalled();
  });

  it('allows an untimed attempt to be saved and strips client score fields', async () => {
    const createdAt = new Date();
    const update = jest.fn().mockImplementation(({ data }) => ({
      id: 'submission-1',
      enrollmentId: 'enrollment-1',
      assessmentId: 'assessment-1',
      status: 'in_progress',
      responses: data.responses,
      score: null,
      percentage: null,
      feedback: null,
      submittedAt: null,
      gradedAt: null,
      createdAt,
      updatedAt: createdAt,
      enrollment: { learner: { firstName: 'Test', lastName: 'Learner' } },
      assessment: { unitStandard: { title: 'Unit standard' } },
    }));
    const service = new AssessmentInstancesService({
      assessmentSubmission: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'submission-1',
          createdAt,
          enrollment: { learnerId: 'learner-1' },
          instrument: { timeLimitMinutes: null },
        }),
        update,
      },
    } as never);

    await expect(
      service.saveProgress(
        'submission-1',
        [{ questionId: 'q1', answer: 'response', score: 999 }],
        learner,
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'submission-1' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          responses: [{ questionId: 'q1', questionType: undefined, answer: 'response' }],
        },
      }),
    );
  });
});
