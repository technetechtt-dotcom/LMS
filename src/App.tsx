import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { getDefaultRouteForRole } from './utils/routing';
import { LMS_ROLES } from './config/authPortal';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleGate } from './components/layout/RoleGate';
const LoginPage = lazy(() => import('./pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(({ OnboardingPage }) => ({ default: OnboardingPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })));
const CertificateVerifyPage = lazy(() => import('./pages/CertificateVerifyPage').then(({ CertificateVerifyPage }) => ({ default: CertificateVerifyPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const LearnerDashboardPage = lazy(() => import('./pages/LearnerDashboardPage').then(({ LearnerDashboardPage }) => ({ default: LearnerDashboardPage })));
const LearnerCoursesPage = lazy(() => import('./pages/LearnerCoursesPage').then(({ LearnerCoursesPage }) => ({ default: LearnerCoursesPage })));
const FacilitatorDashboardPage = lazy(() => import('./pages/FacilitatorDashboardPage').then(({ FacilitatorDashboardPage }) => ({ default: FacilitatorDashboardPage })));
const FacilitatorAssessmentsPage = lazy(() => import('./pages/FacilitatorAssessmentsPage').then(({ FacilitatorAssessmentsPage }) => ({ default: FacilitatorAssessmentsPage })));
const FacilitatorCommunicationPage = lazy(() => import('./pages/FacilitatorCommunicationPage').then(({ FacilitatorCommunicationPage }) => ({ default: FacilitatorCommunicationPage })));
const FacilitatorLearnersPage = lazy(() => import('./pages/FacilitatorLearnersPage').then(({ FacilitatorLearnersPage }) => ({ default: FacilitatorLearnersPage })));
const FacilitatorProgressReportsPage = lazy(() => import('./pages/FacilitatorProgressReportsPage').then(({ FacilitatorProgressReportsPage }) => ({ default: FacilitatorProgressReportsPage })));
const ProgrammesPage = lazy(() => import('./pages/ProgrammesPage').then(({ ProgrammesPage }) => ({ default: ProgrammesPage })));
const LearnerProfilePage = lazy(() => import('./pages/LearnerProfilePage').then(({ LearnerProfilePage }) => ({ default: LearnerProfilePage })));
const LearnersPage = lazy(() => import('./pages/LearnersPage').then(({ LearnersPage }) => ({ default: LearnersPage })));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage').then(({ AssessmentsPage }) => ({ default: AssessmentsPage })));
const LearnerAssessmentsPage = lazy(() => import('./pages/LearnerAssessmentsPage').then(({ LearnerAssessmentsPage }) => ({ default: LearnerAssessmentsPage })));
const LearnerCertificatesPage = lazy(() => import('./pages/LearnerCertificatesPage').then(({ LearnerCertificatesPage }) => ({ default: LearnerCertificatesPage })));
const CompliancePage = lazy(() => import('./pages/CompliancePage').then(({ CompliancePage }) => ({ default: CompliancePage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then(({ AuditPage }) => ({ default: AuditPage })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then(({ UserManagementPage }) => ({ default: UserManagementPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })));
const MessagingPage = lazy(() => import('./pages/MessagingPage').then(({ MessagingPage }) => ({ default: MessagingPage })));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage').then(({ MaterialsPage }) => ({ default: MaterialsPage })));
const CertificatesPage = lazy(() => import('./pages/CertificatesPage').then(({ CertificatesPage }) => ({ default: CertificatesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(({ ReportsPage }) => ({ default: ReportsPage })));
const AttendancePage = lazy(() => import('./pages/AttendancePage').then(({ AttendancePage }) => ({ default: AttendancePage })));
const SETAExportsPage = lazy(() => import('./pages/SETAExportsPage').then(({ SETAExportsPage }) => ({ default: SETAExportsPage })));
const FacilitatorsPage = lazy(() => import('./pages/FacilitatorsPage').then(({ FacilitatorsPage }) => ({ default: FacilitatorsPage })));
const SETAFundedProgrammesPage = lazy(() => import('./pages/SETAFundedProgrammesPage').then(({ SETAFundedProgrammesPage }) => ({ default: SETAFundedProgrammesPage })));
const FacilitatorSETACompliancePage = lazy(() => import('./pages/FacilitatorSETACompliancePage').then(({ FacilitatorSETACompliancePage }) => ({ default: FacilitatorSETACompliancePage })));
const FacilitatorTrainingMaterialsPage = lazy(() => import('./pages/FacilitatorTrainingMaterialsPage').then(({ FacilitatorTrainingMaterialsPage }) => ({ default: FacilitatorTrainingMaterialsPage })));
const AssessmentBuilderPage = lazy(() => import('./pages/AssessmentBuilderPage').then(({ AssessmentBuilderPage }) => ({ default: AssessmentBuilderPage })));
const AssessmentTakingPage = lazy(() => import('./pages/AssessmentTakingPage').then(({ AssessmentTakingPage }) => ({ default: AssessmentTakingPage })));
const SubmissionReviewPage = lazy(() => import('./pages/SubmissionReviewPage').then(({ SubmissionReviewPage }) => ({ default: SubmissionReviewPage })));
const PoeArtifactReviewPage = lazy(() => import('./pages/PoeArtifactReviewPage').then(({ PoeArtifactReviewPage }) => ({ default: PoeArtifactReviewPage })));
const AssessorDashboardPage = lazy(() => import('./pages/AssessorDashboardPage').then(({ AssessorDashboardPage }) => ({ default: AssessorDashboardPage })));
const ModeratorDashboardPage = lazy(() => import('./pages/ModeratorDashboardPage').then(({ ModeratorDashboardPage }) => ({ default: ModeratorDashboardPage })));
const QaOfficerDashboardPage = lazy(() => import('./pages/QaOfficerDashboardPage').then(({ QaOfficerDashboardPage }) => ({ default: QaOfficerDashboardPage })));
const WorkplaceMentorDashboardPage = lazy(() => import('./pages/WorkplaceMentorDashboardPage').then(({ WorkplaceMentorDashboardPage }) => ({ default: WorkplaceMentorDashboardPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(({ HelpPage }) => ({ default: HelpPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })));
const ProgrammeDetailPage = lazy(() => import('./pages/ProgrammeDetailPage').then(({ ProgrammeDetailPage }) => ({ default: ProgrammeDetailPage })));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage').then(({ CourseDetailPage }) => ({ default: CourseDetailPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(({ NotFoundPage }) => ({ default: NotFoundPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(({ NotificationsPage }) => ({ default: NotificationsPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(({ PrivacyPolicyPage }) => ({ default: PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(({ TermsPage }) => ({ default: TermsPage })));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-navy" />
    </div>
  );
}
function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) {
    return <Navigate to="/login" replace />;
  }
  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
        <span className="sr-only">Loading account</span>
        <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-navy" />
      </div>
    );
  }
  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    </Router>
  );
}
export { App };
