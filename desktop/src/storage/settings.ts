import { useSyncExternalStore } from 'react';
import { api } from '../api/api';
import { isAuthenticated, onAuthChange, onAuthReady } from '../api/auth';

/**
 * Account-level preferences from GET/PUT /me/settings (contract §9).
 *
 * Only the fields that changed are sent: the backend keeps the ones it isn't sent, so a
 * change made on the phone since this app loaded its copy isn't overwritten.
 */
export type AudioQuality = 'low' | 'normal' | 'high';
export type DownloadFormat = 'opus' | 'm4a';

export interface UserSettings {
  eqPreset: string;
  gapless: boolean;
  normalization: boolean;
  streamQuality: AudioQuality;
  downloadQuality: AudioQuality;
  downloadFormat: DownloadFormat;
  stayOffline: boolean;
}

let settings: UserSettings = {
  eqPreset: 'Flat',
  gapless: false,
  normalization: true,
  streamQuality: 'high',
  downloadQuality: 'high',
  downloadFormat: 'opus',
  stayOffline: false,
};

const QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

/** Settings quality → the backend's `quality` parameter for /tracks/:id/stream. */
export const API_QUALITY: Record<AudioQuality, 'low' | 'normal' | 'high'> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
};

/** What the server sent, minus values this build doesn't know (e.g. the retired 'lossless'). */
function sanitize(s: Partial<UserSettings>): Partial<UserSettings> {
  const out = { ...s };
  if (!QUALITIES.includes(out.streamQuality as AudioQuality)) delete out.streamQuality;
  if (!QUALITIES.includes(out.downloadQuality as AudioQuality)) delete out.downloadQuality;
  if (out.downloadFormat !== 'opus' && out.downloadFormat !== 'm4a') delete out.downloadFormat;
  return out;
}

const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Changed since the last save, sent together once the user stops changing things. */
let unsaved: Partial<UserSettings> = {};
let loaded = false;

function emit() {
  for (const l of listeners) l();
}

export function getSettings(): UserSettings {
  return settings;
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateSettings(patch: Partial<UserSettings>): void {
  settings = { ...settings, ...patch };
  emit();
  clearTimeout(saveTimer);
  // Guests keep settings on this device only; there's no account to save them to.
  if (!isAuthenticated()) return;
  unsaved = { ...unsaved, ...patch };
  saveTimer = setTimeout(() => {
    const body = unsaved;
    unsaved = {};
    void api.saveSettings(body).catch(() => {
      // Offline — the local value still applies for this session.
    });
  }, 400);
}

let watchingAuth = false;

export function loadSettings(): void {
  if (!watchingAuth) {
    watchingAuth = true;
    // Signing in (again) brings that account's settings back.
    onAuthChange((user) => {
      if (!user) return;
      loaded = false;
      loadSettings();
    });
  }
  if (loaded) return;
  loaded = true;
  onAuthReady(() => {
    if (!isAuthenticated()) {
      loaded = false;
      return;
    }
    void api
      .getSettings()
      .then((s: Partial<UserSettings>) => {
        settings = { ...settings, ...sanitize(s) };
        emit();
      })
      .catch(() => {
        loaded = false;
      });
  });
}

export function useSettings(): UserSettings {
  return useSyncExternalStore(subscribeSettings, getSettings);
}
