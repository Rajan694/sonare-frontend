import { api } from '../api/api';
import { isAuthenticated } from '../api/auth';
import type { Track } from '../types';
import {
  fromAccountState,
  readSavedQueue,
  toAccountState,
  trimQueue,
  type SavedQueue,
} from '../../../shared/player/savedQueue';

/**
 * Brings the queue back after the app was closed: the queue, the current entry, where it was,
 * shuffle / repeat and where it was playing from. Saved on this device (guests and offline
 * too) and, signed in, to the account, so a queue started on the phone carries on here.
 * The same format as the Android app (shared/player/savedQueue.ts).
 */

const STORAGE_KEY = 'sonare_player';
const SAVE_DELAY_MS = 1000;
const ACCOUNT_DELAY_MS = 8000;

let read: () => SavedQueue<Track> | null = () => null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let accountTimer: ReturnType<typeof setTimeout> | undefined;

/** What the app holds now; App.tsx hands this over once. */
export const setQueueSource = (fn: () => SavedQueue<Track> | null): void => {
  read = fn;
};

const snapshot = (): SavedQueue<Track> | null => {
  const s = read();
  if (!s || !s.queue.length) return null;
  return { ...s, ...trimQueue(s.queue, s.index), positionMs: Math.round(s.positionMs), savedAt: Date.now() };
};

const saveNow = () => {
  clearTimeout(saveTimer);
  const saved = snapshot();
  try {
    if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the queue just won't come back.
  }
  if (!saved || !isAuthenticated()) return;
  clearTimeout(accountTimer);
  accountTimer = setTimeout(() => {
    const latest = snapshot();
    if (latest) api.savePlayerState(toAccountState(latest)).catch(() => {});
  }, ACCOUNT_DELAY_MS);
};

/** The queue, the entry or the position changed: save a moment later. */
export const queueChanged = (): void => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
};

/** What this device saved last, or null. */
export const savedQueue = (): SavedQueue<Track> | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? readSavedQueue<Track>(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

/** What the account saved last (another device, maybe), or null. */
export const accountQueue = async (): Promise<SavedQueue<Track> | null> => {
  if (!isAuthenticated()) return null;
  try {
    return fromAccountState<Track>(await api.getPlayerState());
  } catch {
    return null;
  }
};

// Closing the tab or window: write the latest now, not a second later.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow);
}
