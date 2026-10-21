import { createAutoplay } from '../../../shared/player/autoplay';
import { append } from '../../../shared/player/queue';
import { api } from '../data/api';
import type { Track } from '../data/types';
import { useDevicePrefsStore } from './devicePrefs';
import { useModeStore } from './mode';
import { usePlayerStore } from './player';

/** Similar songs when the queue runs low (audit I11), keeping at least 10 songs ahead. */
export const autoplay = createAutoplay<Track>({
  fetchRelated: (id) => api.relatedTracks(id),
  getState: () => usePlayerStore.getState(),
  append: (tracks) => usePlayerStore.setState(append(usePlayerStore.getState(), tracks)),
  enabled: () => useDevicePrefsStore.getState().autoplaySimilar && useModeStore.getState().mode === 'online',
});

/** Watches the queue and track changes to top up when fewer than 10 songs remain; returns the unsubscribe. */
export const startAutoplay = (): (() => void) => {
  autoplay.check().catch(() => {});
  return usePlayerStore.subscribe((state, prev) => {
    if (
      state.index !== prev.index ||
      state.queue !== prev.queue ||
      state.repeat !== prev.repeat ||
      state.currentTrack?.id !== prev.currentTrack?.id
    ) {
      autoplay.check().catch(() => {});
    }
  });
};
