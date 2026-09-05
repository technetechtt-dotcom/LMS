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
});
