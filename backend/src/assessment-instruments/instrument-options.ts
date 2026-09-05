export function isObjectiveQuestionType(type: string): boolean {
  return [
    'mcq_single',
    'mcq',
    'true_false',
    'boolean',
    'multiple_choice',
  ].includes(type);
}

export function choicesFromOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map((o) =>
      typeof o === 'string'
        ? o
        : String((o as { text?: string }).text ?? ''),
    );
  }
  if (options && typeof options === 'object') {
    const rec = options as Record<string, unknown>;
    if (Array.isArray(rec.choices)) {
      return rec.choices.map((c) => String(c));
    }
  }
  return [];
}

export function correctIndexFromOptions(
  options: unknown,
  fallback = 0,
): number {
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    const rec = options as Record<string, unknown>;
    if (typeof rec.correctIndex === 'number') return rec.correctIndex;
  }
  if (Array.isArray(options)) {
    const idx = options.findIndex(
      (o) =>
        typeof o === 'object' &&
        o != null &&
        (o as { isCorrect?: boolean }).isCorrect === true,
    );
    if (idx >= 0) return idx;
  }
  return fallback;
}

export function trueFalseCorrect(
  options: unknown,
  explicit?: unknown,
): boolean {
  if (typeof explicit === 'boolean') return explicit;
  if (options && typeof options === 'object') {
    const rec = options as Record<string, unknown>;
    if (typeof rec.correctAnswer === 'boolean') return rec.correctAnswer;
    if (typeof rec.correct === 'boolean') return rec.correct;
    if (rec.correctAnswer != null) {
      return String(rec.correctAnswer).trim().toLowerCase() === 'true';
    }
    if (rec.correct != null) {
      return String(rec.correct).trim().toLowerCase() === 'true';
    }
  }
  return true;
}

export function storeMcqOptions(choices: string[], correctIndex: number) {
  return { choices, correctIndex };
}

export function storeTrueFalseOptions(correctAnswer: boolean) {
  return { correctAnswer, correct: correctAnswer };
}

export function mapQuestionForBuilder(q: {
  id: string;
  prompt: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options: unknown;
}) {
  const type =
    q.questionType === 'mcq_single' || q.questionType === 'mcq'
      ? 'multiple_choice'
      : q.questionType === 'true_false' || q.questionType === 'boolean'
        ? 'true_false'
        : q.questionType === 'file_upload'
          ? 'file_upload'
          : q.questionType === 'short_answer'
            ? 'short_answer'
            : 'essay';
  return {
    id: q.id,
    type,
    content: q.prompt,
    prompt: q.prompt,
    points: q.points,
    order: q.orderIndex,
    options: choicesFromOptions(q.options),
    correctIndex: correctIndexFromOptions(q.options),
    correctAnswer: trueFalseCorrect(q.options),
  };
}
