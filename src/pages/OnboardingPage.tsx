import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy onboarding URL — invitations use /register?invite= */
export function OnboardingPage() {
  const [params] = useSearchParams();
  const invite = params.get('invite');
  if (invite) {
    return <Navigate to={`/register?invite=${encodeURIComponent(invite)}`} replace />;
  }
  return <Navigate to="/register" replace />;
}
