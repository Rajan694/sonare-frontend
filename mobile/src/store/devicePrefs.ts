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
  /** Synced lyrics follow playback unless the user turns this off. */
  lyricsAutoScroll: boolean;
  hydrate: () => Promise<void>;
  setLyricsScript: (script: LyricsScript) => void;
  setLyricsAutoScroll: (on: boolean) => void;
}

const persist = (prefs: { lyricsScript: LyricsScript; lyricsAutoScroll: boolean }) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
};

export const useDevicePrefsStore = create<DevicePrefsStore>((set, get) => ({
  lyricsScript: 'original',
  lyricsAutoScroll: true,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      const lyricsScript = LYRICS_SCRIPTS.some((s) => s.value === saved.lyricsScript)
        ? (saved.lyricsScript as LyricsScript)
        : 'original';
      set({
        lyricsScript,
        lyricsAutoScroll: typeof saved.lyricsAutoScroll === 'boolean' ? saved.lyricsAutoScroll : true,
      });
    } catch {
      // Defaults apply.
    }
  },
  setLyricsScript: (lyricsScript) => {
    set({ lyricsScript });
    persist({ lyricsScript, lyricsAutoScroll: get().lyricsAutoScroll });
  },
  setLyricsAutoScroll: (lyricsAutoScroll) => {
    set({ lyricsAutoScroll });
    persist({ lyricsScript: get().lyricsScript, lyricsAutoScroll });
  },
}));

export const lyricsScriptLabel = (script: LyricsScript): string => {
  return LYRICS_SCRIPTS.find((s) => s.value === script)?.label ?? 'Original (as released)';
};
