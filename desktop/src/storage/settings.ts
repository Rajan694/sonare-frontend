import { useSyncExternalStore } from 'react';
import { api } from '../api/api';
import { getCurrentUser, isAuthenticated, onAuthChange, onAuthReady } from '../api/auth';

/**
 * Preferences, kept on this device (guests and offline included) and, signed in, in the
 * account (GET/PUT /me/settings, contract §9).
 *
 * A change applies at once and is saved here; it waits in an "unsynced" list until the account
 * has it, so a change made offline (or as a guest who then signs in) reaches the account once
 * it can. Only changed fields are sent: the backend keeps the ones it isn't sent, so a change
 * made on the phone since this app loaded its copy isn't overwritten.
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

/** The same defaults on both apps and the backend. */
export const DEFAULT_SETTINGS: UserSettings = {
  eqPreset: 'Sonare',
  gapless: true,
  normalization: true,
  streamQuality: 'high',
  downloadQuality: 'high',
  downloadFormat: 'opus',
  stayOffline: false,
};

const STORE_KEY = 'sonare_settings';
/** Changes the account doesn't have yet, and whose they are (null: made as a guest). */
const UNSYNCED_KEY = 'sonare_settings_unsynced';

const readJson = (key: string): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the values still apply until the app closes.
  }
};

const QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

/** Settings quality → the backend's `quality` parameter for /tracks/:id/stream. */
export const API_QUALITY: Record<AudioQuality, 'low' | 'normal' | 'high'> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
};

/** Known fields with usable values only (the server may send ones this build retired, e.g. 'lossless'). */
const sanitize = (s: Record<string, unknown> | null | undefined): Partial<UserSettings> => {
  if (!s) return {};
  const out: Partial<UserSettings> = {};
  if (typeof s.eqPreset === 'string' && s.eqPreset) out.eqPreset = s.eqPreset;
  if (typeof s.gapless === 'boolean') out.gapless = s.gapless;
  if (typeof s.normalization === 'boolean') out.normalization = s.normalization;
  if (typeof s.stayOffline === 'boolean') out.stayOffline = s.stayOffline;
  if (QUALITIES.includes(s.streamQuality as AudioQuality)) out.streamQuality = s.streamQuality as AudioQuality;
  if (QUALITIES.includes(s.downloadQuality as AudioQuality)) out.downloadQuality = s.downloadQuality as AudioQuality;
  if (s.downloadFormat === 'opus' || s.downloadFormat === 'm4a') out.downloadFormat = s.downloadFormat;
  return out;
};

let settings: UserSettings = { ...DEFAULT_SETTINGS, ...sanitize(readJson(STORE_KEY)) };

const savedUnsynced = readJson(UNSYNCED_KEY);
let unsynced: { userId: string | null; changes: Partial<UserSettings> } = {
  userId: typeof savedUnsynced?.userId === 'string' ? savedUnsynced.userId : null,
  changes: sanitize(savedUnsynced?.changes as Record<string, unknown> | undefined),
};

const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let sending = false;
let loaded = false;

const emit = () => {
  for (const l of listeners) l();
};

export const getSettings = (): UserSettings => {
  return settings;
};

export const subscribeSettings = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Waiting changes that belong to another account than the signed-in one are dropped. */
const unsyncedFor = (userId: string): Partial<UserSettings> => {
  if (unsynced.userId !== null && unsynced.userId !== userId) {
    unsynced = { userId, changes: {} };
    writeJson(UNSYNCED_KEY, unsynced);
  }
  return unsynced.changes;
};

/** Sends what the account doesn't have yet; on failure it stays queued for the next chance. */
const sendUnsynced = async (): Promise<void> => {
  const user = getCurrentUser();
  if (!user || !isAuthenticated() || sending) return;
  const body = { ...unsyncedFor(user.id) };
  if (!Object.keys(body).length) return;
  sending = true;
  try {
    await api.saveSettings(body);
    // Keep anything changed again while the request was out.
    const left = { ...unsynced.changes };
    for (const [k, v] of Object.entries(body))
      if (left[k as keyof UserSettings] === v) delete left[k as keyof UserSettings];
    unsynced = { userId: user.id, changes: left };
    writeJson(UNSYNCED_KEY, unsynced);
  } catch {
    // Offline or the server is down: tried again when the network is back or on the next change.
  } finally {
    sending = false;
  }
};

export const updateSettings = (patch: Partial<UserSettings>): void => {
  settings = { ...settings, ...patch };
  writeJson(STORE_KEY, settings);
  unsynced = { userId: getCurrentUser()?.id ?? unsynced.userId, changes: { ...unsynced.changes, ...patch } };
  writeJson(UNSYNCED_KEY, unsynced);
  emit();
  clearTimeout(saveTimer);
  // Guests keep them here; they go to the account once someone signs in.
  if (!isAuthenticated()) return;
  // Sent together once the user stops changing things.
  saveTimer = setTimeout(() => void sendUnsynced(), 400);
};

let watching = false;

export const loadSettings = (): void => {
  if (!watching) {
    watching = true;
    // Signing in (again) brings that account's settings back.
    onAuthChange((user) => {
      if (!user) return;
      loaded = false;
      loadSettings();
    });
    // Back online: the account gets what changed meanwhile, and this device what changed there.
    window.addEventListener('online', () => {
      loaded = false;
      loadSettings();
    });
  }
  if (loaded) return;
  loaded = true;
  onAuthReady(() => {
    const user = getCurrentUser();
    if (!user || !isAuthenticated()) {
      loaded = false;
      return;
    }
    void api
      .getSettings()
      .then((s: Partial<UserSettings>) => {
        // What changed on this device and isn't in the account yet wins over the account's copy.
        settings = { ...settings, ...sanitize(s as Record<string, unknown>), ...unsyncedFor(user.id) };
        writeJson(STORE_KEY, settings);
        emit();
        return sendUnsynced();
      })
      .catch(() => {
        loaded = false;
      });
  });
};

export const useSettings = (): UserSettings => {
  return useSyncExternalStore(subscribeSettings, getSettings);
};
