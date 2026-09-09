import {
  assessmentAttemptWindow,
  assertAssessmentAttemptOpen,
  normalizedTimeLimit,
} from './attempt-window';

describe('authoritative assessment attempt timing', () => {
  const started = new Date('2026-01-01T00:00:00.000Z');

  it.each([undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats %s as untimed without inventing an expiry',
    (minutes) => {
      expect(normalizedTimeLimit(minutes)).toBe(0);
      expect(assessmentAttemptWindow(started, minutes, started.getTime() + 999_999)).toEqual({
        startedAt: started.toISOString(),
        expiresAt: null,
        timeLimitMinutes: null,
        expired: false,
      });
      expect(() => assertAssessmentAttemptOpen(
        started, minutes, started.getTime() + 999_999,
      )).not.toThrow();
    },
  );

  it('reports an active timed window before the exact server deadline', () => {
    expect(assessmentAttemptWindow(started, 30, started.getTime() + 29 * 60_000))
      .toEqual({
        startedAt: started.toISOString(),
        expiresAt: '2026-01-01T00:30:00.000Z',
        timeLimitMinutes: 30,
        expired: false,
      });
    expect(() => assertAssessmentAttemptOpen(
      started, 30, started.getTime() + 29 * 60_000,
    )).not.toThrow();
  });

  it('rejects saves, uploads and submissions at the exact deadline', () => {
    const deadline = started.getTime() + 30 * 60_000;
    expect(assessmentAttemptWindow(started, 30, deadline).expired).toBe(true);
    expect(() => assertAssessmentAttemptOpen(started, 30, deadline))
      .toThrow('Assessment time has expired');
    expect(() => assertAssessmentAttemptOpen(started, 30, deadline + 1))
      .toThrow('Assessment time has expired');
  });
});
