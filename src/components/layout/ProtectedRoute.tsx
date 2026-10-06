import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import {
  getAuthPortal,
  isRoleAllowedInPortal,
} from '../../config/authPortal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
        }}
        replace
      />
    );
  }

  if (user && !isRoleAllowedInPortal(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
    if (getAuthPortal() === 'ops') {
      return <Navigate to="/login" replace />;
    }
    return (
      <Navigate
        to="/access-denied"
        state={{
          attemptedPath: location.pathname,
          reason: `Your current role '${user.role}' does not have permission to access this page.`,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['Admin']}>{children}</ProtectedRoute>;
}

export function FacilitatorRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Facilitator']}>
      {children}
    </ProtectedRoute>
  );
}

export function LearnerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['Learner']}>{children}</ProtectedRoute>;
}

export function ComplianceRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'QA Officer', 'SETA Official']}>
      {children}
    </ProtectedRoute>
  );
}
