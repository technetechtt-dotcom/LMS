import React from 'react';
import './index.css';
import { configureAuthPortal } from './config/authPortal';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';

configureAuthPortal('lms');

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}
createRoot(rootEl).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
    <Toaster position="top-right" />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      void navigator.serviceWorker.register('/sw.js');
      return;
    }

    // A production worker must not cache Vite's dev client or source modules.
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister())),
    );
    if ('caches' in window) {
      void caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sf-lms-'))
            .map((key) => caches.delete(key)),
        ),
      );
    }
  });
}
