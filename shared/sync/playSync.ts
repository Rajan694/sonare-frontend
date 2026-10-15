import { ApiError } from '../api/client';

/**
 * Uploading the plays queued on a device, the same way in both apps: in batches, keeping what
 * failed for a retry with backoff, and dropping only what the server confirmed (the backend
 * skips plays it already has, so a retry after a lost response can't double-count). Each app
 * keeps its own queue storage and decides when it may sync (Online Mode, signed in, network).
 */

export const RETRY_FIRST_MS = 5_000;
export const RETRY_MAX_MS = 5 * 60_000;
/** Plays per request: a long offline stretch must not become one body the server refuses. */
export const UPLOAD_BATCH = 100;

/** A 4xx other than auth/rate-limit means the server will never take these plays. */
export const isRejected = (e: unknown): boolean => {
  return e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);
};

export interface PlaySyncDeps<P> {
  /** Runs first each time, e.g. loading the saved queue. */
  prepare?: () => Promise<void>;
  /** Online Mode, signed in and a network: uploading can be tried now. */
  canSync: () => boolean;
  /** No network at all: a retry then waits for the network to come back, not for a timer. */
  networkDown: () => boolean;
  /** The plays waiting for the signed-in account. */
  pending: () => P[];
  upload: (batch: P[]) => Promise<void>;
  /** Plays the server took, or will never take: out of the queue. */
  remove: (batch: P[]) => void;
  /** For Settings' "syncing" line (the pending count is the app's to work out). */
  setSyncing: (syncing: boolean) => void;
  /** Work besides plays that makes a run worth it, done after a run that went through. */
  extra?: { wanted: () => boolean; done: () => void };
}

export const createPlaySync = <P>(deps: PlaySyncDeps<P>) => {
  let inFlight: Promise<void> | null = null;
  let rerun = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = RETRY_FIRST_MS;

  const scheduleRetry = () => {
    clearTimeout(retryTimer);
    if (deps.networkDown()) return;
    retryTimer = setTimeout(requestSync, retryDelay);
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
  };

  /**
   * Uploads one batch. A batch the server refuses (too large, or one bad play) is split until
   * the play it won't take is found; only that one is dropped.
   */
  const uploadBatch = async (batch: P[]): Promise<void> => {
    try {
      await deps.upload(batch);
      deps.remove(batch);
    } catch (e) {
      if (!isRejected(e)) throw e;
      if (batch.length === 1) return deps.remove(batch);
      const half = Math.ceil(batch.length / 2);
      await uploadBatch(batch.slice(0, half));
      await uploadBatch(batch.slice(half));
    }
  };

  const flush = async (): Promise<void> => {
    // Only awaited when there is something to prepare: the state is otherwise read at once.
    if (deps.prepare) await deps.prepare();
    if (!deps.canSync()) return deps.setSyncing(false);
    const plays = deps.pending();
    if (!plays.length && !deps.extra?.wanted()) return deps.setSyncing(false);
    deps.setSyncing(true);
    try {
      for (let i = 0; i < plays.length; i += UPLOAD_BATCH) await uploadBatch(plays.slice(i, i + UPLOAD_BATCH));
      clearTimeout(retryTimer);
      retryDelay = RETRY_FIRST_MS;
      deps.extra?.done();
    } catch {
      // Batches already confirmed are gone from the queue; the rest wait for the retry.
      scheduleRetry();
    } finally {
      deps.setSyncing(false);
    }
  };

  /** Upload whatever is waiting, if it can. Safe to call often: runs are serialised. */
  const requestSync = (): void => {
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

  return {
    requestSync,
    /** The network came back, or the app went Online: the next retry comes soon again. */
    resetBackoff: () => {
      retryDelay = RETRY_FIRST_MS;
    },
    /** Offline: no timed retries until something wakes the sync again. */
    cancelRetry: () => clearTimeout(retryTimer),
  };
};
