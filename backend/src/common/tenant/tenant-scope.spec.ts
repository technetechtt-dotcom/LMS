import {
  assertAllocatedAssessor,
  assertAllocatedModerator,
  assessmentActorWhere,
  assertEnrollmentAccess,
  canAssessorReview,
  canFacilitatorMark,
  canModerateSubmission,
  enrollmentActorWhere,
  enrollmentOrgWhere,
  isLearnerOnly,
  isMentorOnly,
  isPlatformAdmin,
  isStaffUser,
  poeArtifactActorWhere,
  readOrganisationHeader,
  requireOrganisationId,
  resolveRoleCodesForTenant,
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
    expect(readOrganisationHeader({ 'x-org-id': ['org-array', 'ignored'] })).toBe('org-array');
    expect(readOrganisationHeader({})).toBeUndefined();
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
    expect(isLearnerOnly(undefined)).toBe(false);
    expect(isStaffUser(undefined)).toBe(false);
  });

  it('derives tenant roles without accepting a client-supplied platform role', () => {
    expect(resolveRoleCodesForTenant({
      organisationRoleCodes: ['LEARNER', '', 'LEARNER'],
      isPlatformAdmin: false,
    })).toEqual(['LEARNER']);
    expect(resolveRoleCodesForTenant({
      organisationRoleCodes: ['ADMIN'],
      isPlatformAdmin: true,
    })).toEqual(['ADMIN', 'PLATFORM_ADMIN']);
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

  it('scopes mentor-only users to their allocated learners', () => {
    const mentor: AuthUser = {
      userId: 'mentor-1',
      email: 'mentor@example.com',
      organisationId: 'org1',
      roleCodes: ['MENTOR'],
    };
    expect(isMentorOnly(mentor)).toBe(true);
    expect(isMentorOnly({ ...mentor, roleCodes: ['MENTOR', 'ADMIN'] })).toBe(false);
    expect(enrollmentActorWhere(mentor)).toEqual({
      metadata: { path: ['workplaceMentorId'], equals: 'mentor-1' },
    });
    expect(() =>
      assertEnrollmentAccess(
        mentor,
        { learnerId: 'learner-1', metadata: { workplaceMentorId: 'other' } },
        'Document',
      ),
    ).toThrow('Document access denied');
    expect(() =>
      assertEnrollmentAccess(
        mentor,
        { learnerId: 'learner-1', metadata: { workplaceMentorId: 'mentor-1' } },
      ),
    ).not.toThrow();
  });

  it('scopes learner-only actors and rejects missing enrollment context', () => {
    expect(enrollmentActorWhere(learner)).toEqual({ learnerId: 'u1' });
    expect(enrollmentActorWhere(admin)).toEqual({});
    expect(() => assertEnrollmentAccess(learner, null)).toThrow('Resource not found');
    expect(() =>
      assertEnrollmentAccess(learner, { learnerId: 'another' }),
    ).toThrow('Resource access denied');
    expect(() =>
      assertEnrollmentAccess(learner, { learnerId: 'u1' }),
    ).not.toThrow();
  });

  it('scopes assessors, moderators and SETA officials to explicit responsibilities', () => {
    expect(assessmentActorWhere({ ...staff, userId: 'a1', roleCodes: ['ASSESSOR'] }))
      .toEqual({ AND: [{ OR: [{ assessorId: 'a1' }] }] });
    expect(assessmentActorWhere({ ...staff, userId: 'm1', roleCodes: ['MODERATOR'] }))
      .toEqual({ AND: [{ OR: [{ moderatorId: 'm1' }] }] });
    expect(enrollmentActorWhere({ ...staff, userId: 's1', roleCodes: ['SETA'] }))
      .toEqual({
        AND: [{
          OR: [{
            programme: {
              metadata: { path: ['setaOfficialIds'], array_contains: 's1' },
            },
          }],
        }],
      });
    expect(enrollmentActorWhere(undefined)).toEqual({ id: '__no_authenticated_actor__' });
    expect(assessmentActorWhere(platform)).toEqual({});
    expect(assessmentActorWhere({ ...staff, userId: 's1', roleCodes: ['SETA'] }))
      .toEqual({ AND: [{ OR: [{ enrollment: { programme: { metadata: {
        path: ['setaOfficialIds'], array_contains: 's1',
      } } } }] }] });
  });

  it('scopes PoE responsibility for assessor, moderator, mentor and SETA roles', () => {
    const actor = (userId: string, roleCodes: string[]): AuthUser => ({
      userId,
      email: `${userId}@example.test`,
      organisationId: 'org1',
      roleCodes,
    });
    expect(poeArtifactActorWhere(actor('a1', ['ASSESSOR']))).toEqual({
      AND: [{ OR: [{ assessorId: 'a1' }] }],
    });
    expect(poeArtifactActorWhere(actor('m1', ['MODERATOR']))).toEqual({
      AND: [{ OR: [{ moderatorId: 'm1' }] }],
    });
    expect(poeArtifactActorWhere(actor('mentor1', ['MENTOR']))).toEqual({
      AND: [{ OR: [{ enrollment: { metadata: {
        path: ['workplaceMentorId'], equals: 'mentor1',
      } } }] }],
    });
    expect(poeArtifactActorWhere(actor('s1', ['SETA']))).toEqual({
      AND: [{ OR: [{ enrollment: { programme: { metadata: {
        path: ['setaOfficialIds'], array_contains: 's1',
      } } } }] }],
    });
    expect(poeArtifactActorWhere(admin)).toEqual({});
  });

  it('never permits moderator allocation bypass, including admins', () => {
    expect(() => assertAllocatedModerator(admin, null)).toThrow('No moderator');
    expect(() => assertAllocatedModerator(admin, 'another')).toThrow('allocated moderator');
    expect(() => assertAllocatedModerator({ ...admin, userId: 'assigned' }, 'assigned')).not.toThrow();
  });

  it('separates facilitator, assessor and moderator capabilities', () => {
    expect(canFacilitatorMark(staff)).toBe(true);
    expect(canFacilitatorMark(learner)).toBe(false);
    expect(canAssessorReview({ ...staff, roleCodes: ['ASSESSOR'] })).toBe(true);
    expect(canAssessorReview(learner)).toBe(false);
    expect(canModerateSubmission({ ...staff, roleCodes: ['MODERATOR'] })).toBe(true);
    expect(canModerateSubmission({ ...staff, roleCodes: ['QA_OFFICER'] })).toBe(true);
    expect(canModerateSubmission(learner)).toBe(false);
  });
});
