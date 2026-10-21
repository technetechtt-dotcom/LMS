import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { OpsSidebar } from './OpsSidebar';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export function OpsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <OpsSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="lg:hidden sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
            aria-label="Open operations navigation"
            onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </div>
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Keep the shell mounted while a page chunk loads. */}
          <ErrorBoundary>
            <Suspense
              fallback={
                <div role="status" aria-live="polite" className="text-sm text-slate-500">
                  Loading Ops Overview
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
