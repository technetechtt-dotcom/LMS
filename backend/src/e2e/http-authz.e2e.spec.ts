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
});
