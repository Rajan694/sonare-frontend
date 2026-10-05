import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from './api';
import { useAuthStore } from './auth';

/**
 * Account settings the phone uses (GET/PUT /me/settings): download quality and format, the
 * equalizer preset, gapless playback, volume normalization, and whether Offline Mode should
 * stick until switched back.
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

/**
 * Equalizer presets: gains in dB for the 32, 64, 150, 400, 1k, 2.4k, 6k and 14k Hz bands.
 * The same names and values as the desktop app (desktop/src/audio/dsp.ts), because the
 * chosen preset follows the account from one device to the other.
 */
export const EQ_PRESET_GAINS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0],
  Sonare: [1, 4, 0, -1, 2, 5, 3, 0],
  Bass: [6, 5, 3.5, 1, 0, 0, 0, 0],
  Vocal: [-3, -2, -1, 1.5, 3.5, 3, 1, 0],
  Acoustic: [1, 2.5, 1.5, 0.5, 1, 2, 2.5, 2],
  'Late night': [-3, -2.5, -1, 0, 1, 0.5, -1.5, -3],
};
/** The presets the Audio screen offers. */
export const EQ_PRESETS = Object.keys(EQ_PRESET_GAINS);
/** Bands moved by hand. Kept on the phone only: the gains themselves aren't in the account. */
export const CUSTOM_PRESET = 'Custom';

const STORAGE_KEY = 'sonare.settings';
const QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

interface SettingsStore {
  downloadQuality: AudioQuality;
  downloadFormat: DownloadFormat;
  eqPreset: string;
  gapless: boolean;
  normalization: boolean;
  stayOffline: boolean;
  hydrate: () => Promise<void>;
  update: (
    patch: Partial<
      Pick<
        SettingsStore,
        'downloadQuality' | 'downloadFormat' | 'eqPreset' | 'gapless' | 'normalization' | 'stayOffline'
      >
    >,
  ) => void;
}

const pick = (s: Record<string, unknown>) => {
  return {
    ...(QUALITIES.includes(s.downloadQuality as AudioQuality) && {
      downloadQuality: s.downloadQuality as AudioQuality,
    }),
    ...((s.downloadFormat === 'opus' || s.downloadFormat === 'm4a') && {
      downloadFormat: s.downloadFormat as DownloadFormat,
    }),
    ...(typeof s.eqPreset === 'string' && EQ_PRESETS.includes(s.eqPreset) && { eqPreset: s.eqPreset }),
    ...(typeof s.gapless === 'boolean' && { gapless: s.gapless }),
    ...(typeof s.normalization === 'boolean' && { normalization: s.normalization }),
    ...(typeof s.stayOffline === 'boolean' && { stayOffline: s.stayOffline }),
  };
};

/** What the phone saved: like the account's fields, plus a hand-made (Custom) EQ. */
const pickStored = (s: Record<string, unknown>) => {
  return { ...pick(s), ...(s.eqPreset === CUSTOM_PRESET && { eqPreset: CUSTOM_PRESET }) };
};

/** What the phone keeps in AsyncStorage. */
const stored = (s: SettingsStore) => {
  return JSON.stringify({
    downloadQuality: s.downloadQuality,
    downloadFormat: s.downloadFormat,
    eqPreset: s.eqPreset,
    gapless: s.gapless,
    normalization: s.normalization,
    stayOffline: s.stayOffline,
  });
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Changed since the last save. Only these are sent: the server keeps what it isn't sent. */
let unsaved: Record<string, unknown> = {};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadQuality: 'high',
  downloadFormat: 'opus',
  eqPreset: 'Sonare',
  gapless: true,
  normalization: false,
  stayOffline: true,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set(pickStored(JSON.parse(raw)));
    } catch {
      // Nothing saved yet.
    }
    if (useAuthStore.getState().status !== 'signedIn') return;
    try {
      const fromAccount = pick(await api.settings());
      // A hand-tuned EQ on this phone stays: the account only knows preset names.
      if (get().eqPreset === CUSTOM_PRESET) delete fromAccount.eqPreset;
      set(fromAccount);
      AsyncStorage.setItem(STORAGE_KEY, stored(get()));
    } catch {
      // Offline: the phone's copy applies.
    }
  },

  update: (patch) => {
    set(patch);
    AsyncStorage.setItem(STORAGE_KEY, stored(get()));
    if (useAuthStore.getState().status !== 'signedIn') return;
    const { eqPreset, ...rest } = patch;
    unsaved = { ...unsaved, ...rest, ...(eqPreset !== undefined && eqPreset !== CUSTOM_PRESET && { eqPreset }) };
    if (Object.keys(unsaved).length === 0) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // Just what changed here, so the desktop's EQ / gapless / streaming choices are left alone.
      const body = unsaved;
      unsaved = {};
      api.saveSettings(body).catch(() => {});
    }, 400);
  },
}));
