import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { api } from './api';
import { createPlaySync } from '../../../shared/sync/playSync';
import { useAuthStore } from './auth';
import { useModeStore } from '../store/mode';
import { trackMeta } from '../../../shared/catalog/meta';
import type { Track, TrackMeta } from './types';

/**
 * Background sync for plays, same contract as the desktop app (desktop/src/api/sync.ts).
 *
 * Every counted play is queued on the device first, online or not. The queue uploads on its
 * own whenever the app is in Online Mode, signed in and the phone has a network: at launch,
 * when the network comes back, on switching to Online, after sign-in and when the app returns
 * to the foreground. A failed upload keeps its plays and retries with backoff; only what the
 * server confirmed leaves the queue (shared/sync/playSync.ts).
 *
 * Plays are counted from native progress events, which keep coming with the app in the
 * background, so this avoids React effects and `fetch` (api.ts goes through XHR).
 */

type TrackRef = { kind: 'server'; id: string } | { kind: 'local'; fingerprint: string };
export type PendingPlay = {
  trackRef: TrackRef;
  at: number;
  ms: number;
  userId?: string;
  /** What the app knew about the song: the backend may never have seen one found in-app. */
  meta?: TrackMeta;
};

const QUEUE_KEY = 'sonare.pendingPlays';

/** Split a namespaced id (contract 8.1) into a TrackRef; the backend stores the bare id. */
const trackRef = (trackId: string): TrackRef => {
  if (trackId.startsWith('local:')) return { kind: 'local', fingerprint: trackId.slice('local:'.length) };
  return { kind: 'server', id: trackId.replace(/^yt:/, '') };
};

const playKey = (p: PendingPlay): string => {
  const ref = p.trackRef.kind === 'local' ? p.trackRef.fingerprint : p.trackRef.id;
  return `${p.userId ?? ''}|${p.trackRef.kind}|${ref}|${p.at}`;
};

// ── The queue ────────────────────────────────────────────────────────────────
// Kept in memory and mirrored to AsyncStorage. Writes are chained so an older snapshot
// can never land after a newer one.

let queue: PendingPlay[] = [];
let loaded: Promise<void> | null = null;
let saving: Promise<unknown> = Promise.resolve();

const load = (): Promise<void> => {
  loaded ??= AsyncStorage.getItem(QUEUE_KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as PendingPlay[]) : [];
      // Anything recorded before the load finished goes after what was saved.
      queue = [...saved, ...queue];
    })
    .catch(() => {});
  return loaded;
};

const save = () => {
  const snapshot = JSON.stringify(queue);
  saving = saving.then(() => AsyncStorage.setItem(QUEUE_KEY, snapshot)).catch(() => {});
};

const pendingFor = (userId: string | undefined): PendingPlay[] => {
  return userId ? queue.filter((p) => !p.userId || p.userId === userId) : [];
};

// ── Status, for Settings ─────────────────────────────────────────────────────

interface SyncStatus {
  /** Plays on this device still waiting to upload for the signed-in account. */
  pending: number;
  syncing: boolean;
}

export const useSyncStatus = create<SyncStatus>(() => ({
  pending: 0,
  syncing: false,
}));

const publish = (syncing = useSyncStatus.getState().syncing) => {
  const pending = pendingFor(useAuthStore.getState().user?.id).length;
  const now = useSyncStatus.getState();
  if (now.pending !== pending || now.syncing !== syncing) useSyncStatus.setState({ pending, syncing });
};

// ── Uploading ────────────────────────────────────────────────────────────────

let networkUp = true;

const drop = (done: PendingPlay[]) => {
  const gone = new Set(done.map(playKey));
  queue = queue.filter((p) => !gone.has(playKey(p)));
  save();
};

// Batches, retries and backoff are shared with the desktop app (shared/sync/playSync.ts).
const sync = createPlaySync<PendingPlay>({
  prepare: load,
  canSync: () =>
    useModeStore.getState().mode === 'online' && useAuthStore.getState().status === 'signedIn' && networkUp,
  networkDown: () => !networkUp,
  pending: () => pendingFor(useAuthStore.getState().user?.id),
  upload: (batch) => api.reportPlays(batch).then(() => undefined),
  remove: drop,
  setSyncing: (syncing) => publish(syncing),
});

/** Upload whatever is waiting, if we can. Safe to call often: runs are serialised. */
export const requestSync = (): void => sync.requestSync();

/** Queue a play the listener has actually heard; it uploads in the background. */
export const queuePlay = (track: Track, at: number, ms: number): void => {
  queue.push({
    trackRef: trackRef(track.id),
    at,
    ms: Math.round(ms),
    userId: useAuthStore.getState().user?.id,
    meta: trackMeta(track),
  });
  // Before the saved queue is loaded, saving now would overwrite it; load() merges instead.
  load().then(() => {
    save();
    requestSync();
  });
};

let started = false;
/** Wire the triggers once, at launch. */
export const startBackgroundSync = (): void => {
  if (started) return;
  started = true;

  NetInfo.addEventListener((state) => {
    // isInternetReachable is null until Android has checked; only a definite "no" counts.
    const up = !!state.isConnected && state.isInternetReachable !== false;
    const cameBack = up && !networkUp;
    networkUp = up;
    if (!up) return sync.cancelRetry();
    if (cameBack) sync.resetBackoff();
    requestSync();
  });
  useModeStore.subscribe((s, prev) => {
    if (s.mode === 'online' && prev.mode !== 'online') {
      sync.resetBackoff();
      requestSync();
    }
    if (s.mode !== 'online') sync.cancelRetry();
  });
  useAuthStore.subscribe((s, prev) => {
    if (s.user?.id !== prev.user?.id) requestSync();
  });
  // JS timers stop while backgrounded, so a pending retry may have been missed.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') requestSync();
  });
  requestSync();
};
