import { useSyncExternalStore } from 'react';

/**
 * Preferences that belong to this device rather than the account: which speaker to play
 * on, and the script lyrics are shown in. Kept in localStorage.
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
  /** An output device id from enumerateDevices / pactl; empty is the system default. */
  audioOutputId: string;
}

const KEY = 'sonare_device_prefs';
const DEFAULTS: DevicePrefs = { lyricsScript: 'original', audioOutputId: '' };

function read(): DevicePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<DevicePrefs>) : {};
    const lyricsScript = LYRICS_SCRIPTS.some((s) => s.value === saved.lyricsScript)
      ? (saved.lyricsScript as LyricsScript)
      : DEFAULTS.lyricsScript;
    return { ...DEFAULTS, ...saved, lyricsScript };
  } catch {
    return DEFAULTS;
  }
}

let prefs = read();
const listeners = new Set<() => void>();

export function getDevicePrefs(): DevicePrefs {
  return prefs;
}

export function updateDevicePrefs(patch: Partial<DevicePrefs>): void {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Applies for this session only.
  }
  for (const l of listeners) l();
}

export function useDevicePrefs(): DevicePrefs {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => prefs,
  );
}
