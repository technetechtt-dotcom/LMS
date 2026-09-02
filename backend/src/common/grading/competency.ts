/** Server-authoritative C/NYC from graded percentage and instrument pass mark. */
export function competencyFromPercentage(
  percentage: number,
  passMark = 50,
): 'C' | 'NYC' {
  if (!Number.isFinite(percentage)) return 'NYC';
  return percentage >= passMark ? 'C' : 'NYC';
}
