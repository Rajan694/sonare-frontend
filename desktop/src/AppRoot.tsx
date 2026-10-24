import React from 'react';
import { Provider } from 'react-redux';
import App from './App';
import { api, onAiUnavailable, startAppConfigSync } from './api/api';
import { setAiAvailable } from './store/aiSlice';
import { startTitleSync } from '../../shared/ai/titleSync';
import type { TitleFix } from '../../shared/catalog/titleFixes';
import { startWaveformTap } from './audio/waveform';
import { songCache } from './audio/songCache';
import { store } from './store';

const TITLE_FIXES_KEY = 'sonare_ai_title_fixes';

let booted = false;
export const bootApp = () => {
  if (booted) return;
  booted = true;

  // GET /app-config: whether the desktop window may fetch YouTube itself (and with which client),
  // and in every build whether the AI features show.
  startAppConfigSync((config) => store.dispatch(setAiAvailable(config.ai === true)));
  onAiUnavailable(() => store.dispatch(setAiAvailable(false)));

  // Cleaner titles for messy YouTube uploads, worked out by the backend's AI (shared/ai/titleSync.ts).
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
};

export default function AppRoot() {
  bootApp();
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
