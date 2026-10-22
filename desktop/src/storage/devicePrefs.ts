import { useSyncExternalStore } from 'react';

/**
 * Preferences that belong to this device rather than the account: the script lyrics are
 * shown in, and whether similar songs play when the queue ends. Kept in localStorage. Sonare
 * plays on the system's audio output.
 */

export type LyricsScript =
  'original' | 'latin' | 'devanagari' | 'gurmukhi' | 'arabic' | 'bengali' | 'gujarati' | 'tamil' | 'telugu';

/** Settings labels; the server matches LRCLIB versions by script (GET /tracks/:id/lyrics?script=). */
export const LYRICS_SCRIPTS: { value: LyricsScript; label: string }[] = [
  { value: 'original', label: 'Original (as released)' },
  { value: 'latin', label: 'English / Romanised' },
  { value: 'devanagari', label: 'Hindi / Bhojpuri (Devanagari)' },
  { value: 'gurmukhi', label: 'Punjabi (Gurmukhi)' },
  { value: 'arabic', label: 'Urdu (Arabic script)' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
];

export interface DevicePrefs {
  lyricsScript: LyricsScript;
  /** Keeps at least 10 songs lined up with similar ones (shared/player/autoplay.ts). */
  autoplaySimilar: boolean;
}

const KEY = 'sonare_device_prefs';
const DEFAULTS: DevicePrefs = { lyricsScript: 'original', autoplaySimilar: true };

const read = (): DevicePrefs => {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<DevicePrefs>) : {};
    const lyricsScript = LYRICS_SCRIPTS.some((s) => s.value === saved.lyricsScript)
      ? (saved.lyricsScript as LyricsScript)
      : DEFAULTS.lyricsScript;
    const autoplaySimilar =
      typeof saved.autoplaySimilar === 'boolean' ? saved.autoplaySimilar : DEFAULTS.autoplaySimilar;
    // Only known keys: an output device saved by an older version is dropped.
    return { lyricsScript, autoplaySimilar };
  } catch {
    return DEFAULTS;
  }
};

let prefs = read();
const listeners = new Set<() => void>();

export const getDevicePrefs = (): DevicePrefs => {
  return prefs;
};

export const updateDevicePrefs = (patch: Partial<DevicePrefs>): void => {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Applies for this session only.
  }
  for (const l of listeners) l();
};

export const useDevicePrefs = (): DevicePrefs => {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => prefs,
  );
};
