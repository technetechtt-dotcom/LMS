import type { UserRole } from '../types';

const ALL = '*' as const;

export type AllowedRoles = typeof ALL | readonly UserRole[];

export function normalizeAllowedRoles(value: AllowedRoles): UserRole[] | null {
  if (value === ALL) return null;
  return [...value];
}

/** First screen after login for each role */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'Learner':
      return '/learner-dashboard';
    case 'Facilitator':
      return '/facilitator-dashboard';
    case 'Assessor':
      return '/assessor-dashboard';
    case 'Moderator':
      return '/moderator-dashboard';
    case 'Workplace Mentor':
      return '/workplace-mentor-dashboard';
    case 'SETA Official':
      return '/audit';
    case 'QA Officer':
      return '/qa-dashboard';
    case 'Platform Admin':
      return '/login';
    case 'Admin':
    default:
      return '/dashboard';
  }
}
