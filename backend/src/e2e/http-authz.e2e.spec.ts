/**
 * Nest HTTP authorization matrix — exercises RolesGuard + tenant helpers
 * without a live DB (true DB-backed suite runs in CI with postgres service).
 */
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import {
  isLearnerOnly,
  isPlatformAdmin,
  resolveRoleCodesForTenant,
} from '../common/tenant/tenant-scope';

function runRolesGuard(required: string[], roleCodes: string[]) {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { roleCodes } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
  return guard.canActivate(ctx as never);
}

describe('HTTP authorization matrix (guard-level E2E)', () => {
  it('blocks learner from ADMIN-only route', () => {
    expect(() => runRolesGuard(['ADMIN'], ['LEARNER'])).toThrow(
      ForbiddenException,
    );
  });

  it('allows PLATFORM_ADMIN through any role gate', () => {
    expect(runRolesGuard(['ADMIN'], ['PLATFORM_ADMIN'])).toBe(true);
  });

  it('tenant role resolution drops foreign ADMIN', () => {
    const codes = resolveRoleCodesForTenant({
      organisationRoleCodes: ['LEARNER'],
      isPlatformAdmin: false,
    });
    expect(isLearnerOnly({ userId: 'u', email: 'x', roleCodes: codes })).toBe(
      true,
    );
    expect(
      isPlatformAdmin({ userId: 'u', email: 'x', roleCodes: codes }),
    ).toBe(false);
  });

  it('enrollment POST roles exclude LEARNER', () => {
    expect(() =>
      runRolesGuard(['ADMIN', 'FACILITATOR'], ['LEARNER']),
    ).toThrow(ForbiddenException);
    expect(runRolesGuard(['ADMIN', 'FACILITATOR'], ['FACILITATOR'])).toBe(true);
  });

  it('programme creation is blocked for Facilitator, Assessor, Moderator and Learner', () => {
    expect(() => runRolesGuard(['ADMIN'], ['FACILITATOR'])).toThrow(ForbiddenException);
    expect(() => runRolesGuard(['ADMIN'], ['ASSESSOR'])).toThrow(ForbiddenException);
    expect(() => runRolesGuard(['ADMIN'], ['MODERATOR'])).toThrow(ForbiddenException);
    expect(() => runRolesGuard(['ADMIN'], ['LEARNER'])).toThrow(ForbiddenException);
    expect(runRolesGuard(['ADMIN'], ['ADMIN'])).toBe(true);
  });

  it('attendance session opening is blocked for Learner, Assessor and Moderator', () => {
    expect(() => runRolesGuard(['ADMIN', 'FACILITATOR'], ['LEARNER'])).toThrow(ForbiddenException);
    expect(() => runRolesGuard(['ADMIN', 'FACILITATOR'], ['ASSESSOR'])).toThrow(ForbiddenException);
    expect(() => runRolesGuard(['ADMIN', 'FACILITATOR'], ['MODERATOR'])).toThrow(ForbiddenException);
    expect(runRolesGuard(['ADMIN', 'FACILITATOR'], ['FACILITATOR'])).toBe(true);
    expect(runRolesGuard(['ADMIN', 'FACILITATOR'], ['ADMIN'])).toBe(true);
  });

  it('audit logs access is restricted to Admin, QA Officer, and SETA Official', () => {
    expect(() => runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], ['FACILITATOR'])).toThrow(ForbiddenException);
    expect(() => runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], ['LEARNER'])).toThrow(ForbiddenException);
    expect(runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], ['ADMIN'])).toBe(true);
    expect(runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], ['QA_OFFICER'])).toBe(true);
    expect(runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], ['SETA'])).toBe(true);
  });

  describe('Eight-role same-tenant permitted and denied matrix', () => {
    const allRoles = [
      'ADMIN',
      'QA_OFFICER',
      'FACILITATOR',
      'LEARNER',
      'ASSESSOR',
      'MODERATOR',
      'SETA',
      'MENTOR',
    ];

    it('Admin operations: only ADMIN and PLATFORM_ADMIN permitted', () => {
      for (const role of allRoles) {
        if (role === 'ADMIN') {
          expect(runRolesGuard(['ADMIN'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN'], [role])).toThrow(ForbiddenException);
        }
      }
    });

    it('Quality and QA operations: ADMIN and QA_OFFICER permitted, others denied', () => {
      const allowed = new Set(['ADMIN', 'QA_OFFICER']);
      for (const role of allRoles) {
        if (allowed.has(role)) {
          expect(runRolesGuard(['ADMIN', 'QA_OFFICER'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN', 'QA_OFFICER'], [role])).toThrow(ForbiddenException);
        }
      }
    });

    it('Facilitator teaching & attendance operations: ADMIN and FACILITATOR permitted, others denied', () => {
      const allowed = new Set(['ADMIN', 'FACILITATOR']);
      for (const role of allRoles) {
        if (allowed.has(role)) {
          expect(runRolesGuard(['ADMIN', 'FACILITATOR'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN', 'FACILITATOR'], [role])).toThrow(ForbiddenException);
        }
      }
    });

    it('Assessor grading operations: ADMIN and ASSESSOR permitted, others denied', () => {
      const allowed = new Set(['ADMIN', 'ASSESSOR']);
      for (const role of allRoles) {
        if (allowed.has(role)) {
          expect(runRolesGuard(['ADMIN', 'ASSESSOR'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN', 'ASSESSOR'], [role])).toThrow(ForbiddenException);
        }
      }
    });

    it('Moderation operations: ADMIN, QA_OFFICER and MODERATOR permitted, others denied', () => {
      const allowed = new Set(['ADMIN', 'QA_OFFICER', 'MODERATOR']);
      for (const role of allRoles) {
        if (allowed.has(role)) {
          expect(runRolesGuard(['ADMIN', 'QA_OFFICER', 'MODERATOR'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN', 'QA_OFFICER', 'MODERATOR'], [role])).toThrow(ForbiddenException);
        }
      }
    });

    it('Workplace mentor operations: ADMIN and MENTOR permitted, others denied', () => {
      const allowed = new Set(['ADMIN', 'MENTOR']);
      for (const role of allRoles) {
        if (allowed.has(role)) {
          expect(runRolesGuard(['ADMIN', 'MENTOR'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN', 'MENTOR'], [role])).toThrow(ForbiddenException);
        }
      }
    });

    it('SETA oversight reports: ADMIN, QA_OFFICER and SETA permitted, others denied', () => {
      const allowed = new Set(['ADMIN', 'QA_OFFICER', 'SETA']);
      for (const role of allRoles) {
        if (allowed.has(role)) {
          expect(runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], [role])).toBe(true);
        } else {
          expect(() => runRolesGuard(['ADMIN', 'QA_OFFICER', 'SETA'], [role])).toThrow(ForbiddenException);
        }
      }
    });
  });
});
