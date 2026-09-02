/** Derive SAQA competency outcome from scored percentage and pass mark. */
export function competencyFromScore(
  earned: number,
  total: number,
  passMarkPercent = 50,
): 'C' | 'NYC' {
  if (total <= 0) return 'NYC';
  const pct = (earned / total) * 100;
  return pct >= passMarkPercent ? 'C' : 'NYC';
}

export function formatAnswerDisplay(answer: unknown): string {
  if (answer === null || answer === undefined) return '—';
  if (typeof answer === 'boolean') return answer ? 'True' : 'False';
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'object') return JSON.stringify(answer);
  return String(answer);
}
