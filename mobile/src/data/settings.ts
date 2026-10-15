import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { api } from './api';
import { useAuthStore } from './auth';
import {
  API_QUALITY,
  CUSTOM_PRESET,
  DEFAULT_SETTINGS,
  EQ_PRESETS as SHARED_EQ_PRESETS,
  sanitizeSettings,
  type AudioQuality,
  type DownloadFormat,
} from '../../../shared/settings';

/**
 * Account settings the phone uses (GET/PUT /me/settings): download quality and format, the
 * equalizer preset, gapless playback, volume normalization, and whether Offline Mode should
 * stick until switched back.
 * They're kept on the phone (guests and offline too) and, signed in, follow the account, so
 * they match the desktop app. A change waits in an "unsynced" list until the account has it,
 * so one made offline, or as a guest who then signs in, gets there once it can. The download
 * folder is per device and lives in store/downloads.ts instead.
 */

export type { AudioQuality, DownloadFormat };
export { API_QUALITY, CUSTOM_PRESET };

/**
 * Equalizer presets: gains in dB for the 32, 64, 150, 400, 1k, 2.4k, 6k and 14k Hz bands,
 * shared with the desktop app because the chosen preset follows the account.
 */
export const EQ_PRESET_GAINS = SHARED_EQ_PRESETS;
/** The presets the Audio screen offers. */
export const EQ_PRESETS = Object.keys(EQ_PRESET_GAINS);

const STORAGE_KEY = 'sonare.settings';
/** Changes the account doesn't have yet, and whose they are (null: made as a guest). */
const UNSYNCED_KEY = 'sonare.settingsUnsynced';

interface SettingsStore {
  /** Streaming quality, from the next track (Settings → Playback; the desktop app's too). */
  streamQuality: AudioQuality;
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
        | 'streamQuality'
        | 'downloadQuality'
        | 'downloadFormat'
        | 'eqPreset'
        | 'gapless'
        | 'normalization'
        | 'stayOffline'
      >
    >,
  ) => void;
}

/** The account's fields (a hand-made Custom EQ stays on the phone). */
const pick = (s: Record<string, unknown>) => sanitizeSettings(s);

/** What the phone saved: like the account's fields, plus a hand-made (Custom) EQ. */
const pickStored = (s: Record<string, unknown>) => sanitizeSettings(s, { allowCustom: true });

/** What the phone keeps in AsyncStorage. */
const stored = (s: SettingsStore) => {
  return JSON.stringify({
    streamQuality: s.streamQuality,
    downloadQuality: s.downloadQuality,
    downloadFormat: s.downloadFormat,
    eqPreset: s.eqPreset,
    gapless: s.gapless,
    normalization: s.normalization,
    stayOffline: s.stayOffline,
  });
};

type Synced = ReturnType<typeof pick>;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let unsynced: { userId: string | null; changes: Synced } = { userId: null, changes: {} };
let unsyncedLoaded: Promise<void> | null = null;
let sending = false;
let watchingNetwork = false;

const loadUnsynced = () => {
  unsyncedLoaded ??= AsyncStorage.getItem(UNSYNCED_KEY)
    .then((raw) => {
      const saved = raw ? JSON.parse(raw) : null;
      if (!saved || typeof saved !== 'object') return;
      // Anything changed before this finished loading goes on top.
      unsynced = {
        userId: typeof saved.userId === 'string' ? saved.userId : null,
        changes: { ...pick(saved.changes ?? {}), ...unsynced.changes },
      };
    })
    .catch(() => {});
  return unsyncedLoaded;
};

const saveUnsynced = () => {
  AsyncStorage.setItem(UNSYNCED_KEY, JSON.stringify(unsynced)).catch(() => {});
};

/** Waiting changes that belong to another account than the signed-in one are dropped. */
const unsyncedFor = (userId: string): Synced => {
  if (unsynced.userId !== null && unsynced.userId !== userId) {
    unsynced = { userId, changes: {} };
    saveUnsynced();
  }
  return unsynced.changes;
};

/** Sends what the account doesn't have yet; on failure it stays queued for the next chance. */
const sendUnsynced = async (): Promise<void> => {
  const { status, user } = useAuthStore.getState();
  if (status !== 'signedIn' || !user || sending) return;
  await loadUnsynced();
  const body = { ...unsyncedFor(user.id) };
  if (Object.keys(body).length === 0) return;
  sending = true;
  try {
    // Just what changed here, so the desktop's other choices are left alone.
    await api.saveSettings(body);
    const left: Record<string, unknown> = { ...unsynced.changes };
    for (const [k, v] of Object.entries(body)) if (left[k] === v) delete left[k];
    unsynced = { userId: user.id, changes: left as Synced };
    saveUnsynced();
  } catch {
    // Offline or the server is down: tried again when the network is back.
  } finally {
    sending = false;
  }
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // The same defaults on both apps and the backend.
  ...DEFAULT_SETTINGS,

  hydrate: async () => {
    if (!watchingNetwork) {
      watchingNetwork = true;
      // Back online: the account gets what changed meanwhile, and the phone what changed there.
      let wasUp = true;
      NetInfo.addEventListener((state) => {
        const up = !!state.isConnected && state.isInternetReachable !== false;
        if (up && !wasUp) get().hydrate();
        wasUp = up;
      });
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set(pickStored(JSON.parse(raw)));
    } catch {
      // Nothing saved yet.
    }
    await loadUnsynced();
    const { status, user } = useAuthStore.getState();
    if (status !== 'signedIn' || !user) return;
    try {
      const fromAccount = pick(await api.settings());
      // A hand-tuned EQ on this phone stays: the account only knows preset names.
      if (get().eqPreset === CUSTOM_PRESET) delete fromAccount.eqPreset;
      // What changed here and isn't in the account yet wins over the account's copy.
      set({ ...fromAccount, ...unsyncedFor(user.id) });
      AsyncStorage.setItem(STORAGE_KEY, stored(get()));
    } catch {
      // Offline: the phone's copy applies.
      return;
    }
    await sendUnsynced();
  },

  update: (patch) => {
    set(patch);
    AsyncStorage.setItem(STORAGE_KEY, stored(get()));
    const { eqPreset, ...rest } = patch;
    const changes = { ...rest, ...(eqPreset !== undefined && eqPreset !== CUSTOM_PRESET && { eqPreset }) };
    if (Object.keys(changes).length === 0) return;
    const user = useAuthStore.getState().user;
    unsynced = { userId: user?.id ?? unsynced.userId, changes: { ...unsynced.changes, ...changes } };
    saveUnsynced();
    // Guests keep them on the phone; they go to the account once someone signs in.
    if (useAuthStore.getState().status !== 'signedIn') return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void sendUnsynced(), 400);
  },
}));
