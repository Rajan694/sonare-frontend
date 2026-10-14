import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../data/api';
import { useAuthStore } from '../data/auth';
import type { Track } from '../data/types';
import { usePlayerStore, type PlayingFrom, type RestoredPlayer } from './player';

/**
 * Brings the queue back after the app process was killed: the queue, the current track,
 * where it was, shuffle / repeat and where it was playing from. Saved on the phone (works
 * for guests and offline) and, signed in, to the account (PUT /me/player-state). The
 * account's copy wins when it is newer and nothing has played yet: a fresh install, or a
 * queue carried on from the desktop app.
 */

const STORAGE_KEY = 'sonare.playerState';
/** Enough for any real queue; keeps the saved blob small. */
const MAX_QUEUE = 300;
const SAVE_DELAY_MS = 1000;
const POSITION_EVERY_MS = 5000;
const SERVER_DELAY_MS = 8000;

interface Saved {
  queue: Track[];
  currentId: string;
  /** Where the current track is in `queue`; older saves only have currentId. */
  index?: number;
  positionMs: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  playingFrom: PlayingFrom | null;
  /** When it was saved (epoch ms); older saves have none. */
  savedAt?: number;
}

const isTrack = (t: unknown): t is Track =>
  !!t && typeof t === 'object' && typeof (t as Track).id === 'string' && typeof (t as Track).title === 'string';

const toRestored = (saved: Partial<Saved>): RestoredPlayer | null => {
  const queue = Array.isArray(saved.queue) ? saved.queue.filter(isTrack) : [];
  const atIndex = typeof saved.index === 'number' ? queue[saved.index] : undefined;
  const index = atIndex?.id === saved.currentId ? saved.index! : queue.findIndex((t) => t.id === saved.currentId);
  const currentTrack = queue[index];
  if (!currentTrack) return null;
  return {
    queue,
    currentTrack,
    index,
    positionMs: typeof saved.positionMs === 'number' && saved.positionMs > 0 ? saved.positionMs : 0,
    shuffle: saved.shuffle === true,
    repeat: saved.repeat === 'all' || saved.repeat === 'one' ? saved.repeat : 'off',
    playingFrom:
      saved.playingFrom && typeof saved.playingFrom.name === 'string' && typeof saved.playingFrom.kind === 'string'
        ? saved.playingFrom
        : null,
  };
};

const snapshot = (): Saved | null => {
  const s = usePlayerStore.getState();
  if (!s.currentTrack) return null;
  // Keep the window around the current track when the queue is very long.
  const at = s.index;
  const start = Math.max(0, Math.min(at - 50, s.queue.length - MAX_QUEUE));
  const queue = s.queue.length ? s.queue.slice(start, start + MAX_QUEUE) : [s.currentTrack];
  return {
    queue,
    currentId: s.currentTrack.id,
    index: s.queue.length ? at - start : 0,
    positionMs: Math.round(s.positionMs),
    shuffle: s.shuffle,
    repeat: s.repeat,
    playingFrom: s.playingFrom,
    savedAt: Date.now(),
  };
};

/** When the queue on show was saved; the account's copy must be newer to replace it. */
let shownSavedAt = 0;
/** Something played since launch: a queue saved elsewhere no longer replaces it. */
let playedSinceLaunch = false;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let serverTimer: ReturnType<typeof setTimeout> | undefined;
let lastPositionSave = 0;

const saveSoon = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const saved = snapshot();
    lastPositionSave = Date.now();
    if (saved) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    saveToAccountSoon();
  }, SAVE_DELAY_MS);
};

const saveToAccountSoon = () => {
  if (useAuthStore.getState().status !== 'signedIn') return;
  clearTimeout(serverTimer);
  serverTimer = setTimeout(() => {
    const saved = snapshot();
    if (!saved) return;
    const index = saved.index ?? saved.queue.findIndex((t) => t.id === saved.currentId);
    const current = saved.queue[index];
    api
      .savePlayerState({
        trackRef: current?.source === 'server' ? { kind: 'server', id: current.id } : null,
        positionMs: saved.positionMs,
        // The account keeps the tracks themselves, so another install can rebuild the queue.
        queue: [{ v: 1, playingFrom: saved.playingFrom }, ...saved.queue],
        index: Math.max(0, index),
        shuffle: saved.shuffle,
        repeat: saved.repeat,
      })
      .catch(() => {});
  }, SERVER_DELAY_MS);
};

const restoreFromPhone = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    const restored = saved ? toRestored(saved) : null;
    if (!restored || usePlayerStore.getState().currentTrack) return !!restored;
    shownSavedAt = typeof saved?.savedAt === 'number' ? saved.savedAt : 0;
    usePlayerStore.getState().restore(restored);
    return true;
  } catch {
    return false;
  }
};

const restoreFromAccount = async () => {
  if (playedSinceLaunch) return;
  try {
    const state = await api.playerState();
    // With a queue on show, only a newer one replaces it.
    if (usePlayerStore.getState().currentTrack && (state.updatedAt ?? 0) <= shownSavedAt) return;
    const [meta, ...rest] = Array.isArray(state.queue) ? state.queue : [];
    const queue = (isTrack(meta) ? [meta, ...rest] : rest).filter(isTrack);
    const index = queue[state.index] ? state.index : 0;
    const current = queue[index];
    const playingFrom = !isTrack(meta) ? ((meta as { playingFrom?: PlayingFrom })?.playingFrom ?? null) : null;
    const restored = current
      ? toRestored({
          queue,
          currentId: current.id,
          index,
          positionMs: state.positionMs,
          shuffle: state.shuffle,
          repeat: state.repeat,
          playingFrom,
        })
      : null;
    // Something started playing while this was loading: that wins.
    if (!restored || playedSinceLaunch) return;
    shownSavedAt = state.updatedAt ?? 0;
    usePlayerStore.getState().restore(restored);
  } catch {
    // Offline or nothing saved.
  }
};

let wired = false;

/** Called once by the audio engine. */
export const watchPlayerPersistence = (): void => {
  if (wired) return;
  wired = true;

  restoreFromPhone().then(() => {
    // Signed in, the account may hold a newer queue: this phone's last install, or another device.
    const tryAccount = () => {
      if (useAuthStore.getState().status === 'signedIn') restoreFromAccount();
    };
    tryAccount();
    useAuthStore.subscribe((state, prev) => {
      if (state.status === 'signedIn' && prev.status !== 'signedIn') tryAccount();
    });
  });

  usePlayerStore.subscribe((state, prev) => {
    if (state.isPlaying && !prev.isPlaying) playedSinceLaunch = true;
    const changed =
      state.playId !== prev.playId ||
      state.index !== prev.index ||
      state.queue !== prev.queue ||
      state.shuffle !== prev.shuffle ||
      state.repeat !== prev.repeat ||
      state.playingFrom !== prev.playingFrom ||
      state.isPlaying !== prev.isPlaying;
    const positionDue = state.positionMs !== prev.positionMs && Date.now() - lastPositionSave >= POSITION_EVERY_MS;
    if (changed || positionDue) saveSoon();
  });
};
