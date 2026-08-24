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
});
