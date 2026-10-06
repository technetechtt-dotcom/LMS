import { redactAuditValue } from './audit-redact';

describe('audit redaction', () => {
  it('redacts password and email keys', () => {
    const out = redactAuditValue({
      email: 'a@b.c',
      passwordHash: 'x',
      ok: 1,
    }) as Record<string, unknown>;
    expect(out.email).toBe('[redacted]');
    expect(out.passwordHash).toBe('[redacted]');
    expect(out.ok).toBe(1);
  });

  it('serializes Date and toJSON objects and excludes functions/constructors', () => {
    const fakeDecimal = {
      constructor: function Decimal() {},
      s: 1,
      e: 0,
      d: [8],
      toJSON: () => '8.00',
    };
    const date = new Date('2026-10-06T12:00:00.000Z');
    const out = redactAuditValue({
      createdAt: date,
      hoursWorked: fakeDecimal,
      fn: () => true,
    }) as Record<string, unknown>;

    expect(out.createdAt).toBe('2026-10-06T12:00:00.000Z');
    expect(out.hoursWorked).toBe('8.00');
    expect(out.fn).toBeUndefined();
  });
});

