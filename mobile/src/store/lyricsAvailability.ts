import { create } from 'zustand';
import { api, ApiError } from '../data/api';
import type { Track } from '../data/types';

/**
 * Whether each song's lyrics can be found, remembered on the phone for the session. The Now
 * Playing Lyrics button reads this so a song with no lyrics shows a disabled button instead of
 * opening to an empty screen. Unknown (never asked) keeps the button enabled.
 */
export type LyricsAvailability = 'available' | 'unavailable';

interface LyricsAvailabilityStore {
  status: Record<string, LyricsAvailability>;
  /** Ask for a song's lyrics once; a second call for the same id does nothing. */
  check: (track: Track, script: string) => Promise<void>;
}

// Requests already on the way, so two callers don't both ask for the same song.
const inFlight = new Set<string>();

export const useLyricsAvailabilityStore = create<LyricsAvailabilityStore>((set, get) => ({
  status: {},
  check: async (track, script) => {
    // Local files are never asked for, exactly like the Lyrics screen.
    if (track.source !== 'server') return;
    if (get().status[track.id] || inFlight.has(track.id)) return;
    inFlight.add(track.id);
    try {
      await api.lyrics(track.id, script, track);
      set((state) => ({ status: { ...state.status, [track.id]: 'available' } }));
    } catch (e) {
      // Only an answer counts (no lyrics, or the lyrics sites down); a phone with no network
      // asks again next time instead of greying the button out for the whole session.
      if (e instanceof ApiError) set((state) => ({ status: { ...state.status, [track.id]: 'unavailable' } }));
    } finally {
      inFlight.delete(track.id);
    }
  },
}));
