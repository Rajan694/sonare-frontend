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
export const DEFAULT_CROSSFADE_MS = 6000;

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
  /** 0.5..2.0 in steps of 0.05. */
  speed: number;
  /** -6..6 semitones in steps of 0.5; 0 is normal. */
  pitch: number;
  /** Volume fades on play, pause and track advance. */
  fades: boolean;
  /** Whether crossfading between tracks is enabled. */
  crossfade: boolean;
  /** Crossfade duration in ms: 1000..12000 in steps of 500 (default 6000). */
  crossfadeMs: number;
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
  pitch: 0,
  fades: false,
  crossfade: false,
  crossfadeMs: DEFAULT_CROSSFADE_MS,
};

const clampDb = (db: number) => Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, Math.round(db * 2) / 2));
const clampPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const clampSpeed = (s: number) => {
  const clamped = Math.max(0.5, Math.min(2, s));
  return Math.round(clamped * 20) / 20;
};
const clampPitch = (p: number) => {
  const clamped = Math.max(-6, Math.min(6, p));
  return Math.round(clamped * 2) / 2;
};
const clampCrossfadeMs = (ms: number) => {
  const clamped = Math.max(1000, Math.min(12000, ms));
  return Math.round(clamped / 500) * 500;
};

export const sanitize = (s: Record<string, unknown>): Partial<AudioState> => {
  const res: Partial<AudioState> = {
    ...(typeof s.enabled === 'boolean' && { enabled: s.enabled }),
    ...(Array.isArray(s.customGains) &&
      s.customGains.length === EQ_BANDS.length &&
      s.customGains.every((g) => typeof g === 'number') && { customGains: s.customGains.map(clampDb) }),
    ...(typeof s.bassBoost === 'number' && !Number.isNaN(s.bassBoost) && { bassBoost: clampPercent(s.bassBoost) }),
    ...(typeof s.virtualizer === 'number' &&
      !Number.isNaN(s.virtualizer) && { virtualizer: clampPercent(s.virtualizer) }),
    ...(typeof s.speed === 'number' && !Number.isNaN(s.speed) && { speed: clampSpeed(s.speed) }),
    ...(typeof s.pitch === 'number' && !Number.isNaN(s.pitch) && { pitch: clampPitch(s.pitch) }),
    ...(typeof s.fades === 'boolean' && { fades: s.fades }),
    ...(typeof s.crossfade === 'boolean' && { crossfade: s.crossfade }),
  };

  if (typeof s.crossfadeMs === 'number' && !Number.isNaN(s.crossfadeMs)) {
    if (s.crossfadeMs === 0) {
      res.crossfade = false;
    } else {
      res.crossfadeMs = clampCrossfadeMs(s.crossfadeMs);
      if (s.crossfade === undefined) res.crossfade = true;
    }
  } else if (s.crossfade === true && s.crossfadeMs === undefined) {
    res.crossfadeMs = DEFAULT_CROSSFADE_MS;
  }

  return res;
};

const save = (s: AudioState) => {
  const { enabled, customGains, bassBoost, virtualizer, speed, pitch, fades, crossfade, crossfadeMs } = s;
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ enabled, customGains, bassBoost, virtualizer, speed, pitch, fades, crossfade, crossfadeMs }),
  ).catch(() => {});
};

/** The band gains in effect: the chosen preset's, or the hand-made ones. */
export const currentGains = (preset: string = useSettingsStore.getState().eqPreset): number[] => {
  return preset === CUSTOM_PRESET
    ? useAudioStore.getState().customGains
    : (EQ_PRESET_GAINS[preset] ?? EQ_PRESET_GAINS.Flat);
};

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
