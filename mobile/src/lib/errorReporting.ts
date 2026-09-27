import { Platform } from 'react-native';
import { API_BASE } from '../data/config';
import { httpRequest } from '../data/http';

// Sends uncaught JS errors and unhandled promise rejections to the backend, where they show
// on the web admin page's Errors section. Both are handed on to what React Native would have
// done without this, so red boxes in dev and crashes in release behave exactly as before.

const MAX_PER_SESSION = 20;
const REPEAT_MS = 60_000;

let budget = MAX_PER_SESSION;
const lastSent = new Map<string, number>();

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value) ?? String(value));
  } catch {
    return new Error(String(value));
  }
}

type ErrorKind = 'uncaught' | 'unhandledRejection';

export function reportError(value: unknown, fatal = false, kind: ErrorKind = 'uncaught'): void {
  const err = toError(value);
  // Network failures are routine here (offline mode), not bugs.
  if (/^Network request (failed|timed out)$/.test(err.message)) return;
  const now = Date.now();
  if (now - (lastSent.get(err.message) ?? 0) < REPEAT_MS || budget <= 0) return;
  lastSent.set(err.message, now);
  budget--;

  httpRequest(`${API_BASE}/client-errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'mobile',
      level: 'error',
      message: `${err.name && err.name !== 'Error' ? `${err.name}: ` : ''}${err.message || '(no message)'}`.slice(0, 2000),
      stack: err.stack?.slice(0, 16_000),
      context: { os: Platform.OS, osVersion: String(Platform.Version), fatal, kind },
    }),
    timeoutMs: 10_000,
  }).catch(() => {});
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

interface RejectionTrackingOptions {
  allRejections?: boolean;
  onUnhandled?: (id: number, rejection: unknown) => void;
  onHandled?: (id: number, rejection: unknown) => void;
}

interface HermesInternalLike {
  hasPromise?(): boolean;
  enablePromiseRejectionTracker?(options: RejectionTrackingOptions): void;
}

/**
 * Unhandled rejections never reach ErrorUtils: in dev React Native's own tracker sends them
 * straight to its exception manager (the red box), and in release nothing tracks them at
 * all. So install a tracker of our own. Setting one replaces React Native's, which is why
 * dev still hands each rejection to its options afterwards.
 */
function trackRejections(): void {
  const hermes = (globalThis as { HermesInternal?: HermesInternalLike }).HermesInternal;
  // hermesEnabled=true (android/gradle.properties); JSC's promise polyfill isn't covered.
  if (!hermes?.hasPromise?.() || !hermes.enablePromiseRejectionTracker) return;

  let devOptions: RejectionTrackingOptions | undefined;
  if (__DEV__) {
    try {
      // No public export for React Native's default tracker options.
      // eslint-disable-next-line @react-native/no-deep-imports
      devOptions = require('react-native/Libraries/promiseRejectionTrackingOptions').default;
    } catch {
      // Moved in a newer React Native: reports still go out, only the dev warning is lost.
    }
  }

  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id, rejection) => {
      reportError(rejection, false, 'unhandledRejection');
      devOptions?.onUnhandled?.(id, rejection);
    },
    onHandled: (id, rejection) => devOptions?.onHandled?.(id, rejection),
  });
}

let installed = false;

export function installErrorReporting(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (installed || !errorUtils) return;
  installed = true;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, !!isFatal);
    previous(error, isFatal);
  });
  trackRejections();
}
