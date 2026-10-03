import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from './api';
import { useAuthStore } from './auth';

/**
 * Account settings the phone uses (GET/PUT /me/settings): download quality and format.
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

const STORAGE_KEY = 'sonare.settings';
const QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

interface SettingsStore {
  downloadQuality: AudioQuality;
  downloadFormat: DownloadFormat;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Pick<SettingsStore, 'downloadQuality' | 'downloadFormat'>>) => void;
}

function pick(s: Record<string, unknown>) {
  return {
    ...(QUALITIES.includes(s.downloadQuality as AudioQuality) && {
      downloadQuality: s.downloadQuality as AudioQuality,
    }),
    ...((s.downloadFormat === 'opus' || s.downloadFormat === 'm4a') && {
      downloadFormat: s.downloadFormat as DownloadFormat,
    }),
  };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Changed since the last save. Only these are sent: the server keeps what it isn't sent. */
let unsaved: Record<string, unknown> = {};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadQuality: 'high',
  downloadFormat: 'opus',

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
      void AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          downloadQuality: get().downloadQuality,
          downloadFormat: get().downloadFormat,
        }),
      );
    } catch {
      // Offline: the phone's copy applies.
    }
  },

  update: (patch) => {
    set(patch);
    const { downloadQuality, downloadFormat } = get();
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ downloadQuality, downloadFormat }));
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
