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
