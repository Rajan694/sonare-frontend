import { Platform } from 'react-native';
import { API_BASE } from '../data/config';
import { httpRequest } from '../data/http';

// Sends uncaught JS errors to the backend, where they show on the web admin page's Errors
// section. Hooks React Native's global handler and then hands the error on, so red boxes
// in dev and crashes in release behave exactly as before.

const MAX_PER_SESSION = 20;
const REPEAT_MS = 60_000;

let budget = MAX_PER_SESSION;
const lastSent = new Map<string, number>();

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : String(value));
}

export function reportError(value: unknown, fatal = false): void {
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
      context: { os: Platform.OS, osVersion: String(Platform.Version), fatal },
    }),
    timeoutMs: 10_000,
  }).catch(() => {});
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
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
}
