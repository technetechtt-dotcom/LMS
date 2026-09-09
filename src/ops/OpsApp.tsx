import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OpsLayout } from '../components/layout/OpsLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { OPS_ROLES } from '../config/authPortal';

const OpsLoginPage = lazy(() => import('./OpsLoginPage').then(({ OpsLoginPage }) => ({ default: OpsLoginPage })));
const OpsDashboardPage = lazy(() => import('../pages/ops/OpsDashboardPage').then(({ OpsDashboardPage }) => ({ default: OpsDashboardPage })));
const OpsUsersPage = lazy(() => import('../pages/ops/OpsUsersPage').then(({ OpsUsersPage }) => ({ default: OpsUsersPage })));
const OpsOrganisationsPage = lazy(() => import('../pages/ops/OpsOrganisationsPage').then(({ OpsOrganisationsPage }) => ({ default: OpsOrganisationsPage })));
const OpsProgrammesPage = lazy(() => import('../pages/ops/OpsProgrammesPage').then(({ OpsProgrammesPage }) => ({ default: OpsProgrammesPage })));
const OpsMaterialsPage = lazy(() => import('../pages/ops/OpsMaterialsPage').then(({ OpsMaterialsPage }) => ({ default: OpsMaterialsPage })));
const OpsInvitationsPage = lazy(() => import('../pages/ops/OpsInvitationsPage').then(({ OpsInvitationsPage }) => ({ default: OpsInvitationsPage })));

function OpsHomeRedirect() {
  return <OpsDashboardPage />;
}

export function OpsApp() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
            <span>Loading Ops Console</span>
          </div>
        }
      >
      <Routes>
        <Route path="/login" element={<OpsLoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={[...OPS_ROLES]}>
              <OpsLayout />
            </ProtectedRoute>
          }>
          <Route index element={<OpsHomeRedirect />} />
          <Route path="users" element={<OpsUsersPage />} />
          <Route path="organisations" element={<OpsOrganisationsPage />} />
          <Route path="programmes" element={<OpsProgrammesPage />} />
          <Route path="materials" element={<OpsMaterialsPage />} />
          <Route path="invitations" element={<OpsInvitationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
