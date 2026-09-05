import type { UserRole } from '../types';

export type AuthPortal = 'lms' | 'ops';

export const LMS_ROLES = [
  'Admin',
  'Facilitator',
  'Learner',
  'Assessor',
  'Moderator',
  'QA Officer',
  'SETA Official',
  'Workplace Mentor',
] as const satisfies readonly UserRole[];

export const OPS_ROLES = [
  'Platform Admin',
] as const satisfies readonly UserRole[];

export const LMS_AUTH_STORAGE_KEY = 'skillforge_auth_v1';
export const OPS_AUTH_STORAGE_KEY = 'skillforge_ops_auth_v1';

let activePortal: AuthPortal =
  (import.meta.env.VITE_AUTH_PORTAL as AuthPortal | undefined) === 'ops'
    ? 'ops'
    : 'lms';

export function configureAuthPortal(portal: AuthPortal) {
  activePortal = portal;
}

export function getAuthPortal(): AuthPortal {
  return activePortal;
}

export function getAuthStorageKey(): string {
  return activePortal === 'ops' ? OPS_AUTH_STORAGE_KEY : LMS_AUTH_STORAGE_KEY;
}

export function isRoleAllowedInPortal(
  role: UserRole,
  portal: AuthPortal = getAuthPortal(),
): boolean {
  return portal === 'ops'
    ? OPS_ROLES.some((allowedRole) => allowedRole === role)
    : LMS_ROLES.some((allowedRole) => allowedRole === role);
}

export function getLmsUrl(): string {
  return (
    (import.meta.env.VITE_LMS_URL as string | undefined)?.trim() ||
    'http://localhost:5176'
  );
}

export function getOpsUrl(): string {
  return (
    (import.meta.env.VITE_OPS_URL as string | undefined)?.trim() ||
    'http://localhost:5177'
  );
}
