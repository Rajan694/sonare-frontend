/**
 * Render's free plan puts the backend to sleep after 15 idle minutes, and the first request after
 * that takes 30–60 s. Both apps send every backend request through `trackServerRequest`, which
 * notices when a request is slow while the server may be asleep, so the app can say it is waking
 * up instead of looking stuck. Requests give up after REQUEST_TIMEOUT_MS, a little longer than
 * the slowest wake-up.
 */

export const REQUEST_TIMEOUT_MS = 75_000;
/** A request this slow while the server may be asleep shows the waking-up notice. */
export const SLOW_REQUEST_MS = 4_000;
/** Render sleeps after 15 minutes without a request; a minute earlier to be safe. */
export const ASLEEP_AFTER_MS = 14 * 60_000;

export class ServerTimeoutError extends Error {
  constructor() {
    super("The Sonare server didn't answer in time. Try again.");
    this.name = 'ServerTimeoutError';
  }
}

let lastAnswerAt = 0;
let slowRequests = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

/** True while a slow request may be waiting for the server to wake up. */
export const isServerWaking = (): boolean => slowRequests > 0;

export const subscribeServerWaking = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Runs one backend request. `run` resolves once the server answered (any HTTP status counts) and
 * rejects when it couldn't be reached. Only requests sent while the server may be asleep (nothing
 * answered yet this session, or not for ASLEEP_AFTER_MS) can turn the notice on, so a slow search
 * on an awake server doesn't claim it was asleep.
 */
export const trackServerRequest = <T>(run: () => Promise<T>, now: () => number = Date.now): Promise<T> => {
  const mayBeAsleep = lastAnswerAt === 0 || now() - lastAnswerAt > ASLEEP_AFTER_MS;
  let counted = false;
  const timer = mayBeAsleep
    ? setTimeout(() => {
        counted = true;
        slowRequests += 1;
        notify();
      }, SLOW_REQUEST_MS)
    : undefined;
  const settle = () => {
    clearTimeout(timer);
    if (!counted) return;
    counted = false;
    slowRequests -= 1;
    notify();
  };
  return run().then(
    (value) => {
      lastAnswerAt = now();
      settle();
      return value;
    },
    (err: unknown) => {
      settle();
      throw err;
    },
  );
};

/** Test hook: forget what the server did. */
export const resetServerWake = () => {
  lastAnswerAt = 0;
  slowRequests = 0;
  notify();
};
