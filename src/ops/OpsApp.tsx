import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OpsLayout } from '../components/layout/OpsLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { OpsLoginPage } from './OpsLoginPage';
import { OpsDashboardPage } from '../pages/ops/OpsDashboardPage';
import { OpsUsersPage } from '../pages/ops/OpsUsersPage';
import { OpsOrganisationsPage } from '../pages/ops/OpsOrganisationsPage';
import { OpsProgrammesPage } from '../pages/ops/OpsProgrammesPage';
import { OpsMaterialsPage } from '../pages/ops/OpsMaterialsPage';
import { OpsInvitationsPage } from '../pages/ops/OpsInvitationsPage';
import { OPS_ROLES } from '../config/authPortal';

function OpsHomeRedirect() {
  return <OpsDashboardPage />;
}

export function OpsApp() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
