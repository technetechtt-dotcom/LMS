/** Lightweight frontend unit coverage for compliance schedule helpers. */
import { describe, expect, it } from 'vitest';

function isOpenSchedule(row: {
  kind?: string;
  lifecycleStatus?: string;
  status: string;
}) {
  return (
    Boolean(row.kind) &&
    !['COMPLETED', 'CANCELLED'].includes(String(row.lifecycleStatus ?? '').toUpperCase()) &&
    !['completed', 'cancelled'].includes(row.status.toLowerCase())
  );
}

describe('isOpenSchedule', () => {
  it('accepts open audit and submission schedules', () => {
    expect(
      isOpenSchedule({
        kind: 'AUDIT',
        lifecycleStatus: 'SCHEDULED',
        status: 'scheduled',
      }),
    ).toBe(true);
    expect(
      isOpenSchedule({
        kind: 'SUBMISSION',
        lifecycleStatus: 'REMINDED',
        status: 'upcoming',
      }),
    ).toBe(true);
  });

  it('rejects closed schedules and non-schedule rows', () => {
    expect(
      isOpenSchedule({
        kind: 'AUDIT',
        lifecycleStatus: 'COMPLETED',
        status: 'completed',
      }),
    ).toBe(false);
    expect(isOpenSchedule({ status: 'upcoming' })).toBe(false);
  });
});
