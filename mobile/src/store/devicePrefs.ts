import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { HeadsetAction, HeadsetActions } from '../native/SonarePlayer';

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

export const DEFAULT_HEADSET_ACTIONS: HeadsetActions = {
  single: 'playPause',
  double: 'next',
  triple: 'previous',
};

export const HEADSET_ACTIONS: { value: HeadsetAction; label: string }[] = [
  { value: 'playPause', label: 'Play/pause' },
  { value: 'next', label: 'Next' },
  { value: 'previous', label: 'Previous' },
  { value: 'like', label: 'Like' },
  { value: 'none', label: 'Nothing' },
];

export const headsetActionLabel = (action: HeadsetAction): string =>
  HEADSET_ACTIONS.find((a) => a.value === action)?.label ?? 'Nothing';

const VALID_HEADSET_ACTIONS = new Set<HeadsetAction>(['playPause', 'next', 'previous', 'like', 'none']);

export const sanitizeHeadsetAction = (action: unknown, fallback: HeadsetAction): HeadsetAction =>
  typeof action === 'string' && VALID_HEADSET_ACTIONS.has(action as HeadsetAction)
    ? (action as HeadsetAction)
    : fallback;

export const sanitizeHeadsetActions = (actions: unknown): HeadsetActions => {
  if (!actions || typeof actions !== 'object') return { ...DEFAULT_HEADSET_ACTIONS };
  const a = actions as Record<string, unknown>;
  return {
    single: sanitizeHeadsetAction(a.single, DEFAULT_HEADSET_ACTIONS.single),
    double: sanitizeHeadsetAction(a.double, DEFAULT_HEADSET_ACTIONS.double),
    triple: sanitizeHeadsetAction(a.triple, DEFAULT_HEADSET_ACTIONS.triple),
  };
};

const STORAGE_KEY = 'sonare.devicePrefs';

/** Preferences kept on this phone only (not the account). */
interface DevicePrefsStore {
  lyricsScript: LyricsScript;
  /** Synced lyrics follow playback unless the user turns this off. */
  lyricsAutoScroll: boolean;
  /** When the queue runs out, similar songs keep playing (shared/player/autoplay.ts). */
  autoplaySimilar: boolean;
  /** What 1, 2 and 3 quick presses of a headset's button do. */
  headsetActions: HeadsetActions;
  hydrate: () => Promise<void>;
  setLyricsScript: (script: LyricsScript) => void;
  setLyricsAutoScroll: (on: boolean) => void;
  setAutoplaySimilar: (on: boolean) => void;
  setHeadsetAction: (slot: keyof HeadsetActions, action: HeadsetAction) => void;
}

type SavedPrefs = Pick<DevicePrefsStore, 'lyricsScript' | 'lyricsAutoScroll' | 'autoplaySimilar' | 'headsetActions'>;

const persist = ({ lyricsScript, lyricsAutoScroll, autoplaySimilar, headsetActions }: SavedPrefs) => {
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lyricsScript, lyricsAutoScroll, autoplaySimilar, headsetActions }),
  ).catch(() => {});
};

export const useDevicePrefsStore = create<DevicePrefsStore>((set, get) => ({
  lyricsScript: 'original',
  lyricsAutoScroll: true,
  autoplaySimilar: true,
  headsetActions: { ...DEFAULT_HEADSET_ACTIONS },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      const lyricsScript = LYRICS_SCRIPTS.some((s) => s.value === saved.lyricsScript)
        ? (saved.lyricsScript as LyricsScript)
        : 'original';
      const headsetActions = sanitizeHeadsetActions(saved.headsetActions);
      set({
        lyricsScript,
        lyricsAutoScroll: typeof saved.lyricsAutoScroll === 'boolean' ? saved.lyricsAutoScroll : true,
        autoplaySimilar: typeof saved.autoplaySimilar === 'boolean' ? saved.autoplaySimilar : true,
        headsetActions,
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
  // AudioEngine sends the change to the native player.
  setHeadsetAction: (slot, action) => {
    set((state) => ({ headsetActions: sanitizeHeadsetActions({ ...state.headsetActions, [slot]: action }) }));
    persist(get());
  },
}));

export const lyricsScriptLabel = (script: LyricsScript): string => {
  return LYRICS_SCRIPTS.find((s) => s.value === script)?.label ?? 'Original (as released)';
};
