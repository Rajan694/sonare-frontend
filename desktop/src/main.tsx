import React, { lazy, Suspense } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App';
import { CAPS } from './lib/caps';
import { installErrorReporting } from './lib/errorReporting';
import { initNeutralino } from './neutralino';
import { api, onAiUnavailable, startAppConfigSync } from './api/api';
import { setAiAvailable } from './store/aiSlice';
import { startTitleSync } from '../../shared/ai/titleSync';
import type { TitleFix } from '../../shared/catalog/titleFixes';
import { startWaveformTap } from './audio/waveform';
import { songCache } from './audio/songCache';
import { store } from './store';
import './styles.css';

// Neutralino has to be initialised before any window/tray/os call is made.
initNeutralino();
installErrorReporting();

// GET /app-config: whether the desktop window may fetch YouTube itself (and with which client),
// and in every build whether the AI features show.
startAppConfigSync((config) => store.dispatch(setAiAvailable(config.ai === true)));
onAiUnavailable(() => store.dispatch(setAiAvailable(false)));

// Cleaner titles for messy YouTube uploads, worked out by the backend's AI (shared/ai/titleSync.ts).
const TITLE_FIXES_KEY = 'sonare_ai_title_fixes';
startTitleSync({
  post: (items) => api.aiTitles(items),
  enabled: () => store.getState().ai.available && navigator.onLine,
  load: async () => JSON.parse(localStorage.getItem(TITLE_FIXES_KEY) ?? 'null') as Record<string, TitleFix> | null,
  save: async (fixes) => localStorage.setItem(TITLE_FIXES_KEY, JSON.stringify(fixes)),
});

// Songs nobody has uploaded a waveform for get theirs filled in as they play (audio/waveform.ts).
startWaveformTap();

// Web build: songs played once are kept (up to 100 MB) and play again without a download.
songCache.register();

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
