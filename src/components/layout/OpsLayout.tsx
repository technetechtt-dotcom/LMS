import React from 'react';
import { Outlet } from 'react-router-dom';
import { OpsSidebar } from './OpsSidebar';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export function OpsLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <OpsSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
