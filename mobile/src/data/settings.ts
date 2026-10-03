import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from './api';
import { useAuthStore } from './auth';

/**
 * Account settings the phone uses (GET/PUT /me/settings): download quality and format, the
 * equalizer preset, and whether Offline Mode should stick until switched back.
 * Signed in they follow the account, so they match the desktop app; guests keep them on
 * the phone. The download folder is per device and lives in store/downloads.ts instead.
 */

export type AudioQuality = 'low' | 'normal' | 'high';
export type DownloadFormat = 'opus' | 'm4a';

/** Settings quality → the backend's `quality` parameter for /tracks/:id/stream. */
export const API_QUALITY: Record<AudioQuality, 'low' | 'normal' | 'high'> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
};

/** The presets the Audio screen offers. The desktop app ignores names it doesn't know. */
export const EQ_PRESETS = ['Flat', 'Sonare', 'Bass', 'Vocal', 'Acoustic', 'Late night'];

const STORAGE_KEY = 'sonare.settings';
const QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

interface SettingsStore {
  downloadQuality: AudioQuality;
  downloadFormat: DownloadFormat;
  eqPreset: string;
  stayOffline: boolean;
  hydrate: () => Promise<void>;
  update: (
    patch: Partial<Pick<SettingsStore, 'downloadQuality' | 'downloadFormat' | 'eqPreset' | 'stayOffline'>>,
  ) => void;
}

function pick(s: Record<string, unknown>) {
  return {
    ...(QUALITIES.includes(s.downloadQuality as AudioQuality) && {
      downloadQuality: s.downloadQuality as AudioQuality,
    }),
    ...((s.downloadFormat === 'opus' || s.downloadFormat === 'm4a') && {
      downloadFormat: s.downloadFormat as DownloadFormat,
    }),
    ...(typeof s.eqPreset === 'string' && EQ_PRESETS.includes(s.eqPreset) && { eqPreset: s.eqPreset }),
    ...(typeof s.stayOffline === 'boolean' && { stayOffline: s.stayOffline }),
  };
}

/** What the phone keeps in AsyncStorage. */
function stored(s: SettingsStore) {
  return JSON.stringify({
    downloadQuality: s.downloadQuality,
    downloadFormat: s.downloadFormat,
    eqPreset: s.eqPreset,
    stayOffline: s.stayOffline,
  });
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Changed since the last save. Only these are sent: the server keeps what it isn't sent. */
let unsaved: Record<string, unknown> = {};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadQuality: 'high',
  downloadFormat: 'opus',
  eqPreset: 'Sonare',
  stayOffline: true,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set(pick(JSON.parse(raw)));
    } catch {
      // Nothing saved yet.
    }
    if (useAuthStore.getState().status !== 'signedIn') return;
    try {
      set(pick(await api.settings()));
      AsyncStorage.setItem(STORAGE_KEY, stored(get()));
    } catch {
      // Offline: the phone's copy applies.
    }
  },

  update: (patch) => {
    set(patch);
    AsyncStorage.setItem(STORAGE_KEY, stored(get()));
    if (useAuthStore.getState().status !== 'signedIn') return;
    unsaved = { ...unsaved, ...patch };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // Just what changed here, so the desktop's EQ / gapless / streaming choices are left alone.
      const body = unsaved;
      unsaved = {};
      api.saveSettings(body).catch(() => {});
    }, 400);
  },
}));
