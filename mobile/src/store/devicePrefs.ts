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
  /** When the queue runs out, similar songs keep playing (shared/player/autoplay.ts). */
  autoplaySimilar: boolean;
  hydrate: () => Promise<void>;
  setLyricsScript: (script: LyricsScript) => void;
  setLyricsAutoScroll: (on: boolean) => void;
  setAutoplaySimilar: (on: boolean) => void;
}

type SavedPrefs = Pick<DevicePrefsStore, 'lyricsScript' | 'lyricsAutoScroll' | 'autoplaySimilar'>;

const persist = ({ lyricsScript, lyricsAutoScroll, autoplaySimilar }: SavedPrefs) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lyricsScript, lyricsAutoScroll, autoplaySimilar })).catch(
    () => {},
  );
};

export const useDevicePrefsStore = create<DevicePrefsStore>((set, get) => ({
  lyricsScript: 'original',
  lyricsAutoScroll: true,
  autoplaySimilar: true,
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
        autoplaySimilar: typeof saved.autoplaySimilar === 'boolean' ? saved.autoplaySimilar : true,
      });
    } catch {
      // Defaults apply.
    }
  },
  setLyricsScript: (lyricsScript) => {
    set({ lyricsScript });
    persist(get());
  },
  setLyricsAutoScroll: (lyricsAutoScroll) => {
    set({ lyricsAutoScroll });
    persist(get());
  },
  setAutoplaySimilar: (autoplaySimilar) => {
    set({ autoplaySimilar });
    persist(get());
  },
}));

export const lyricsScriptLabel = (script: LyricsScript): string => {
  return LYRICS_SCRIPTS.find((s) => s.value === script)?.label ?? 'Original (as released)';
};
