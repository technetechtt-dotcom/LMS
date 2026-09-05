import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { getDefaultRouteForRole } from './utils/routing';
import { LMS_ROLES } from './config/authPortal';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleGate } from './components/layout/RoleGate';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RegisterPage } from './pages/RegisterPage';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';
import { DashboardPage } from './pages/DashboardPage';
import { LearnerDashboardPage } from './pages/LearnerDashboardPage';
import { LearnerCoursesPage } from './pages/LearnerCoursesPage';
import { FacilitatorDashboardPage } from './pages/FacilitatorDashboardPage';
import { FacilitatorAssessmentsPage } from './pages/FacilitatorAssessmentsPage';
import { FacilitatorCommunicationPage } from './pages/FacilitatorCommunicationPage';
import { FacilitatorLearnersPage } from './pages/FacilitatorLearnersPage';
import { FacilitatorProgressReportsPage } from './pages/FacilitatorProgressReportsPage';
import { ProgrammesPage } from './pages/ProgrammesPage';
import { LearnerProfilePage } from './pages/LearnerProfilePage';
import { LearnersPage } from './pages/LearnersPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { LearnerAssessmentsPage } from './pages/LearnerAssessmentsPage';
import { LearnerCertificatesPage } from './pages/LearnerCertificatesPage';
import { CompliancePage } from './pages/CompliancePage';
import { AuditPage } from './pages/AuditPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { MessagingPage } from './pages/MessagingPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { ReportsPage } from './pages/ReportsPage';
import { AttendancePage } from './pages/AttendancePage';
import { SETAExportsPage } from './pages/SETAExportsPage';
import { FacilitatorsPage } from './pages/FacilitatorsPage';
import { SETAFundedProgrammesPage } from './pages/SETAFundedProgrammesPage';
import { FacilitatorSETACompliancePage } from './pages/FacilitatorSETACompliancePage';
import { FacilitatorTrainingMaterialsPage } from './pages/FacilitatorTrainingMaterialsPage';
import { AssessmentBuilderPage } from './pages/AssessmentBuilderPage';
import { AssessmentTakingPage } from './pages/AssessmentTakingPage';
import { SubmissionReviewPage } from './pages/SubmissionReviewPage';
import { PoeArtifactReviewPage } from './pages/PoeArtifactReviewPage';
import { AssessorDashboardPage } from './pages/AssessorDashboardPage';
import { ModeratorDashboardPage } from './pages/ModeratorDashboardPage';
import { QaOfficerDashboardPage } from './pages/QaOfficerDashboardPage';
import { WorkplaceMentorDashboardPage } from './pages/WorkplaceMentorDashboardPage';
import { HelpPage } from './pages/HelpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProgrammeDetailPage } from './pages/ProgrammeDetailPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) {
    return <Navigate to="/login" replace />;
  }
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }
  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/certificates/verify/:code" element={<CertificateVerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={[...LMS_ROLES]}>
                <AppLayout />
              </ProtectedRoute>
            }>
            <Route index element={<HomeRedirect />} />

            <Route
              path="dashboard"
              element={
                <RoleGate allowedRoles={['Admin']}>
                  <DashboardPage />
                </RoleGate>
              }
            />
            <Route
              path="programmes"
              element={
                <RoleGate
                  allowedRoles={[
                    'Admin',
                    'Facilitator',
                    'Assessor',
                    'Moderator'
                  ]}>
                  <ProgrammesPage />
                </RoleGate>
              }
            />
            <Route
              path="programmes/:id"
              element={
                <RoleGate
                  allowedRoles={[
                    'Admin',
                    'Facilitator',
                    'Assessor',
                    'Moderator'
                  ]}>
                  <ProgrammeDetailPage />
                </RoleGate>
              }
            />
            <Route
              path="audit"
              element={
                <RoleGate
                  allowedRoles={['Admin', 'QA Officer', 'SETA Official']}>
                  <AuditPage />
                </RoleGate>
              }
            />
            <Route path="help" element={<HelpPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            <Route
              path="learners"
              element={
                <RoleGate allowedRoles={['Admin', 'QA Officer']}>
                  <LearnersPage />
                </RoleGate>
              }
            />
            <Route
              path="learner/:id"
              element={
                <RoleGate
                  allowedRoles={[
                    'Admin',
                    'Facilitator',
                    'Workplace Mentor',
                    'Learner',
                  ]}>
                  <LearnerProfilePage />
                </RoleGate>
              }
            />
            <Route
              path="assessments"
              element={
                <RoleGate allowedRoles={['Admin']}>
                  <AssessmentsPage />
                </RoleGate>
              }
            />
            <Route
              path="certificates"
              element={
                <RoleGate allowedRoles={['Admin']}>
                  <CertificatesPage />
                </RoleGate>
              }
            />

            <Route
              path="learner-dashboard"
              element={
                <RoleGate allowedRoles={['Learner']}>
                  <LearnerDashboardPage />
                </RoleGate>
              }
            />
            <Route
              path="learner-courses"
              element={
                <RoleGate allowedRoles={['Learner']}>
                  <LearnerCoursesPage />
                </RoleGate>
              }
            />
            <Route
              path="learner-courses/:courseId"
              element={
                <RoleGate allowedRoles={['Learner']}>
                  <CourseDetailPage />
                </RoleGate>
              }
            />
            <Route
              path="learner-assessments"
              element={
                <RoleGate allowedRoles={['Learner']}>
                  <LearnerAssessmentsPage />
                </RoleGate>
              }
            />
            <Route
              path="learner-certificates"
              element={
                <RoleGate allowedRoles={['Learner']}>
                  <LearnerCertificatesPage />
                </RoleGate>
              }
            />

            <Route
              path="facilitator-dashboard"
              element={
                <RoleGate allowedRoles={['Facilitator']}>
                  <FacilitatorDashboardPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitator-learners"
              element={
                <RoleGate allowedRoles={['Facilitator', 'Workplace Mentor']}>
                  <FacilitatorLearnersPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitator-training-materials"
              element={
                <RoleGate allowedRoles={['Facilitator']}>
                  <FacilitatorTrainingMaterialsPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitator-assessments"
              element={
                <RoleGate allowedRoles={['Admin', 'Facilitator']}>
                  <FacilitatorAssessmentsPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitator-progress-reports"
              element={
                <RoleGate allowedRoles={['Facilitator']}>
                  <FacilitatorProgressReportsPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitator-communication"
              element={
                <RoleGate allowedRoles={['Facilitator']}>
                  <FacilitatorCommunicationPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitator-seta-compliance"
              element={
                <RoleGate allowedRoles={['Facilitator']}>
                  <FacilitatorSETACompliancePage />
                </RoleGate>
              }
            />

            <Route
              path="assessor-dashboard"
              element={
                <RoleGate allowedRoles={['Assessor']}>
                  <AssessorDashboardPage />
                </RoleGate>
              }
            />
            <Route
              path="moderator-dashboard"
              element={
                <RoleGate allowedRoles={['Moderator']}>
                  <ModeratorDashboardPage />
                </RoleGate>
              }
            />
            <Route
              path="qa-dashboard"
              element={
                <RoleGate allowedRoles={['QA Officer']}>
                  <QaOfficerDashboardPage />
                </RoleGate>
              }
            />
            <Route
              path="workplace-mentor-dashboard"
              element={
                <RoleGate allowedRoles={['Workplace Mentor']}>
                  <WorkplaceMentorDashboardPage />
                </RoleGate>
              }
            />

            <Route
              path="seta-funded-programmes"
              element={
                <RoleGate allowedRoles={['SETA Official']}>
                  <SETAFundedProgrammesPage />
                </RoleGate>
              }
            />

            <Route
              path="assessment-builder"
              element={
                <RoleGate allowedRoles={['Admin', 'Facilitator']}>
                  <AssessmentBuilderPage />
                </RoleGate>
              }
            />
            <Route
              path="assessment-builder/:id"
              element={
                <RoleGate allowedRoles={['Admin', 'Facilitator']}>
                  <AssessmentBuilderPage />
                </RoleGate>
              }
            />
            <Route
              path="assessment/:id/take"
              element={
                <RoleGate allowedRoles={['Learner']}>
                  <AssessmentTakingPage />
                </RoleGate>
              }
            />
            <Route
              path="assessment/:id/submissions"
              element={
                <RoleGate
                  allowedRoles={[
                    'Admin',
                    'Facilitator',
                    'Assessor',
                    'Moderator'
                  ]}>
                  <SubmissionReviewPage />
                </RoleGate>
              }
            />
            <Route
              path="poe-artifacts/:id/review"
              element={
                <RoleGate
                  allowedRoles={[
                    'Admin',
                    'Facilitator',
                    'Assessor',
                    'Moderator',
                    'Learner',
                  ]}>
                  <PoeArtifactReviewPage />
                </RoleGate>
              }
            />

            <Route
              path="compliance"
              element={
                <RoleGate
                  allowedRoles={['Admin', 'QA Officer', 'SETA Official']}>
                  <CompliancePage />
                </RoleGate>
              }
            />
            <Route
              path="users"
              element={
                <RoleGate allowedRoles={['Admin']}>
                  <UserManagementPage />
                </RoleGate>
              }
            />
            <Route
              path="reports"
              element={
                <RoleGate
                  allowedRoles={['Admin', 'QA Officer', 'SETA Official']}>
                  <ReportsPage />
                </RoleGate>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="messages" element={<MessagingPage />} />
            <Route
              path="materials"
              element={
                <RoleGate
                  allowedRoles={[
                    'Admin',
                    'Facilitator',
                    'Learner',
                    'Workplace Mentor',
                  ]}>
                  <MaterialsPage />
                </RoleGate>
              }
            />
            <Route
              path="attendance"
              element={
                <RoleGate allowedRoles={['Admin', 'Facilitator', 'Learner']}>
                  <AttendancePage />
                </RoleGate>
              }
            />
            <Route
              path="seta-exports"
              element={
                <RoleGate allowedRoles={['Admin', 'SETA Official']}>
                  <SETAExportsPage />
                </RoleGate>
              }
            />
            <Route
              path="facilitators"
              element={
                <RoleGate allowedRoles={['Admin']}>
                  <FacilitatorsPage />
                </RoleGate>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </Router>
  );
}
export { App };
