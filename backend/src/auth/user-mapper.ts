import type {
  FacilitatorRole as PrismaFacilitatorRole,
  Organisation,
  Role,
  User as PrismaUser,
  UserOrganisation,
} from '@prisma/client';

/** Mirrors frontend `UserRole` strings */
const ROLE_CODE_TO_APP: Record<string, string> = {
  ADMIN: 'Admin',
  FACILITATOR: 'Facilitator',
  LEARNER: 'Learner',
  ASSESSOR: 'Assessor',
  MODERATOR: 'Moderator',
  QA_OFFICER: 'QA Officer',
  SETA: 'SETA Official',
};

const ROLE_PRIORITY = [
  'ADMIN',
  'QA_OFFICER',
  'SETA',
  'FACILITATOR',
  'ASSESSOR',
  'MODERATOR',
  'LEARNER',
] as const;

export type UserWithMemberships = PrismaUser & {
  memberships: (UserOrganisation & {
    role: Role;
    organisation: Organisation;
  })[];
};

function pickPrimaryRoleCode(memberships: UserWithMemberships['memberships']): string {
  const codes = memberships.map((m) => m.role.code);
  for (const p of ROLE_PRIORITY) {
    if (codes.includes(p)) return p;
  }
  return codes[0] ?? 'LEARNER';
}

function mapFacilitatorRoleToApp(
  r: PrismaFacilitatorRole | null,
): 'lead_facilitator' | 'assistant_facilitator' | 'subject_specialist' | 'workplace_coordinator' | undefined {
  if (!r) return undefined;
  const M: Record<
    PrismaFacilitatorRole,
    'lead_facilitator' | 'assistant_facilitator' | 'subject_specialist' | 'workplace_coordinator'
  > = {
    LEAD_FACILITATOR: 'lead_facilitator',
    ASSISTANT_FACILITATOR: 'assistant_facilitator',
    SUBJECT_SPECIALIST: 'subject_specialist',
    WORKPLACE_COORDINATOR: 'workplace_coordinator',
  };
  return M[r];
}

/** Builds the LMS app `User` JSON shape from Prisma models */
export function mapUserToApiProfile(user: UserWithMemberships): Record<string, unknown> {
  const primaryCode = pickPrimaryRoleCode(user.memberships);
  const primaryMembership =
    user.memberships.find((m) => m.role.code === primaryCode) ?? user.memberships[0];
  const roleName = ROLE_CODE_TO_APP[primaryCode] ?? 'Learner';
  const orgName = primaryMembership?.organisation?.name ?? 'SkillForge SDIO';
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials =
    `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  return {
    id: user.id,
    name: fullName,
    email: user.email,
    role: roleName,
    initials,
    organisation: orgName,
    organisationId: primaryMembership?.organisationId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    facilitatorRole: mapFacilitatorRoleToApp(user.facilitatorRole),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
