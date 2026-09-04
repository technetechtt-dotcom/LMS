import {
  choicesFromOptions,
  correctIndexFromOptions,
  trueFalseCorrect,
} from '../assessment-instruments/instrument-options';

export type ResponseInput = {
  questionId: string;
  questionType?: string;
  answer?: unknown;
};

export type BankQuestion = {
  id: string;
  points: number;
  options: unknown;
};

export type GradedResponse = ResponseInput & {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  omitted: boolean;
};

function scoreOne(q: BankQuestion | undefined, answer: unknown): {
  score: number;
  isCorrect: boolean;
} {
  if (!q) return { score: 0, isCorrect: false };
  const max = q.points ?? 1;
  const opts = (q.options as Record<string, unknown> | null) ?? {};
  const choices = choicesFromOptions(q.options);
  if (typeof opts.correctIndex === 'number' || choices.length > 0) {
    const correctIndex = correctIndexFromOptions(q.options);
    const answerIdx =
      typeof answer === 'number'
        ? answer
        : typeof answer === 'string' && /^\d+$/.test(answer)
          ? Number(answer)
          : choices.indexOf(String(answer));
    const isCorrect = answerIdx === correctIndex;
    return { score: isCorrect ? max : 0, isCorrect };
  }
  if (opts.correctAnswer != null || opts.correct != null) {
    const expected = trueFalseCorrect(q.options);
    const normalized =
      typeof answer === 'string' ? answer.trim().toLowerCase() : undefined;
    const given =
      typeof answer === 'boolean'
        ? answer
        : normalized === 'true'
          ? true
          : normalized === 'false'
            ? false
            : undefined;
    const isCorrect = given !== undefined && given === expected;
    return { score: isCorrect ? max : 0, isCorrect };
  }
  return { score: 0, isCorrect: false };
}

/**
 * One response per required instrument question.
 * Omitted questions score 0 and still count in the denominator.
 * Extra / duplicate questionIds are ignored (last unique id wins).
 */
export function gradeAgainstInstrument(
  questions: BankQuestion[],
  responses: ResponseInput[],
): {
  graded: GradedResponse[];
  totalScore: number;
  maxScore: number;
  percentage: number;
} {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const unique = new Map<string, ResponseInput>();
  for (const r of responses) {
    if (!r.questionId || !byId.has(r.questionId)) continue;
    unique.set(r.questionId, r);
  }

  const graded: GradedResponse[] = questions.map((q) => {
    const r = unique.get(q.id);
    const omitted = r == null || r.answer == null || r.answer === '';
    const { score, isCorrect } = omitted
      ? { score: 0, isCorrect: false }
      : scoreOne(q, r.answer);
    return {
      questionId: q.id,
      questionType: r?.questionType,
      answer: omitted ? null : r?.answer,
      score,
      maxScore: q.points ?? 1,
      isCorrect,
      omitted,
    };
  });

  const totalScore = graded.reduce((s, r) => s + r.score, 0);
  const maxScore = graded.reduce((s, r) => s + r.maxScore, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  return { graded, totalScore, maxScore, percentage };
}
