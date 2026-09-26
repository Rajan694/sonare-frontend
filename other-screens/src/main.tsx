import React, { lazy, Suspense } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App';
import { CAPS } from './lib/caps';
import { installErrorReporting } from './lib/errorReporting';
import { initNeutralino } from './neutralino';
import { store } from './store';
import './styles.css';

// Neutralino has to be initialised before any window/tray/os call is made.
initNeutralino();
installErrorReporting();

// /admin is the web build's admin page: its own bundle, loaded only when asked for, and never
// in the Linux window (where the music app's routes send /admin back home).
const AdminApp = lazy(() => import('./admin/AdminApp'));
const isAdmin = CAPS.admin && /^\/admin(\/|$)/.test(window.location.pathname);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <Provider store={store}>
        <App />
      </Provider>
    )}
  </StrictMode>,
);
