import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  noteResumePoint,
  readResumePoints,
  resumePointFor,
  type ResumePoints,
} from '../../../shared/player/resumePoints';

/**
 * Where long tracks (20 min and up: kathas, live qawwalis) were left off, on this phone, so
 * playing one again carries on from there (shared/player/resumePoints.ts). The audio engine
 * notes positions as they play and asks here before loading a track.
 */

const STORAGE_KEY = 'sonare.resumePoints';
const SAVE_DELAY_MS = 5000;

let points: ResumePoints = {};
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Reads the saved points once at startup. */
export const loadResumePoints = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    // Anything noted while this was loading is newer than the saved copy.
    if (raw) points = { ...readResumePoints(JSON.parse(raw)), ...points };
  } catch {
    // Nothing saved, or unreadable: long tracks start from the beginning.
  }
};

/** Writes now (the app is going to the background, where Android may stop it). */
export const saveResumePoints = (): void => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(points)).catch(() => {});
};

/** `trackId` has been heard up to `positionMs`; only long tracks are kept. */
export const noteResume = (trackId: string, positionMs: number, durationMs: number): void => {
  const next = noteResumePoint(points, trackId, positionMs, durationMs);
  if (next === points) return;
  points = next;
  if (!saveTimer) saveTimer = setTimeout(saveResumePoints, SAVE_DELAY_MS);
};

/** Where to start `trackId`: where it was left off, or 0. */
export const resumeAt = (trackId: string): number => resumePointFor(points, trackId);

/** Forget every point (tests). */
export const resetResumePoints = (): void => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  points = {};
};
