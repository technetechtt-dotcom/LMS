import {
  assertAllocatedAssessor,
  enrollmentOrgWhere,
  isLearnerOnly,
  isPlatformAdmin,
  isStaffUser,
  readOrganisationHeader,
  requireOrganisationId,
} from './tenant-scope';
import type { AuthUser } from '../types/request-with-user';

describe('tenant-scope', () => {
  const learner: AuthUser = {
    userId: 'u1',
    email: 'l@x.com',
    organisationId: 'org1',
    roleCodes: ['LEARNER'],
  };
  const staff: AuthUser = {
    userId: 'u2',
    email: 'a@x.com',
    organisationId: 'org1',
    roleCodes: ['FACILITATOR', 'LEARNER'],
  };
  const admin: AuthUser = {
    userId: 'u3',
    email: 'admin@x.com',
    organisationId: 'org1',
    roleCodes: ['ADMIN'],
  };
  const platform: AuthUser = {
    userId: 'u4',
    email: 'plat@x.com',
    organisationId: 'org1',
    roleCodes: ['PLATFORM_ADMIN'],
  };

  it('reads organisation header aliases', () => {
    expect(readOrganisationHeader({ 'x-organisation-id': 'abc' })).toBe('abc');
    expect(readOrganisationHeader({ 'x-tenant-id': 't1' })).toBe('t1');
  });

  it('requires organisation id', () => {
    expect(() =>
      requireOrganisationId({ ...learner, organisationId: undefined }),
    ).toThrow();
    expect(requireOrganisationId(learner)).toBe('org1');
  });

  it('classifies learner-only vs staff', () => {
    expect(isLearnerOnly(learner)).toBe(true);
    expect(isStaffUser(learner)).toBe(false);
    expect(isLearnerOnly(staff)).toBe(false);
    expect(isStaffUser(staff)).toBe(true);
  });

  it('PLATFORM_ADMIN is platform; org ADMIN is not', () => {
    expect(isPlatformAdmin(platform)).toBe(true);
    expect(isPlatformAdmin(admin)).toBe(false);
  });

  it('enrollmentOrgWhere includes programme org', () => {
    const w = enrollmentOrgWhere('org1');
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { sdioOrganisationId: 'org1' },
        { programme: { organisationId: 'org1' } },
      ]),
    );
  });

  it('allocated assessor gate allows admin override only', () => {
    expect(() =>
      assertAllocatedAssessor(
        { userId: 'u5', email: 'a@x', organisationId: 'org1', roleCodes: ['ASSESSOR'] },
        'other',
      ),
    ).toThrow();
    expect(() => assertAllocatedAssessor(admin, 'other')).not.toThrow();
  });
});
