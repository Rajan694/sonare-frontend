import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { CUSTOM_PRESET, EQ_PRESET_GAINS, useSettingsStore } from '../data/settings';

/**
 * Audio settings that belong to this phone rather than the account: the equalizer's master
 * switch and hand-made band gains, bass boost, virtualizer, playback speed and crossfade.
 * The preset, gapless and normalization follow the account (data/settings.ts).
 * The audio engine (components/music/AudioEngine.tsx) sends all of it to the native player.
 */

/** Centre frequencies of the equalizer bands, same as the desktop app. */
export const EQ_BANDS = [32, 64, 150, 400, 1000, 2400, 6000, 14000] as const;
export const EQ_LABELS = ['32', '64', '150', '400', '1k', '2.4k', '6k', '14k'] as const;
export const EQ_MAX_DB = 12;
export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export const CROSSFADE_MS = 6000;

const STORAGE_KEY = 'sonare.audio';

interface AudioState {
  /** Master switch for the equalizer, bass boost, virtualizer and normalization. */
  enabled: boolean;
  /** Band gains for the Custom preset, in dB. */
  customGains: number[];
  /** 0..100. */
  bassBoost: number;
  /** 0..100. */
  virtualizer: number;
  speed: number;
  crossfade: boolean;
}

interface AudioStore extends AudioState {
  hydrate: () => Promise<void>;
  update: (patch: Partial<AudioState>) => void;
  /** Moves one band; turns the preset into Custom starting from the current curve. */
  setBand: (index: number, db: number) => void;
}

const DEFAULTS: AudioState = {
  enabled: true,
  customGains: [...EQ_PRESET_GAINS.Flat],
  bassBoost: 0,
  virtualizer: 0,
  speed: 1,
  crossfade: false,
};

const clampDb = (db: number) => Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, Math.round(db * 2) / 2));
const clampPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function sanitize(s: Record<string, unknown>): Partial<AudioState> {
  return {
    ...(typeof s.enabled === 'boolean' && { enabled: s.enabled }),
    ...(Array.isArray(s.customGains) &&
      s.customGains.length === EQ_BANDS.length &&
      s.customGains.every((g) => typeof g === 'number') && { customGains: s.customGains.map(clampDb) }),
    ...(typeof s.bassBoost === 'number' && { bassBoost: clampPercent(s.bassBoost) }),
    ...(typeof s.virtualizer === 'number' && { virtualizer: clampPercent(s.virtualizer) }),
    ...(typeof s.speed === 'number' && (SPEEDS as readonly number[]).includes(s.speed) && { speed: s.speed }),
    ...(typeof s.crossfade === 'boolean' && { crossfade: s.crossfade }),
  };
}

function save(s: AudioState) {
  const { enabled, customGains, bassBoost, virtualizer, speed, crossfade } = s;
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ enabled, customGains, bassBoost, virtualizer, speed, crossfade }),
  ).catch(() => {});
}

/** The band gains in effect: the chosen preset's, or the hand-made ones. */
export function currentGains(preset: string = useSettingsStore.getState().eqPreset): number[] {
  return preset === CUSTOM_PRESET
    ? useAudioStore.getState().customGains
    : (EQ_PRESET_GAINS[preset] ?? EQ_PRESET_GAINS.Flat);
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  ...DEFAULTS,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set(sanitize(JSON.parse(raw)));
    } catch {
      // Nothing saved yet.
    }
  },

  update: (patch) => {
    set(sanitize(patch as Record<string, unknown>));
    save(get());
  },

  setBand: (index, db) => {
    const gains = [...currentGains()];
    gains[index] = clampDb(db);
    set({ customGains: gains });
    save(get());
    if (useSettingsStore.getState().eqPreset !== CUSTOM_PRESET) {
      useSettingsStore.getState().update({ eqPreset: CUSTOM_PRESET });
    }
  },
}));
