import {
  noteResumePoint,
  readResumePoints,
  resumePointFor,
  type ResumePoints,
} from '../../../shared/player/resumePoints';

/**
 * Where long tracks (20 min and up: kathas, live qawwalis) were left off, on this device, so
 * playing one again carries on from there (shared/player/resumePoints.ts; the Android app keeps
 * its own). App.tsx notes positions as they play and asks here before loading a track.
 */

const STORAGE_KEY = 'sonare_resume_points';
const SAVE_DELAY_MS = 5000;

const load = (): ResumePoints => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? readResumePoints(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
};

let points: ResumePoints = load();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const saveNow = () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  } catch {
    // Storage unavailable: long tracks just start from the beginning next time.
  }
};

/** `trackId` has been heard up to `positionMs`; only long tracks are kept. */
export const noteResume = (trackId: string, positionMs: number, durationMs: number): void => {
  const next = noteResumePoint(points, trackId, positionMs, durationMs);
  if (next === points) return;
  points = next;
  if (!saveTimer) saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
};

/** Where to start `trackId`: where it was left off, or 0. */
export const resumeAt = (trackId: string): number => resumePointFor(points, trackId);

/** Forget every point and read storage again (tests). */
export const reloadResumePoints = (): void => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  points = load();
};

// Closing the tab or window: write the latest now.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow);
}
