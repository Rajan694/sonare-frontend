import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/** The script lyrics are shown in; the server picks the LRCLIB version written in it. */
export type LyricsScript =
  'original' | 'latin' | 'devanagari' | 'gurmukhi' | 'arabic' | 'bengali' | 'gujarati' | 'tamil' | 'telugu';

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

const STORAGE_KEY = 'sonare.devicePrefs';

/** Preferences kept on this phone only (not the account). */
interface DevicePrefsStore {
  lyricsScript: LyricsScript;
  hydrate: () => Promise<void>;
  setLyricsScript: (script: LyricsScript) => void;
}

export const useDevicePrefsStore = create<DevicePrefsStore>((set) => ({
  lyricsScript: 'original',
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      if (LYRICS_SCRIPTS.some((s) => s.value === saved.lyricsScript)) set({ lyricsScript: saved.lyricsScript });
    } catch {
      // Defaults apply.
    }
  },
  setLyricsScript: (lyricsScript) => {
    set({ lyricsScript });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lyricsScript })).catch(() => {});
  },
}));

export function lyricsScriptLabel(script: LyricsScript): string {
  return LYRICS_SCRIPTS.find((s) => s.value === script)?.label ?? 'Original (as released)';
}
