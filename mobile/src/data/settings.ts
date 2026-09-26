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
export const API_QUALITY: Record<AudioQuality, 'auto' | 'low' | 'high'> = { low: 'low', normal: 'auto', high: 'high' };

const STORAGE_KEY = 'sonare.settings';
const QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

interface SettingsStore {
  downloadQuality: AudioQuality;
  downloadFormat: DownloadFormat;
  /** Everything else the server sent, sent back untouched on save. */
  server: Record<string, unknown>;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Pick<SettingsStore, 'downloadQuality' | 'downloadFormat'>>) => void;
}

function pick(s: Record<string, unknown>) {
  return {
    ...(QUALITIES.includes(s.downloadQuality as AudioQuality) && { downloadQuality: s.downloadQuality as AudioQuality }),
    ...((s.downloadFormat === 'opus' || s.downloadFormat === 'm4a') && { downloadFormat: s.downloadFormat as DownloadFormat }),
  };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadQuality: 'high',
  downloadFormat: 'opus',
  server: {},

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set(pick(JSON.parse(raw)));
    } catch {
      // Nothing saved yet.
    }
    if (useAuthStore.getState().status !== 'signedIn') return;
    try {
      const server = await api.settings();
      set({ server, ...pick(server) });
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ downloadQuality: get().downloadQuality, downloadFormat: get().downloadFormat }));
    } catch {
      // Offline: the phone's copy applies.
    }
  },

  update: patch => {
    set(patch);
    const { downloadQuality, downloadFormat, server } = get();
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ downloadQuality, downloadFormat }));
    if (useAuthStore.getState().status !== 'signedIn') return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // The whole object, so the desktop's EQ / gapless / streaming choices are kept.
      api.saveSettings({ ...server, downloadQuality, downloadFormat }).catch(() => {});
    }, 400);
  },
}));
