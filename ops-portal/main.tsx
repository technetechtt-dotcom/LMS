import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureAuthPortal } from '../src/config/authPortal';
import '../src/index.css';
import { OpsApp } from '../src/ops/OpsApp';
import { AuthProvider } from '../src/contexts/AuthContext';
import { Toaster } from 'sonner';

configureAuthPortal('ops');

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <AuthProvider>
      <OpsApp />
    </AuthProvider>
    <Toaster position="top-right" />
  </React.StrictMode>,
);
