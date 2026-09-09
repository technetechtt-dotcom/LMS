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

  it('grades true/false using either correctAnswer or correct', () => {
    const withCorrect = gradeAgainstInstrument(
      [{ id: 'q2', points: 3, options: { correct: false } }],
      [{ questionId: 'q2', answer: false }],
    );
    expect(withCorrect.percentage).toBe(100);
    const mismatch = gradeAgainstInstrument(
      [{ id: 'q2', points: 3, options: { correctAnswer: true } }],
      [{ questionId: 'q2', answer: false }],
    );
    expect(mismatch.percentage).toBe(0);
  });

  it('does not coerce invalid answers to false', () => {
    const result = gradeAgainstInstrument(
      [{ id: 'q2', points: 3, options: { correctAnswer: false } }],
      [{ questionId: 'q2', answer: 'not-a-boolean' }],
    );
    expect(result.totalScore).toBe(0);
    expect(result.graded[0].isCorrect).toBe(false);
  });

  it('honours isCorrect flags in legacy option arrays', () => {
    const result = gradeAgainstInstrument(
      [
        {
          id: 'q1',
          points: 2,
          options: [
            { text: 'Wrong' },
            { text: 'Right', isCorrect: true },
          ],
        },
      ],
      [{ questionId: 'q1', answer: 1 }],
    );
    expect(result.percentage).toBe(100);
  });

  it('ignores unknown question ids', () => {
    const result = gradeAgainstInstrument(questions, [
      { questionId: 'evil', answer: 0 },
      { questionId: 'q1', answer: 0 },
      { questionId: 'q2', answer: true },
    ]);
    expect(result.graded).toHaveLength(2);
    expect(result.percentage).toBe(100);
  });

  it('accepts numeric strings and choice text without trusting client scores', () => {
    const numeric = gradeAgainstInstrument(
      [{ id: 'q1', points: 4, options: { correctIndex: 1, choices: ['No', 'Yes'] } }],
      [{ questionId: 'q1', answer: '1' }],
    );
    expect(numeric.totalScore).toBe(4);

    const text = gradeAgainstInstrument(
      [{ id: 'q1', points: 4, options: { correctIndex: 1, choices: ['No', 'Yes'] } }],
      [{ questionId: 'q1', answer: 'Yes' }],
    );
    expect(text.totalScore).toBe(4);
  });

  it('normalizes textual booleans and rejects unsupported text', () => {
    expect(gradeAgainstInstrument(
      [{ id: 'q', points: 1, options: { correctAnswer: true } }],
      [{ questionId: 'q', answer: ' TRUE ' }],
    ).percentage).toBe(100);
    expect(gradeAgainstInstrument(
      [{ id: 'q', points: 1, options: { correctAnswer: false } }],
      [{ questionId: 'q', answer: 'false' }],
    ).percentage).toBe(100);
    expect(gradeAgainstInstrument(
      [{ id: 'q', points: 1, options: { correctAnswer: true } }],
      [{ questionId: 'q', answer: 'yes' }],
    ).percentage).toBe(0);
  });

  it('returns zero for ungradable and zero-point instruments', () => {
    const result = gradeAgainstInstrument(
      [{ id: 'q', points: 0, options: null }],
      [{ questionId: 'q', answer: 'free text' }],
    );
    expect(result).toEqual(expect.objectContaining({
      totalScore: 0,
      maxScore: 0,
      percentage: 0,
    }));
  });
});
