import { isLearnerOnly, isPlatformAdmin, isStaffUser } from '../common/tenant/tenant-scope';
import { redactAuditValue } from '../audit/audit-redact';

describe('authorization matrix helpers', () => {
  const learner = {
    userId: 'l',
    email: 'l@x',
    organisationId: 'orgA',
    roleCodes: ['LEARNER'],
  };
  const orgAdmin = {
    userId: 'a',
    email: 'a@x',
    organisationId: 'orgA',
    roleCodes: ['ADMIN'],
  };
  const platform = {
    userId: 'p',
    email: 'p@x',
    organisationId: 'orgA',
    roleCodes: ['PLATFORM_ADMIN'],
  };

  it('learner cannot be treated as staff or platform admin', () => {
    expect(isLearnerOnly(learner)).toBe(true);
    expect(isStaffUser(learner)).toBe(false);
    expect(isPlatformAdmin(learner)).toBe(false);
  });

  it('org ADMIN is staff but not platform admin', () => {
    expect(isStaffUser(orgAdmin)).toBe(true);
    expect(isPlatformAdmin(orgAdmin)).toBe(false);
  });

  it('redacts secrets from audit payloads', () => {
    const redacted = redactAuditValue({
      password: 'secret',
      token: 'abc',
      nested: { idNumber: '8001015009087' },
    }) as Record<string, unknown>;
    expect(redacted.password).toBe('[redacted]');
    expect(redacted.token).toBe('[redacted]');
    expect((redacted.nested as { idNumber: string }).idNumber).toBe('[redacted]');
  });
});
