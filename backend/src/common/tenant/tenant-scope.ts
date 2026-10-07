import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

export function isMentorOnly(user?: AuthUser | null): boolean {
  if (!user?.roleCodes?.some((code) => code === 'MENTOR' || code === 'WORKPLACE_MENTOR')) {
    return false;
  }
  return !user.roleCodes.some((code) =>
    ['ADMIN', 'PLATFORM_ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'QA_OFFICER', 'SETA'].includes(code),
  );
}

export function isFacilitatorOnly(user?: AuthUser | null): boolean {
  if (!user?.roleCodes?.includes('FACILITATOR')) return false;
  return !user.roleCodes.some((code) =>
    ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(code),
  );
}

export function isAssessorOnly(user?: AuthUser | null): boolean {
  if (!user?.roleCodes?.includes('ASSESSOR')) return false;
  return !user.roleCodes.some((code) =>
    ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(code),
  );
}

export function isModeratorOnly(user?: AuthUser | null): boolean {
  if (!user?.roleCodes?.includes('MODERATOR')) return false;
  return !user.roleCodes.some((code) =>
    ['ADMIN', 'PLATFORM_ADMIN', 'QA_OFFICER'].includes(code),
  );
}

/**
 * Scope programmes by the authenticated user's role and allocations.
 * Admin & QA Officer: full organisation.
 * Facilitator: assigned programmes (active assignment within valid date window).
 * Learner: programmes with own enrollment.
 * Assessor: programmes with allocated assessments or PoE items.
 * Moderator: programmes with allocated moderation items.
 * SETA: assigned programmes (metadata.setaOfficialIds) or funded programmes.
 * Mentor: programmes where assigned learners are enrolled.
 */
export function programmeActorWhere(
  user?: AuthUser | null,
): Prisma.ProgrammeWhereInput {
  if (!user?.userId) return { id: '__no_authenticated_actor__' };
  if (
    isPlatformAdmin(user) ||
    user.roleCodes.some((code) => ['ADMIN', 'QA_OFFICER'].includes(code))
  ) {
    return {};
  }

  const scopes: Prisma.ProgrammeWhereInput[] = [];

  if (user.roleCodes.includes('LEARNER')) {
    scopes.push({
      enrollments: {
        some: {
          learnerId: user.userId,
          deletedAt: null,
        },
      },
    });
  }

  if (user.roleCodes.includes('FACILITATOR')) {
    const now = new Date();
    scopes.push({
      facilitatorAssignments: {
        some: {
          facilitatorId: user.userId,
          isActive: true,
          deletedAt: null,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
      },
    });
  }

  if (user.roleCodes.includes('ASSESSOR')) {
    scopes.push({
      enrollments: {
        some: {
          deletedAt: null,
          OR: [
            { assessments: { some: { assessorId: user.userId, deletedAt: null } } },
            { poeLearningArtifacts: { some: { assessorId: user.userId, deletedAt: null } } },
          ],
        },
      },
    });
  }

  if (user.roleCodes.includes('MODERATOR')) {
    scopes.push({
      enrollments: {
        some: {
          deletedAt: null,
          OR: [
            { assessments: { some: { moderatorId: user.userId, deletedAt: null } } },
            { poeLearningArtifacts: { some: { moderatorId: user.userId, deletedAt: null } } },
          ],
        },
      },
    });
  }

  if (user.roleCodes.includes('SETA')) {
    scopes.push({
      OR: [
        { metadata: { path: ['setaOfficialIds'], array_contains: user.userId } },
        { metadata: { path: ['setaFunding'], not: Prisma.DbNull } },
        { metadata: { path: ['isSetaFunded'], equals: true } },
      ],
    });
  }

  if (user.roleCodes.some((c) => c === 'MENTOR' || c === 'WORKPLACE_MENTOR')) {
    scopes.push({
      enrollments: {
        some: {
          deletedAt: null,
          metadata: { path: ['workplaceMentorId'], equals: user.userId },
        },
      },
    });
  }

  if (scopes.length) {
    return { AND: [{ OR: scopes }] };
  }
  return { id: '__no_allocated_programme__' };
}

/** Actor-specific enrollment scope layered on top of the active tenant. */
export function enrollmentActorWhere(
  user?: AuthUser | null,
  targetModuleId?: string,
): Prisma.EnrollmentWhereInput {
  if (isLearnerOnly(user)) return { learnerId: user!.userId };
  if (isMentorOnly(user)) {
    return {
      metadata: {
        path: ['workplaceMentorId'],
        equals: user!.userId,
      },
    };
  }
  if (!user?.userId) return { id: '__no_authenticated_actor__' };
  if (isPlatformAdmin(user) || user.roleCodes.some((code) =>
    ['ADMIN', 'QA_OFFICER'].includes(code))) {
    return {};
  }
  const scopes: Prisma.EnrollmentWhereInput[] = [];
  if (user.roleCodes.includes('FACILITATOR')) {
    const now = new Date();
    const dateFilter = {
      facilitatorId: user.userId,
      isActive: true,
      deletedAt: null,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    scopes.push({
      OR: [
        // 1. Full-programme assignment: no module, no cohort, no learner restrictions
        {
          programme: {
            facilitatorAssignments: {
              some: {
                ...dateFilter,
                moduleId: null,
                cohortId: null,
                learnerId: null,
              },
            },
          },
        },
        // 2. Cohort-scoped assignment: applies only to enrollments in that cohort
        {
          cohort: {
            facilitatorAssignments: {
              some: {
                ...dateFilter,
                moduleId: null,
                learnerId: null,
              },
            },
          },
        },
        // 3. Learner-scoped assignment: applies only to that specific learner
        {
          learner: {
            learnerFacilitatorAssignments: {
              some: {
                ...dateFilter,
                moduleId: null,
                cohortId: null,
              },
            },
          },
        },
        // 4. Module-scoped assignment: only matches when targetModuleId is explicitly provided
        ...(targetModuleId
          ? [
              {
                programme: {
                  facilitatorAssignments: {
                    some: {
                      ...dateFilter,
                      OR: [
                        { moduleId: targetModuleId },
                        { module: { unitStandardId: targetModuleId } },
                      ],
                    },
                  },
                },
              },
            ]
          : []),
      ],
    });
  }
  if (user.roleCodes.includes('ASSESSOR')) {
    scopes.push(
      { assessments: { some: { assessorId: user.userId, deletedAt: null } } },
      { poeLearningArtifacts: { some: { assessorId: user.userId, deletedAt: null } } },
    );
  }
  if (user.roleCodes.includes('MODERATOR')) {
    scopes.push(
      { assessments: { some: { moderatorId: user.userId, deletedAt: null } } },
      { poeLearningArtifacts: { some: { moderatorId: user.userId, deletedAt: null } } },
    );
  }
  if (user.roleCodes.includes('SETA')) {
    scopes.push({
      programme: {
        metadata: { path: ['setaOfficialIds'], array_contains: user.userId },
      },
    });
  }
  if (scopes.length) return { AND: [{ OR: scopes }] };
  return { id: '__no_allocated_enrollment__' };
}

/** Scope an Assessment itself, so one allocated item does not reveal siblings. */
export function assessmentActorWhere(
  user?: AuthUser | null,
): Prisma.AssessmentWhereInput {
  if (!user?.userId || isLearnerOnly(user)) return {};
  if (isPlatformAdmin(user) || user.roleCodes.some((code) =>
    ['ADMIN', 'QA_OFFICER'].includes(code))) {
    return {};
  }
  const scopes: Prisma.AssessmentWhereInput[] = [];
  if (user.roleCodes.includes('FACILITATOR')) {
    const now = new Date();
    const dateFilter = {
      facilitatorId: user.userId,
      isActive: true,
      deletedAt: null,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    scopes.push({
      OR: [
        // Full programme assignment
        {
          enrollment: {
            programme: {
              facilitatorAssignments: {
                some: {
                  ...dateFilter,
                  moduleId: null,
                  cohortId: null,
                  learnerId: null,
                },
              },
            },
          },
        },
        // Module-only assignment: assessments whose unit standard is the allocated module,
        // and only enrollments in that same programme.
        {
          AND: [
            {
              unitStandard: {
                programmeModules: {
                  some: {
                    facilitatorAssignments: {
                      some: {
                        ...dateFilter,
                        learnerId: null,
                        cohortId: null,
                        moduleId: { not: null },
                      },
                    },
                  },
                },
              },
            },
            {
              enrollment: {
                programme: {
                  modules: {
                    some: {
                      facilitatorAssignments: {
                        some: {
                          ...dateFilter,
                          learnerId: null,
                          cohortId: null,
                          moduleId: { not: null },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        // Combined module + cohort assignment: the same allocation must match both
        {
          AND: [
            {
              unitStandard: {
                programmeModules: {
                  some: {
                    facilitatorAssignments: {
                      some: {
                        ...dateFilter,
                        learnerId: null,
                        moduleId: { not: null },
                        cohortId: { not: null },
                      },
                    },
                  },
                },
              },
            },
            {
              enrollment: {
                cohort: {
                  facilitatorAssignments: {
                    some: {
                      ...dateFilter,
                      learnerId: null,
                      moduleId: { not: null },
                      cohortId: { not: null },
                    },
                  },
                },
              },
            },
          ],
        },
        // Cohort-only assignment (all assessments for enrollments in that cohort)
        {
          enrollment: {
            cohort: {
              facilitatorAssignments: {
                some: {
                  ...dateFilter,
                  moduleId: null,
                  learnerId: null,
                },
              },
            },
          },
        },
        // Learner-scoped assignment
        {
          enrollment: {
            learner: {
              learnerFacilitatorAssignments: {
                some: {
                  ...dateFilter,
                  moduleId: null,
                  cohortId: null,
                },
              },
            },
          },
        },
      ],
    });
  }
  if (user.roleCodes.includes('ASSESSOR')) scopes.push({ assessorId: user.userId });
  if (user.roleCodes.includes('MODERATOR')) scopes.push({ moderatorId: user.userId });
  if (user.roleCodes.includes('SETA')) {
    scopes.push({
      enrollment: {
        programme: {
          metadata: { path: ['setaOfficialIds'], array_contains: user.userId },
        },
      },
    });
  }
  return scopes.length
    ? { AND: [{ OR: scopes }] }
    : { id: '__no_allocated_assessment__' };
}

export function poeArtifactActorWhere(
  user?: AuthUser | null,
): Prisma.PoeLearningArtifactWhereInput {
  if (!user?.userId || isLearnerOnly(user)) return {};
  if (isPlatformAdmin(user) || user.roleCodes.includes('ADMIN') || user.roleCodes.includes('QA_OFFICER')) {
    return {};
  }
  const scopes: Prisma.PoeLearningArtifactWhereInput[] = [];
  if (user.roleCodes.includes('FACILITATOR')) {
    const now = new Date();
    const dateFilter = {
      facilitatorId: user.userId,
      isActive: true,
      deletedAt: null,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    scopes.push({
      OR: [
        // Full programme assignment
        {
          enrollment: {
            programme: {
              facilitatorAssignments: {
                some: {
                  ...dateFilter,
                  moduleId: null,
                  cohortId: null,
                  learnerId: null,
                },
              },
            },
          },
        },
        // Cohort-scoped assignment
        {
          enrollment: {
            cohort: {
              facilitatorAssignments: {
                some: {
                  ...dateFilter,
                  moduleId: null,
                  learnerId: null,
                },
              },
            },
          },
        },
        // Learner-scoped assignment
        {
          enrollment: {
            learner: {
              learnerFacilitatorAssignments: {
                some: {
                  ...dateFilter,
                  moduleId: null,
                  cohortId: null,
                },
              },
            },
          },
        },
      ],
    });
  }
  if (user.roleCodes.includes('ASSESSOR')) scopes.push({ assessorId: user.userId });
  if (user.roleCodes.includes('MODERATOR')) scopes.push({ moderatorId: user.userId });
  if (user.roleCodes.includes('MENTOR')) {
    scopes.push({
      enrollment: {
        metadata: { path: ['workplaceMentorId'], equals: user.userId },
      },
    });
  }
  if (user.roleCodes.includes('SETA')) {
    scopes.push({
      enrollment: {
        programme: {
          metadata: { path: ['setaOfficialIds'], array_contains: user.userId },
        },
      },
    });
  }
  return scopes.length
    ? { AND: [{ OR: scopes }] }
    : { id: '__no_allocated_poe_artifact__' };
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
 * Staff may access any enrollment in the active organisation, unless restricted by role allocation.
 */
export function assertEnrollmentAccess(
  user: AuthUser | undefined,
  enrollment: {
    learnerId: string;
    cohortId?: string | null;
    metadata?: unknown;
    programme?: {
      facilitatorAssignments?: Array<{
        facilitatorId: string;
        isActive: boolean;
        startDate?: Date | string | null;
        endDate?: Date | string | null;
        learnerId?: string | null;
        cohortId?: string | null;
        moduleId?: string | null;
        module?: { id: string; unitStandardId?: string | null } | null;
      }>;
      [key: string]: unknown;
    } | null;
  } | null,
  label = 'Resource',
  targetModuleId?: string | null,
): void {
  if (!enrollment) {
    throw new ForbiddenException(`${label} not found`);
  }
  if (isLearnerOnly(user) && enrollment.learnerId !== user?.userId) {
    throw new ForbiddenException(`${label} access denied`);
  }
  if (isMentorOnly(user)) {
    const metadata =
      enrollment.metadata && typeof enrollment.metadata === 'object'
        ? (enrollment.metadata as { workplaceMentorId?: string })
        : {};
    if (metadata.workplaceMentorId !== user?.userId) {
      throw new ForbiddenException(`${label} access denied: mentor not assigned to this learner`);
    }
  }
  if (isFacilitatorOnly(user)) {
    const programmeAssignments = enrollment.programme?.facilitatorAssignments ?? [];
    const cohortAssignments = (enrollment as any).cohort?.facilitatorAssignments ?? [];
    const learnerAssignments = (enrollment as any).learner?.learnerFacilitatorAssignments ?? [];
    const assignments = [...programmeAssignments, ...cohortAssignments, ...learnerAssignments];

    if (!assignments.length) {
      throw new ForbiddenException(`${label} access denied: not allocated to this programme`);
    }
    const now = new Date();
    const assigned = assignments.some((fa) => {
      if (fa.facilitatorId !== user?.userId || !fa.isActive) return false;
      if (fa.startDate && new Date(fa.startDate) > now) return false;
      if (fa.endDate && new Date(fa.endDate) < now) return false;
      if (fa.learnerId && fa.learnerId !== enrollment.learnerId) return false;
      if (fa.cohortId && fa.cohortId !== enrollment.cohortId) return false;
      if (fa.moduleId) {
        if (!targetModuleId) return false;
        const linkedUnitStandardId =
          fa.module?.unitStandardId ??
          (enrollment.programme as any)?.modules?.find((m: any) => m.id === fa.moduleId)?.unitStandardId;
        const matchesModule =
          fa.moduleId === targetModuleId ||
          linkedUnitStandardId === targetModuleId;
        if (!matchesModule) return false;
      }
      return true;
    });
    if (!assigned) {
      throw new ForbiddenException(`${label} access denied: not allocated to this programme`);
    }
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

export function assertAllocatedModerator(
  user: AuthUser | undefined,
  moderatorId: string | null | undefined,
): void {
  if (!user?.userId) {
    throw new ForbiddenException('Authentication required');
  }
  if (!moderatorId) {
    throw new ForbiddenException(
      'No moderator is allocated to this assessment',
    );
  }
  if (user.userId !== moderatorId) {
    throw new ForbiddenException(
      'Only the allocated moderator may sign off this assessment',
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
