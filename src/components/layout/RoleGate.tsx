import React, { type ReactNode } from 'react';
import type { UserRole } from '../../types';
import { ProtectedRoute } from './ProtectedRoute';

/** Role check inside an authenticated area (parent should already require login). */
export function RoleGate({
  allowedRoles,
  children
}: {
  allowedRoles: readonly UserRole[];
  children: ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={[...allowedRoles]}>
      {children}
    </ProtectedRoute>
  );
}
