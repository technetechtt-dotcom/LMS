import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { ErrorState } from '../ui/ErrorState';
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>);

  }
  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location
        }}
        replace />);


  }
  // Role check
  if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div className="flex items-center justify-center h-screen p-8">
        <ErrorState
          type="permission"
          title="Access Restricted"
          message={`This page is only available to ${allowedRoles.join(', ')} users. Your current role is ${user.role}.`} />
        
      </div>);

  }
  return <>{children}</>;
}
// Role-specific route helpers
export function AdminRoute({ children }: {children: React.ReactNode;}) {
  return <ProtectedRoute allowedRoles={['Admin']}>{children}</ProtectedRoute>;
}
export function FacilitatorRoute({ children }: {children: React.ReactNode;}) {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Facilitator']}>
      {children}
    </ProtectedRoute>);

}
export function LearnerRoute({ children }: {children: React.ReactNode;}) {
  return <ProtectedRoute allowedRoles={['Learner']}>{children}</ProtectedRoute>;
}
export function ComplianceRoute({ children }: {children: React.ReactNode;}) {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'QA Officer', 'SETA Official']}>
      {children}
    </ProtectedRoute>);

}