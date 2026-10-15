import { createAutoplay } from '../../../shared/player/autoplay';
import { append } from '../../../shared/player/queue';
import { api } from '../data/api';
import type { Track } from '../data/types';
import { useDevicePrefsStore } from './devicePrefs';
import { useModeStore } from './mode';
import { usePlayerStore } from './player';

/** Similar songs when the queue runs out (audit I11), asked for as its last song starts. */
export const autoplay = createAutoplay<Track>({
  fetchRelated: (id) => api.relatedTracks(id),
  getState: () => usePlayerStore.getState(),
  append: (tracks) => usePlayerStore.setState(append(usePlayerStore.getState(), tracks)),
  enabled: () => useDevicePrefsStore.getState().autoplaySimilar && useModeStore.getState().mode === 'online',
});

/** Watches the queue for its last song; returns the unsubscribe. */
export const startAutoplay = (): (() => void) =>
  usePlayerStore.subscribe((state, prev) => {
    if (state.index !== prev.index || state.queue !== prev.queue || state.repeat !== prev.repeat) {
      void autoplay.check();
    }
  });
