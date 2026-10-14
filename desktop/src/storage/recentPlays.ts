import { useSyncExternalStore } from 'react';

/**
 * The last songs played on this device, for Offline Mode's "Jump back in". Kept in
 * localStorage; ids are namespaced like every other track id (`yt:…` / `local:…`).
 */

export interface RecentPlay {
  id: string;
  at: number;
}

const KEY = 'sonare_recent_plays';
const LIMIT = 50;

const parse = (raw: string | null): RecentPlay[] => {
  try {
    const saved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(saved)) return [];
    return saved.filter((p): p is RecentPlay => !!p && typeof p.id === 'string' && typeof p.at === 'number');
  } catch {
    return [];
  }
};

const read = (): RecentPlay[] => {
  try {
    return parse(localStorage.getItem(KEY));
  } catch {
    return [];
  }
};

let plays = read();
const listeners = new Set<() => void>();

/** The stored list, newest first. */
export const getRecentPlays = (): RecentPlay[] => plays;

/** Note a play; a repeat of the same song moves it back to the front. Newest 50 are kept. */
export const rememberRecentPlay = (track: { id: string }): void => {
  if (!track?.id) return;
  plays = [{ id: track.id, at: Date.now() }, ...plays.filter((p) => p.id !== track.id)].slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(plays));
  } catch {
    // Applies for this session only.
  }
  for (const l of listeners) l();
};

export const useRecentPlays = (): RecentPlay[] => {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => plays,
  );
};
