import { useSyncExternalStore } from 'react';

/*
 * The playback position, kept out of PlayerContext on purpose: it changes about four times
 * a second while music plays, and putting it in the context re-rendered every consumer
 * (every SongRow in a long list) on each tick - enough work that WebKitGTK's audio
 * decoding fell behind. Only what shows time or progress subscribes, via
 * usePlaybackPosition().
 */

let positionMs = 0;
const listeners = new Set<() => void>();

export function setPlaybackPosition(ms: number): void {
  if (ms === positionMs) return;
  positionMs = ms;
  for (const l of listeners) l();
}

export function getPlaybackPosition(): number {
  return positionMs;
}

export function subscribePlaybackPosition(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The current playback position in ms; re-renders the caller whenever it moves. */
export function usePlaybackPosition(): number {
  return useSyncExternalStore(subscribePlaybackPosition, getPlaybackPosition, getPlaybackPosition);
}
