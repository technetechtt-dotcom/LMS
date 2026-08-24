import {
  isLearnerOnly,
  isPlatformAdmin,
  resolveRoleCodesForTenant,
} from '../tenant/tenant-scope';

describe('tenant role resolution', () => {
  it('does not leak ADMIN from another organisation', () => {
    const codes = resolveRoleCodesForTenant({
      organisationRoleCodes: ['LEARNER'],
      isPlatformAdmin: false,
    });
    expect(codes).toEqual(['LEARNER']);
    expect(isLearnerOnly({ userId: 'u', email: 'x', roleCodes: codes })).toBe(
      true,
    );
  });

  it('keeps PLATFORM_ADMIN globally while using org roles', () => {
    const codes = resolveRoleCodesForTenant({
      organisationRoleCodes: ['LEARNER'],
      isPlatformAdmin: true,
    });
    expect(codes).toEqual(expect.arrayContaining(['LEARNER', 'PLATFORM_ADMIN']));
    expect(isPlatformAdmin({ userId: 'u', email: 'x', roleCodes: codes })).toBe(
      true,
    );
  });
});
