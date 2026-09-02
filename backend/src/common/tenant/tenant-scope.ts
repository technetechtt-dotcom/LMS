import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../types/request-with-user';

/** Canonical organisation header (also accepts aliases). */
export const ORG_HEADER_PRIMARY = 'x-organisation-id';
export const ORG_HEADER_ALIASES = [
  'x-organisation-id',
  'x-org-id',
  'x-tenant-id',
] as const;

const STAFF_ROLES = new Set([
  'ADMIN',
  'PLATFORM_ADMIN',
  'FACILITATOR',
  'ASSESSOR',
  'MODERATOR',
  'QA_OFFICER',
  'SETA',
  'MENTOR',
]);

export function readOrganisationHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  for (const key of ORG_HEADER_ALIASES) {
    const raw = headers[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function requireOrganisationId(user?: AuthUser | null): string {
  const orgId = user?.organisationId?.trim();
  if (!orgId) {
    throw new ForbiddenException(
      'Organisation context is required for this resource',
    );
  }
  return orgId;
}

/** Cross-tenant platform operator — not organisation ADMIN. */
export function isPlatformAdmin(user?: AuthUser | null): boolean {
  return Boolean(user?.roleCodes?.includes('PLATFORM_ADMIN'));
}

/** Roles that apply only in the active organisation (plus global PLATFORM_ADMIN). */
export function resolveRoleCodesForTenant(opts: {
  organisationRoleCodes: string[];
  isPlatformAdmin: boolean;
}): string[] {
  const set = new Set(opts.organisationRoleCodes.filter(Boolean));
  if (opts.isPlatformAdmin) set.add('PLATFORM_ADMIN');
  return [...set];
}

/** True when the caller has any staff/regulatory role (not learner-only). */
export function isStaffUser(user?: AuthUser | null): boolean {
  return Boolean(user?.roleCodes?.some((c) => STAFF_ROLES.has(c)));
}

export function isLearnerOnly(user?: AuthUser | null): boolean {
  if (!user?.roleCodes?.length) return false;
  return !isStaffUser(user) && user.roleCodes.includes('LEARNER');
}

/** Prisma filter: enrollment belongs to organisation. */
export function enrollmentOrgWhere(organisationId: string) {
  return {
    OR: [
      { sdioOrganisationId: organisationId },
      { employerOrganisationId: organisationId },
      { programme: { organisationId } },
    ],
  };
}

/**
 * Learners may only access their own enrollment ids.
 * Staff may access any enrollment in the active organisation.
 */
export function assertEnrollmentAccess(
  user: AuthUser | undefined,
  enrollment: { learnerId: string } | null,
  label = 'Resource',
): void {
  if (!enrollment) {
    throw new ForbiddenException(`${label} not found`);
  }
  if (isLearnerOnly(user) && enrollment.learnerId !== user?.userId) {
    throw new ForbiddenException(`${label} access denied`);
  }
}

/** Grading (human marks / C-NYC) is reserved for the allocated assessor. Admins may override. */
export function assertAllocatedAssessor(
  user: AuthUser | undefined,
  assessorId: string,
): void {
  if (!user?.userId) {
    throw new ForbiddenException('Authentication required');
  }
  if (isPlatformAdmin(user) || user.roleCodes.includes('ADMIN')) {
    return;
  }
  if (user.userId !== assessorId) {
    throw new ForbiddenException(
      'Only the allocated assessor may grade this assessment',
    );
  }
}

export function canFacilitatorMark(user?: AuthUser | null): boolean {
  return Boolean(
    user &&
      (isPlatformAdmin(user) ||
        user.roleCodes.includes('ADMIN') ||
        user.roleCodes.includes('FACILITATOR')),
  );
}

export function canAssessorReview(user?: AuthUser | null): boolean {
  return Boolean(
    user &&
      (isPlatformAdmin(user) ||
        user.roleCodes.includes('ADMIN') ||
        user.roleCodes.includes('ASSESSOR')),
  );
}

export function canModerateSubmission(user?: AuthUser | null): boolean {
  return Boolean(
    user &&
      (isPlatformAdmin(user) ||
        user.roleCodes.includes('MODERATOR') ||
        user.roleCodes.includes('QA_OFFICER') ||
        user.roleCodes.includes('ADMIN')),
  );
}
