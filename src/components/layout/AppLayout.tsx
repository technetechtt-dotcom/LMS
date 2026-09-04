import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { POPIAConsentModal } from './POPIAConsentModal';
import { FeedbackWidget } from '../feedback/FeedbackWidget';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { resolveLearnerProfilePath } from '../../utils/learnerNav';

export function AppLayout() {
  const { user, linkedLearnerId } = useAuth();
  const userRole = user?.role ?? 'Learner';
  const learnerProfilePath = user
    ? resolveLearnerProfilePath(user, linkedLearnerId)
    : undefined;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="flex h-screen bg-bg-page overflow-hidden">
      <POPIAConsentModal />

      {/* Desktop Sidebar */}
      <Sidebar
        userRole={userRole}
        learnerProfilePath={learnerProfilePath}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      

      {/* Mobile Sidebar Overlay */}
      <Sidebar
        userRole={userRole}
        learnerProfilePath={learnerProfilePath}
        isCollapsed={false}
        toggleCollapse={() => undefined}
        isMobile={true}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)} />
      

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary key={location.pathname}>
              <Outlet
                context={{
                  userRole
                }} />
              
            </ErrorBoundary>
          </div>
        </main>

        <FeedbackWidget />
      </div>
    </div>);

}