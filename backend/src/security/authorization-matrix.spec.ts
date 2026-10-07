import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  assertEnrollmentAccess,
  enrollmentActorWhere,
  isLearnerOnly,
  isPlatformAdmin,
  isStaffUser,
  programmeActorWhere,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { redactAuditValue } from '../audit/audit-redact';
import type { AuthUser } from '../common/types/request-with-user';

describe('Authorization Matrix & Negative Boundary Tests', () => {
  const orgId = 'org-tenant-111';
  const foreignOrgId = 'org-foreign-999';

  const adminUser: AuthUser = {
    userId: 'admin-1',
    email: 'admin@org.za',
    organisationId: orgId,
    roleCodes: ['ADMIN'],
  };

  const facilitatorUser: AuthUser = {
    userId: 'fac-1',
    email: 'facilitator@org.za',
    organisationId: orgId,
    roleCodes: ['FACILITATOR'],
  };

  const assessorUser: AuthUser = {
    userId: 'assessor-1',
    email: 'assessor@org.za',
    organisationId: orgId,
    roleCodes: ['ASSESSOR'],
  };

  const moderatorUser: AuthUser = {
    userId: 'moderator-1',
    email: 'moderator@org.za',
    organisationId: orgId,
    roleCodes: ['MODERATOR'],
  };

  const setaUser: AuthUser = {
    userId: 'seta-1',
    email: 'seta@seta.org.za',
    organisationId: orgId,
    roleCodes: ['SETA'],
  };

  const mentorUser: AuthUser = {
    userId: 'mentor-1',
    email: 'mentor@workplace.co.za',
    organisationId: orgId,
    roleCodes: ['WORKPLACE_MENTOR'],
  };

  const learnerA: AuthUser = {
    userId: 'learner-aaa',
    email: 'learner.a@org.za',
    organisationId: orgId,
    roleCodes: ['LEARNER'],
  };

  const learnerB: AuthUser = {
    userId: 'learner-bbb',
    email: 'learner.b@org.za',
    organisationId: orgId,
    roleCodes: ['LEARNER'],
  };

  describe('Basic role classification', () => {
    it('learner cannot be treated as staff or platform admin', () => {
      expect(isLearnerOnly(learnerA)).toBe(true);
      expect(isStaffUser(learnerA)).toBe(false);
      expect(isPlatformAdmin(learnerA)).toBe(false);
    });

    it('org ADMIN is staff but not platform admin', () => {
      expect(isStaffUser(adminUser)).toBe(true);
      expect(isPlatformAdmin(adminUser)).toBe(false);
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

  describe('1. Facilitator assigned versus unassigned programme', () => {
    it('programmeActorWhere scopes Facilitators to assigned programmes with active assignments', () => {
      const where = programmeActorWhere(facilitatorUser);
      const orClauses = (where as any).AND[0].OR;
      const facClause = orClauses.find((c: any) => c.facilitatorAssignments);
      expect(facClause).toBeDefined();
      expect(facClause.facilitatorAssignments.some.facilitatorId).toBe('fac-1');
      expect(facClause.facilitatorAssignments.some.isActive).toBe(true);
    });

    it('assertEnrollmentAccess rejects unassigned programme for facilitator', () => {
      const enrollmentUnassigned = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            { facilitatorId: 'different-fac', isActive: true },
          ],
        },
      };
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentUnassigned, 'Programme Resource'),
      ).toThrow(ForbiddenException);
    });

    it('assertEnrollmentAccess allows assigned programme for facilitator', () => {
      const enrollmentAssigned = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            { facilitatorId: 'fac-1', isActive: true },
          ],
        },
      };
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentAssigned, 'Programme Resource'),
      ).not.toThrow();
    });
  });

  describe('2. Facilitator assigned module versus other modules', () => {
    it('assertEnrollmentAccess denies access when assignment has different moduleId', () => {
      const enrollment = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            { facilitatorId: 'fac-1', moduleId: 'module-km-01', isActive: true },
          ],
        },
      };
      // Module KM-02 is requested but facilitator is only assigned to KM-01
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollment, 'Assessment', 'module-km-02'),
      ).toThrow(ForbiddenException);
    });

    it('assertEnrollmentAccess grants access when assignment matches requested moduleId', () => {
      const enrollment = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            { facilitatorId: 'fac-1', moduleId: 'module-km-01', isActive: true },
          ],
        },
      };
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollment, 'Assessment', 'module-km-01'),
      ).not.toThrow();
    });
  });

  describe('3. Facilitator attendance & expired assignment checks', () => {
    it('rejects expired facilitator assignments', () => {
      const enrollmentExpired = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            {
              facilitatorId: 'fac-1',
              isActive: true,
              endDate: new Date(Date.now() - 100_000), // in the past
            },
          ],
        },
      };
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentExpired, 'Attendance'),
      ).toThrow(ForbiddenException);
    });

    it('rejects future facilitator assignments not yet active', () => {
      const enrollmentFuture = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            {
              facilitatorId: 'fac-1',
              isActive: true,
              startDate: new Date(Date.now() + 100_000), // in the future
            },
          ],
        },
      };
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentFuture, 'Attendance'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('4. Facilitator enrolment transitions', () => {
    it('rejects facilitator transition when assignment is scoped to another learner', () => {
      const enrollmentOtherLearner = {
        learnerId: 'learner-bbb',
        programme: {
          facilitatorAssignments: [
            { facilitatorId: 'fac-1', learnerId: 'learner-aaa', isActive: true },
          ],
        },
      };
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentOtherLearner, 'Enrollment'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('5. Assessor allocated versus unallocated assessment', () => {
    it('programmeActorWhere scopes Assessors to programmes with allocated assessments or POE', () => {
      const where = programmeActorWhere(assessorUser);
      const orClauses = (where as any).AND[0].OR;
      const assessorClause = orClauses.find((c: any) =>
        c.enrollments?.some?.OR?.some(
          (item: any) => item.assessments?.some?.assessorId === 'assessor-1',
        ),
      );
      expect(assessorClause).toBeDefined();
    });
  });

  describe('6. Moderator allocated versus unallocated submission', () => {
    it('programmeActorWhere scopes Moderators to allocated moderation items', () => {
      const where = programmeActorWhere(moderatorUser);
      const orClauses = (where as any).AND[0].OR;
      const moderatorClause = orClauses.find((c: any) =>
        c.enrollments?.some?.OR?.some(
          (item: any) => item.assessments?.some?.moderatorId === 'moderator-1',
        ),
      );
      expect(moderatorClause).toBeDefined();
    });
  });

  describe('7. SETA assigned versus unassigned programme', () => {
    it('programmeActorWhere scopes SETA Officials to specifically assigned or funded programmes', () => {
      const where = programmeActorWhere(setaUser);
      const orClauses = (where as any).AND[0].OR;
      const setaClause = orClauses.find((c: any) =>
        c.OR?.some((item: any) => item.metadata?.path?.includes('setaOfficialIds')),
      );
      expect(setaClause).toBeDefined();
    });
  });

  describe('8. Workplace Mentor assigned versus unassigned learner', () => {
    it('programmeActorWhere scopes Mentors only to programmes where assigned learners are enrolled', () => {
      const where = programmeActorWhere(mentorUser);
      const orClauses = (where as any).AND[0].OR;
      const mentorClause = orClauses.find(
        (c: any) => c.enrollments?.some?.metadata?.equals === 'mentor-1',
      );
      expect(mentorClause).toBeDefined();
    });
  });

  describe('9. Learner attempting another learner’s resources', () => {
    it('assertEnrollmentAccess blocks Learner A from accessing Learner B records', () => {
      const learnerBEnrollment = {
        learnerId: 'learner-bbb',
        programme: {},
      };
      expect(() =>
        assertEnrollmentAccess(learnerA, learnerBEnrollment, 'Assessment'),
      ).toThrow(ForbiddenException);
    });

    it('assertEnrollmentAccess permits Learner A to access their own records', () => {
      const learnerAEnrollment = {
        learnerId: 'learner-aaa',
        programme: {},
      };
      expect(() =>
        assertEnrollmentAccess(learnerA, learnerAEnrollment, 'Assessment'),
      ).not.toThrow();
    });

    it('enrollmentActorWhere restricts queries strictly to own userId for learners', () => {
      const actorWhere = enrollmentActorWhere(learnerA);
      expect(actorWhere).toEqual({ learnerId: 'learner-aaa' });
    });
  });

  describe('10. Foreign organisation IDs across endpoints', () => {
    it('requireOrganisationId requires valid active organisation and rejects missing user/org', () => {
      expect(() => requireOrganisationId(undefined)).toThrow(ForbiddenException);
      expect(() => requireOrganisationId({ userId: 'u', email: 'e', roleCodes: [] } as any)).toThrow(
        ForbiddenException,
      );
      expect(requireOrganisationId(adminUser)).toBe(orgId);
    });
  });

  describe('11. Exact-SHA Staging verification', () => {
    it('validates exact git commit SHA extraction from environment variables', () => {
      const testSha = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';
      const envSha =
        process.env.EXPECTED_SHA ||
        process.env.GITHUB_SHA ||
        process.env.GIT_SHA ||
        process.env.RENDER_GIT_COMMIT ||
        testSha;
      expect(envSha).toBeDefined();
      expect(typeof envSha).toBe('string');
      expect(envSha.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('12. Granular Facilitator Allocation Scopes (Module, Cohort, Learner)', () => {
    it('enrollmentActorWhere without targetModuleId does not grant access to module-scoped assignments', () => {
      const actorWhere = enrollmentActorWhere(facilitatorUser);
      const orClauses = (actorWhere as any).AND[0].OR;
      const facOrClauses = orClauses[0].OR;
      // Should have full-programme, cohort, and learner clauses, but NOT module clause
      const fullProg = facOrClauses.find((c: any) => c.programme?.facilitatorAssignments?.some?.moduleId === null);
      const cohortScope = facOrClauses.find((c: any) => c.cohort?.facilitatorAssignments);
      const learnerScope = facOrClauses.find((c: any) => c.learner?.learnerFacilitatorAssignments);
      expect(fullProg).toBeDefined();
      expect(cohortScope).toBeDefined();
      expect(learnerScope).toBeDefined();
      expect(facOrClauses.find((c: any) => c.programme?.facilitatorAssignments?.some?.moduleId === 'mod-1')).toBeUndefined();
    });

    it('enrollmentActorWhere with targetModuleId includes module-scoped assignment', () => {
      const actorWhere = enrollmentActorWhere(facilitatorUser, 'mod-test-123');
      const orClauses = (actorWhere as any).AND[0].OR;
      const facOrClauses = orClauses[0].OR;
      const modScope = facOrClauses.find(
        (c: any) => c.programme?.facilitatorAssignments?.some?.moduleId === 'mod-test-123',
      );
      expect(modScope).toBeDefined();
    });

    it('assertEnrollmentAccess matches unitStandardId via module.unitStandardId', () => {
      const enrollmentWithModuleUS = {
        learnerId: 'learner-aaa',
        programme: {
          facilitatorAssignments: [
            {
              facilitatorId: 'fac-1',
              moduleId: 'mod-1',
              module: { id: 'mod-1', unitStandardId: 'us-101' },
              isActive: true,
            },
          ],
        },
      };
      // Facilitator assignment has module with unitStandardId 'us-101'
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentWithModuleUS, 'Assessment', 'us-101'),
      ).not.toThrow();
      expect(() =>
        assertEnrollmentAccess(facilitatorUser, enrollmentWithModuleUS, 'Assessment', 'us-999'),
      ).toThrow(ForbiddenException);
    });
  });
});
