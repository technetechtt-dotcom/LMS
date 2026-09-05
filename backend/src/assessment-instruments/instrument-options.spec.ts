import {
  choicesFromOptions,
  correctIndexFromOptions,
  isObjectiveQuestionType,
  trueFalseCorrect,
} from './instrument-options';

describe('instrument-options', () => {
  it('parses string[] and {choices} option formats', () => {
    expect(choicesFromOptions(['a', 'b'])).toEqual(['a', 'b']);
    expect(choicesFromOptions({ choices: ['x', 'y'], correctIndex: 1 })).toEqual(
      ['x', 'y'],
    );
    expect(
      choicesFromOptions([{ text: 'One' }, { text: 'Two', isCorrect: true }]),
    ).toEqual(['One', 'Two']);
  });

  it('reads correctIndex from stored JSON or isCorrect flags', () => {
    expect(correctIndexFromOptions({ choices: ['a', 'b'], correctIndex: 1 })).toBe(
      1,
    );
    expect(
      correctIndexFromOptions([{ text: 'a' }, { text: 'b', isCorrect: true }]),
    ).toBe(1);
  });

  it('normalises true/false correctAnswer and correct fields', () => {
    expect(trueFalseCorrect({ correct: true })).toBe(true);
    expect(trueFalseCorrect({ correctAnswer: false })).toBe(false);
    expect(trueFalseCorrect({ correct: 'true' })).toBe(true);
    expect(trueFalseCorrect(undefined, false)).toBe(false);
  });

  it('classifies objective question types', () => {
    expect(isObjectiveQuestionType('mcq_single')).toBe(true);
    expect(isObjectiveQuestionType('true_false')).toBe(true);
    expect(isObjectiveQuestionType('long_answer')).toBe(false);
    expect(isObjectiveQuestionType('file_upload')).toBe(false);
  });
});
