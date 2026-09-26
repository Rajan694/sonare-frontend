import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { api, ApiError } from './api';
import { useAuthStore } from './auth';
import { useModeStore } from '../store/mode';

/**
 * Background sync for plays, same contract as the desktop app (other-screens/src/data/sync.ts).
 *
 * Every counted play is queued on the device first, online or not. The queue uploads on its
 * own whenever the app is in Online Mode, signed in and the phone has a network: at launch,
 * when the network comes back, on switching to Online, after sign-in and when the app returns
 * to the foreground. A failed upload keeps its plays and retries with backoff; only what the
 * server confirmed leaves the queue, and the backend skips plays it already has, so a retry
 * after a lost response can't double-count.
 *
 * Plays are counted from native progress events, which keep coming with the app in the
 * background, so this avoids React effects and `fetch` (api.ts goes through XHR).
 */

type TrackRef = { kind: 'server'; id: string } | { kind: 'local'; fingerprint: string };
export type PendingPlay = { trackRef: TrackRef; at: number; ms: number; userId?: string };

const QUEUE_KEY = 'sonare.pendingPlays';
const RETRY_FIRST_MS = 5_000;
const RETRY_MAX_MS = 5 * 60_000;

/** Split a namespaced id (contract 8.1) into a TrackRef; the backend stores the bare id. */
function trackRef(trackId: string): TrackRef {
  if (trackId.startsWith('local:')) return { kind: 'local', fingerprint: trackId.slice('local:'.length) };
  return { kind: 'server', id: trackId.replace(/^yt:/, '') };
}

function playKey(p: PendingPlay): string {
  const ref = p.trackRef.kind === 'local' ? p.trackRef.fingerprint : p.trackRef.id;
  return `${p.userId ?? ''}|${p.trackRef.kind}|${ref}|${p.at}`;
}

// ── The queue ────────────────────────────────────────────────────────────────
// Kept in memory and mirrored to AsyncStorage. Writes are chained so an older snapshot
// can never land after a newer one.

let queue: PendingPlay[] = [];
let loaded: Promise<void> | null = null;
let saving: Promise<unknown> = Promise.resolve();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(QUEUE_KEY)
    .then(raw => {
      const saved = raw ? (JSON.parse(raw) as PendingPlay[]) : [];
      // Anything recorded before the load finished goes after what was saved.
      queue = [...saved, ...queue];
    })
    .catch(() => {});
  return loaded;
}

function save() {
  const snapshot = JSON.stringify(queue);
  saving = saving.then(() => AsyncStorage.setItem(QUEUE_KEY, snapshot)).catch(() => {});
}

function pendingFor(userId: string | undefined): PendingPlay[] {
  return userId ? queue.filter(p => !p.userId || p.userId === userId) : [];
}

// ── Status, for Settings ─────────────────────────────────────────────────────

interface SyncStatus {
  /** Plays on this device still waiting to upload for the signed-in account. */
  pending: number;
  syncing: boolean;
}

export const useSyncStatus = create<SyncStatus>(() => ({ pending: 0, syncing: false }));

function publish(syncing = useSyncStatus.getState().syncing) {
  const pending = pendingFor(useAuthStore.getState().user?.id).length;
  const now = useSyncStatus.getState();
  if (now.pending !== pending || now.syncing !== syncing) useSyncStatus.setState({ pending, syncing });
}

// ── Uploading ────────────────────────────────────────────────────────────────

let networkUp = true;
let inFlight: Promise<void> | null = null;
let rerun = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = RETRY_FIRST_MS;

function scheduleRetry() {
  clearTimeout(retryTimer);
  // No network: NetInfo wakes us instead of a timer.
  if (!networkUp) return;
  retryTimer = setTimeout(requestSync, retryDelay);
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
}

/** A 4xx other than auth/rate-limit means the server will never take these plays. */
function rejected(e: unknown): boolean {
  return e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);
}

function drop(done: PendingPlay[]) {
  const gone = new Set(done.map(playKey));
  queue = queue.filter(p => !gone.has(playKey(p)));
  save();
}

async function flush(): Promise<void> {
  await load();
  const auth = useAuthStore.getState();
  const plays = pendingFor(auth.user?.id);
  if (useModeStore.getState().mode !== 'online' || auth.status !== 'signedIn' || !networkUp || !plays.length) {
    return publish(false);
  }
  publish(true);
  try {
    await api.reportPlays(plays);
    drop(plays);
    clearTimeout(retryTimer);
    retryDelay = RETRY_FIRST_MS;
  } catch (e) {
    if (rejected(e)) drop(plays);
    else scheduleRetry();
  } finally {
    publish(false);
  }
}

/** Upload whatever is waiting, if we can. Safe to call often: runs are serialised. */
export function requestSync(): void {
  if (inFlight) {
    // Plays recorded mid-upload go in one follow-up run.
    rerun = true;
    return;
  }
  inFlight = flush().finally(() => {
    inFlight = null;
    if (rerun) {
      rerun = false;
      requestSync();
    }
  });
}

/** Queue a play the listener has actually heard; it uploads in the background. */
export function queuePlay(trackId: string, at: number, ms: number): void {
  queue.push({ trackRef: trackRef(trackId), at, ms: Math.round(ms), userId: useAuthStore.getState().user?.id });
  // Before the saved queue is loaded, saving now would overwrite it; load() merges instead.
  void load().then(() => {
    save();
    requestSync();
  });
}

let started = false;
/** Wire the triggers once, at launch. */
export function startBackgroundSync(): void {
  if (started) return;
  started = true;

  NetInfo.addEventListener(state => {
    // isInternetReachable is null until Android has checked; only a definite "no" counts.
    const up = !!state.isConnected && state.isInternetReachable !== false;
    const cameBack = up && !networkUp;
    networkUp = up;
    if (!up) return clearTimeout(retryTimer);
    if (cameBack) retryDelay = RETRY_FIRST_MS;
    requestSync();
  });
  useModeStore.subscribe((s, prev) => {
    if (s.mode === 'online' && prev.mode !== 'online') {
      retryDelay = RETRY_FIRST_MS;
      requestSync();
    }
    if (s.mode !== 'online') clearTimeout(retryTimer);
  });
  useAuthStore.subscribe((s, prev) => {
    if (s.user?.id !== prev.user?.id) requestSync();
  });
  // JS timers stop while backgrounded, so a pending retry may have been missed.
  AppState.addEventListener('change', state => {
    if (state === 'active') requestSync();
  });
  requestSync();
}
