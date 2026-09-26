import { create } from 'zustand';
import { Track } from '../data/types';

interface PlayerStore {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  buffering: boolean;
  error: string | null;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  /** A seek the audio engine hasn't applied yet; the nonce makes repeat seeks distinct. */
  seekRequest: { ms: number; nonce: number } | null;

  /** Start `track`, with `queue` (defaults to just the track) as what plays after it. */
  playTrack: (track: Track, queue?: Track[]) => void;
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPositionMs: (positionMs: number) => void;
  setDurationMs: (durationMs: number) => void;
  setBuffering: (buffering: boolean) => void;
  setError: (error: string | null) => void;
  seekTo: (ms: number) => void;
  playNextInQueue: (track: Track) => void;
  addToQueue: (track: Track) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
  /** Called by the audio engine when a track finishes. */
  onTrackEnded: () => void;
}

const shuffled = (tracks: Track[], first: Track) =>
  [first, ...tracks.filter(t => t.id !== first.id).sort(() => Math.random() - 0.5)];

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  buffering: false,
  error: null,
  shuffle: false,
  repeat: 'off',
  seekRequest: null,

  playTrack: (track, queue) => {
    const list = queue?.length ? queue : [track];
    set({
      currentTrack: track,
      queue: get().shuffle ? shuffled(list, track) : list,
      isPlaying: true,
      positionMs: 0,
      durationMs: track.durationMs ?? 0,
      error: null,
      // Restarts the track if it was already the current one.
      seekRequest: { ms: 0, nonce: Date.now() },
    });
  },

  setCurrentTrack: (currentTrack) =>
    set({ currentTrack, positionMs: 0, durationMs: currentTrack?.durationMs ?? 0, error: null }),
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPositionMs: (positionMs) => set({ positionMs }),
  setDurationMs: (durationMs) => set({ durationMs }),
  setBuffering: (buffering) => set({ buffering }),
  setError: (error) => set({ error, ...(error && { isPlaying: false }) }),
  seekTo: (ms) => set({ positionMs: ms, seekRequest: { ms, nonce: Date.now() } }),

  playNextInQueue: (track) => {
    const { queue, currentTrack } = get();
    if (!currentTrack) return get().playTrack(track);
    const rest = queue.filter(t => t.id !== track.id);
    const at = rest.findIndex(t => t.id === currentTrack.id) + 1;
    set({ queue: [...rest.slice(0, at), track, ...rest.slice(at)] });
  },

  addToQueue: (track) => {
    const { queue, currentTrack } = get();
    if (!currentTrack) return get().playTrack(track);
    set({ queue: [...queue.filter(t => t.id !== track.id), track] });
  },

  toggleShuffle: () => {
    const { shuffle, queue, currentTrack } = get();
    set({ shuffle: !shuffle, ...(!shuffle && currentTrack && { queue: shuffled(queue, currentTrack) }) });
  },

  cycleRepeat: () => set((state) => ({
    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
  })),

  playNext: () => {
    const { queue, currentTrack, repeat } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    let nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeat === 'all') nextIndex = 0;
      else return;
    }

    get().setCurrentTrack(queue[nextIndex]);
  },

  playPrevious: () => {
    const { queue, currentTrack, positionMs } = get();
    if (!currentTrack || queue.length === 0) return;

    if (positionMs > 3000) {
      get().seekTo(0);
      return;
    }

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      get().seekTo(0);
      return;
    }

    get().setCurrentTrack(queue[prevIndex]);
  },

  onTrackEnded: () => {
    const { repeat, queue, currentTrack } = get();
    if (repeat === 'one') return get().seekTo(0);
    const isLast = !currentTrack || queue.findIndex(t => t.id === currentTrack.id) >= queue.length - 1;
    if (isLast && repeat === 'off') {
      set({ isPlaying: false });
      get().seekTo(0);
      return;
    }
    get().playNext();
  },
}));
