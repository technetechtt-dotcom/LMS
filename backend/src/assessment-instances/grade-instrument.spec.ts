import { gradeAgainstInstrument } from './grade-instrument';

describe('gradeAgainstInstrument', () => {
  const questions = [
    { id: 'q1', points: 2, options: { correctIndex: 0, choices: ['a', 'b'] } },
    { id: 'q2', points: 3, options: { correctAnswer: true } },
  ];

  it('counts omitted questions in the denominator', () => {
    const result = gradeAgainstInstrument(questions, [
      { questionId: 'q1', answer: 0 },
    ]);
    expect(result.maxScore).toBe(5);
    expect(result.totalScore).toBe(2);
    expect(result.percentage).toBe(40);
    expect(result.graded.find((g) => g.questionId === 'q2')?.omitted).toBe(true);
  });

  it('enforces one response per question (last wins)', () => {
    const result = gradeAgainstInstrument(questions, [
      { questionId: 'q1', answer: 1 },
      { questionId: 'q1', answer: 0 },
    ]);
    expect(result.graded.filter((g) => g.questionId === 'q1')).toHaveLength(1);
    expect(result.totalScore).toBe(2);
  });

  it('ignores answers for unknown question ids', () => {
    const result = gradeAgainstInstrument(questions, [
      { questionId: 'evil', answer: 0 },
      { questionId: 'q1', answer: 0 },
      { questionId: 'q2', answer: true },
    ]);
    expect(result.graded).toHaveLength(2);
    expect(result.percentage).toBe(100);
  });
});
