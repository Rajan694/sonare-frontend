import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  DEFAULT_SPATIAL,
  sanitizeSpatial,
  type SpatialCustom,
  type SpatialMode,
  type SpatialPresetId,
  type SpatialSettings,
} from '../../../shared/spatial';

/**
 * Spatial audio settings for this device.
 * Persisted in AsyncStorage ('sonare.spatial').
 */
const STORAGE_KEY = 'sonare.spatial';

export interface SpatialState extends SpatialSettings {
  /** Temporary bypass for A/B comparison without disabling spatial setting */
  bypass: boolean;
}

export interface SpatialStore extends SpatialState {
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: SpatialMode) => void;
  setPreset: (preset: SpatialPresetId) => void;
  setCustom: (patch: Partial<SpatialCustom>, opts?: boolean | { commit?: boolean }) => void;
  setBypass: (bypass: boolean) => void;
  update: (patch: Partial<SpatialSettings>) => void;
  resetCustom: () => void;
}

const DEFAULTS: SpatialState = {
  ...DEFAULT_SPATIAL,
  bypass: false,
};

const save = (s: SpatialSettings) => {
  const { enabled, mode, preset, custom } = s;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, mode, preset, custom })).catch(() => {});
};

export const useSpatialStore = create<SpatialStore>((set, get) => ({
  ...DEFAULTS,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeSpatial(parsed);
        set((current) => ({
          ...current,
          ...sanitized,
        }));
      }
    } catch {
      // Storage empty or unreadable
    }
  },

  setEnabled: (enabled) => {
    set({ enabled });
    save(get());
  },

  setMode: (mode) => {
    set({ mode });
    save(get());
  },

  setPreset: (preset) => {
    set({ preset });
    save(get());
  },

  setCustom: (patch, opts = true) => {
    const shouldCommit = typeof opts === 'boolean' ? opts : (opts?.commit ?? true);
    const current = get();
    const merged = { ...current.custom, ...patch };
    const sanitized = sanitizeSpatial({ ...current, custom: merged });
    set({ custom: sanitized.custom });
    if (shouldCommit) {
      save(get());
    }
  },

  setBypass: (bypass) => {
    set({ bypass });
  },

  update: (patch) => {
    const current = get();
    const sanitized = sanitizeSpatial({ ...current, ...patch });
    set(sanitized);
    save(get());
  },

  resetCustom: () => {
    set({ custom: { ...DEFAULT_SPATIAL.custom } });
    save(get());
  },
}));
