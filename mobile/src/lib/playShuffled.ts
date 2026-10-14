import { usePlayerStore, type PlayingFrom } from '../store/player';
import type { Track } from '../data/types';

/**
 * Play a list in shuffle mode: turn shuffle on when it's off, start from a random song, and
 * let the store lay out the rest. The Android model keeps shuffle on afterwards, so a list
 * that is shuffled stays shuffled.
 */
export const playShuffled = (tracks: Track[], from?: PlayingFrom): void => {
  if (!tracks.length) return;
  const player = usePlayerStore.getState();
  if (!player.shuffle) player.toggleShuffle();
  player.playTrack(tracks[Math.floor(Math.random() * tracks.length)], tracks, from);
};
