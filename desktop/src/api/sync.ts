import { useSyncExternalStore } from 'react';
import { api } from './api';
import { createPlaySync } from '../../../shared/sync/playSync';
import { getCurrentUser, onAuthChange } from './auth';
import { notifyPlaylistsChanged } from './hooks';
import { pendingPlaysFor, removePendingPlays, type PendingPlay } from './plays';

/**
 * Background sync. There is no "Sync now": plays queue on the device (plays.ts) and go up
 * on their own whenever the app is in Online Mode, signed in and has a network - at launch,
 * when the browser reports the connection is back, on switching to Online and after sign-in.
 *
 * A failed upload keeps its plays and retries with backoff (the server may be down while
 * the network is fine, which fires no `online` event); see shared/sync/playSync.ts.
 */

export interface SyncStatus {
  /** Plays on this device still waiting to upload for the signed-in account. */
  pending: number;
  syncing: boolean;
}

/** App is in Online Mode (App.tsx). Offline Mode never touches the network. */
let onlineMode = false;
/** Refresh server-backed lists once the next sync lands (after being offline). */
let refreshAfter = false;
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

// Batches, retries and backoff are shared with the Android app (shared/sync/playSync.ts).
const sync = createPlaySync<PendingPlay>({
  canSync: () => onlineMode && !!getCurrentUser() && !networkDown(),
  networkDown,
  pending: () => pendingPlaysFor(getCurrentUser()!.id),
  upload: (plays) => api.sync({ since: 0, plays, favourites: [], playlists: [] }).then(() => undefined),
  // An arrow: plays.ts imports this module too, so its exports may not be ready when this runs.
  remove: (plays) => removePendingPlays(plays),
  setSyncing: (syncing) => setStatus({ syncing }),
  extra: {
    wanted: () => refreshAfter,
    done: () => {
      if (!refreshAfter) return;
      refreshAfter = false;
      notifyPlaylistsChanged();
    },
  },
});

/** Upload whatever is waiting, if we can. Safe to call often: runs are serialised. */
export const requestSync = (): void => sync.requestSync();

/** App.tsx reports the effective mode; switching to Online pushes what Offline held. */
export const setSyncOnline = (online: boolean): void => {
  if (online === onlineMode) return;
  onlineMode = online;
  if (!online) return sync.cancelRetry();
  refreshAfter = true;
  sync.resetBackoff();
  requestSync();
};

let started = false;
/** Wire the triggers once, at launch. */
export const startBackgroundSync = (): void => {
  if (started) return;
  started = true;
  window.addEventListener('online', () => {
    refreshAfter = true;
    sync.resetBackoff();
    requestSync();
  });
  window.addEventListener('offline', () => sync.cancelRetry());
  onAuthChange((user) => {
    if (user) requestSync();
    else setStatus({});
  });
  requestSync();
};

export const updateSyncStatus = (): void => {
  setStatus({});
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
