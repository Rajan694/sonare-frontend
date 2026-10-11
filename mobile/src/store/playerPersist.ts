import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../data/api';
import { useAuthStore } from '../data/auth';
import type { Track } from '../data/types';
import { usePlayerStore, type PlayingFrom, type RestoredPlayer } from './player';

/**
 * Brings the queue back after the app process was killed: the queue, the current track,
 * where it was, shuffle / repeat and where it was playing from. Saved on the phone (works
 * for guests and offline) and, signed in, to the account (PUT /me/player-state), which a
 * fresh install restores from.
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
  positionMs: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  playingFrom: PlayingFrom | null;
}

const isTrack = (t: unknown): t is Track =>
  !!t && typeof t === 'object' && typeof (t as Track).id === 'string' && typeof (t as Track).title === 'string';

const toRestored = (saved: Partial<Saved>): RestoredPlayer | null => {
  const queue = Array.isArray(saved.queue) ? saved.queue.filter(isTrack) : [];
  const currentTrack = queue.find((t) => t.id === saved.currentId);
  if (!currentTrack) return null;
  return {
    queue,
    currentTrack,
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
  const at = Math.max(
    0,
    s.queue.findIndex((t) => t.id === s.currentTrack!.id),
  );
  const start = Math.max(0, Math.min(at - 50, s.queue.length - MAX_QUEUE));
  const queue = s.queue.length ? s.queue.slice(start, start + MAX_QUEUE) : [s.currentTrack];
  return {
    queue,
    currentId: s.currentTrack.id,
    positionMs: Math.round(s.positionMs),
    shuffle: s.shuffle,
    repeat: s.repeat,
    playingFrom: s.playingFrom,
  };
};

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
    const index = saved.queue.findIndex((t) => t.id === saved.currentId);
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
    const restored = raw ? toRestored(JSON.parse(raw)) : null;
    if (!restored || usePlayerStore.getState().currentTrack) return !!restored;
    usePlayerStore.getState().restore(restored);
    return true;
  } catch {
    return false;
  }
};

const restoreFromAccount = async () => {
  if (usePlayerStore.getState().currentTrack) return;
  try {
    const state = await api.playerState();
    const [meta, ...rest] = Array.isArray(state.queue) ? state.queue : [];
    const queue = (isTrack(meta) ? [meta, ...rest] : rest).filter(isTrack);
    const current = queue[state.index] ?? queue[0];
    const playingFrom = !isTrack(meta) ? ((meta as { playingFrom?: PlayingFrom })?.playingFrom ?? null) : null;
    const restored = current
      ? toRestored({
          queue,
          currentId: current.id,
          positionMs: state.positionMs,
          shuffle: state.shuffle,
          repeat: state.repeat,
          playingFrom,
        })
      : null;
    // Something started playing while this was loading: that wins.
    if (restored && !usePlayerStore.getState().currentTrack) usePlayerStore.getState().restore(restored);
  } catch {
    // Offline or nothing saved.
  }
};

let wired = false;

/** Called once by the audio engine. */
export const watchPlayerPersistence = (): void => {
  if (wired) return;
  wired = true;

  restoreFromPhone().then((restored) => {
    if (restored) return;
    // A fresh install: the account may remember a queue from this phone's last install.
    const tryAccount = () => {
      if (useAuthStore.getState().status === 'signedIn') restoreFromAccount();
    };
    tryAccount();
    const unsubscribe = useAuthStore.subscribe((state, prev) => {
      if (state.status === prev.status || state.status === 'loading') return;
      unsubscribe();
      tryAccount();
    });
  });

  usePlayerStore.subscribe((state, prev) => {
    const changed =
      state.currentTrack?.id !== prev.currentTrack?.id ||
      state.queue !== prev.queue ||
      state.shuffle !== prev.shuffle ||
      state.repeat !== prev.repeat ||
      state.playingFrom !== prev.playingFrom ||
      state.isPlaying !== prev.isPlaying;
    const positionDue = state.positionMs !== prev.positionMs && Date.now() - lastPositionSave >= POSITION_EVERY_MS;
    if (changed || positionDue) saveSoon();
  });
};
