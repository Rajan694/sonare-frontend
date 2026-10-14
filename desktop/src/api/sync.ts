import { useSyncExternalStore } from 'react';
import { api, ApiError } from './api';
import { getCurrentUser, onAuthChange } from './auth';
import { notifyPlaylistsChanged } from './hooks';
import { pendingPlaysFor, removePendingPlays, type PendingPlay } from './plays';

/**
 * Background sync. There is no "Sync now": plays queue on the device (plays.ts) and go up
 * on their own whenever the app is in Online Mode, signed in and has a network - at launch,
 * when the browser reports the connection is back, on switching to Online and after sign-in.
 *
 * A failed upload keeps its plays and retries with backoff (the server may be down while
 * the network is fine, which fires no `online` event). Only what the server confirmed is
 * removed from the queue; the backend skips plays it already has, so a retry after a lost
 * response can't double-count.
 */

const RETRY_FIRST_MS = 5_000;
/** Plays per request: a long offline stretch must not become one body the server refuses. */
const UPLOAD_BATCH = 100;
const RETRY_MAX_MS = 5 * 60_000;

export interface SyncStatus {
  /** Plays on this device still waiting to upload for the signed-in account. */
  pending: number;
  syncing: boolean;
}

/** App is in Online Mode (App.tsx). Offline Mode never touches the network. */
let onlineMode = false;
let inFlight: Promise<void> | null = null;
let rerun = false;
/** Refresh server-backed lists once the next sync lands (after being offline). */
let refreshAfter = false;
let retryTimer: number | undefined;
let retryDelay = RETRY_FIRST_MS;
let status: SyncStatus = { pending: 0, syncing: false };
const listeners = new Set<() => void>();

const setStatus = (patch: Partial<SyncStatus>) => {
  const user = getCurrentUser();
  const next = { ...status, pending: user ? pendingPlaysFor(user.id).length : 0, ...patch };
  if (next.pending === status.pending && next.syncing === status.syncing) return;
  status = next;
  listeners.forEach((fn) => fn());
};

const networkDown = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
};

const scheduleRetry = () => {
  window.clearTimeout(retryTimer);
  // No network: the `online` event wakes us instead of a timer.
  if (networkDown()) return;
  retryTimer = window.setTimeout(() => requestSync(), retryDelay);
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
};

/** A 4xx other than auth/rate-limit means the server will never take these plays. */
const rejected = (e: unknown): boolean => {
  return e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);
};

/**
 * Uploads one batch. A batch the server refuses (too large, or one bad play) is split until
 * the play it won't take is found; only that one is dropped.
 */
const uploadBatch = async (batch: PendingPlay[]): Promise<void> => {
  try {
    await api.sync({ since: 0, plays: batch, favourites: [], playlists: [] });
    removePendingPlays(batch);
  } catch (e) {
    if (!rejected(e)) throw e;
    if (batch.length === 1) return removePendingPlays(batch);
    const half = Math.ceil(batch.length / 2);
    await uploadBatch(batch.slice(0, half));
    await uploadBatch(batch.slice(half));
  }
};

const flush = async (): Promise<void> => {
  const user = getCurrentUser();
  if (!onlineMode || !user || networkDown()) return setStatus({});
  const plays = pendingPlaysFor(user.id);
  if (!plays.length && !refreshAfter) return setStatus({});

  setStatus({ syncing: true });
  try {
    for (let i = 0; i < plays.length; i += UPLOAD_BATCH) await uploadBatch(plays.slice(i, i + UPLOAD_BATCH));
    window.clearTimeout(retryTimer);
    retryDelay = RETRY_FIRST_MS;
    if (refreshAfter) {
      refreshAfter = false;
      notifyPlaylistsChanged();
    }
  } catch {
    // Batches already confirmed are gone from the queue; the rest wait for the retry.
    scheduleRetry();
  } finally {
    setStatus({ syncing: false });
  }
};

/** Upload whatever is waiting, if we can. Safe to call often: runs are serialised. */
export const requestSync = (): void => {
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
};

/** App.tsx reports the effective mode; switching to Online pushes what Offline held. */
export const setSyncOnline = (online: boolean): void => {
  if (online === onlineMode) return;
  onlineMode = online;
  if (!online) return window.clearTimeout(retryTimer);
  refreshAfter = true;
  retryDelay = RETRY_FIRST_MS;
  requestSync();
};

let started = false;
/** Wire the triggers once, at launch. */
export const startBackgroundSync = (): void => {
  if (started) return;
  started = true;
  window.addEventListener('online', () => {
    refreshAfter = true;
    retryDelay = RETRY_FIRST_MS;
    requestSync();
  });
  window.addEventListener('offline', () => window.clearTimeout(retryTimer));
  onAuthChange((user) => {
    if (user) requestSync();
    else setStatus({});
  });
  requestSync();
};

export const useSyncStatus = (): SyncStatus => {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => status,
  );
};
