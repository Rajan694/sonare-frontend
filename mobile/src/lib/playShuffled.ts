import { usePlayerStore, type PlayingFrom } from '../store/player';
import type { Track } from '../data/types';

/**
 * Play a list in shuffle mode: turn shuffle on when it's off, start from a random song, and
 * let the store lay out the rest. The Android model keeps shuffle on afterwards, so a list
 * that is shuffled stays shuffled.
 */
export const playShuffled = (tracks: Track[], from?: PlayingFrom): void => {
  if (!tracks.length) return;
  // Shuffle is switched on with the new list, so the old queue keeps its order (for Undo).
  usePlayerStore.getState().playTrack(tracks[Math.floor(Math.random() * tracks.length)], tracks, from, true);
};
