import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

export interface CanProps {
  roles?: UserRole[];
  permissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/* eslint-disable-next-line react-refresh/only-export-components -- useCan is intentionally exported next to Can */
export function useCan() {
  const { user } = useAuth();

  const canAccess = React.useCallback(
    (allowedRoles?: UserRole[]) => {
      if (!user) return false;
      if (!allowedRoles || allowedRoles.length === 0) return true;
      return allowedRoles.includes(user.role as UserRole);
    },
    [user],
  );

  return {
    canAccess,
    userRole: user?.role as UserRole | undefined,
    isAdmin: user?.role === 'Admin',
    isFacilitator: user?.role === 'Facilitator',
    isAssessor: user?.role === 'Assessor',
    isModerator: user?.role === 'Moderator',
    isLearner: user?.role === 'Learner',
    isQaOfficer: user?.role === 'QA Officer',
    isSetaOfficial: user?.role === 'SETA Official',
    isWorkplaceMentor: user?.role === 'Workplace Mentor',
  };
}

export function Can({ roles, children, fallback = null }: CanProps) {
  const { canAccess } = useCan();

  if (!canAccess(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
