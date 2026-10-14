import { create } from 'zustand';
import { Track } from '../data/types';
import {
  append,
  insertNext,
  positionOf,
  shuffledFrom,
  shuffleItems,
  stepIndex,
  upcomingIndex,
} from '../../../shared/player/queue';

/** Where the queue came from, for Now Playing's "Playing from …" eyebrow. */
export interface PlayingFrom {
  /** "Album", "Playlist", "Artist", "Search", "Library"… */
  kind: string;
  name: string;
}

/** What's saved to bring the queue back after the app was closed (store/playerPersist.ts). */
export interface RestoredPlayer {
  queue: Track[];
  currentTrack: Track;
  /** Where currentTrack sits in the queue (a song can be in it more than once). */
  index?: number;
  positionMs: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  playingFrom: PlayingFrom | null;
}

interface PlayerStore {
  currentTrack: Track | null;
  queue: Track[];
  /**
   * Where the current track sits in the queue. A song can be in a queue more than once, so
   * the position is tracked, never looked up by id.
   */
  index: number;
  /** Bumped each time a queue entry becomes the current one; the audio engine loads on it. */
  playId: number;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  buffering: boolean;
  error: string | null;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  /** A seek the audio engine hasn't applied yet; the nonce makes repeat seeks distinct. */
  seekRequest: { ms: number; nonce: number } | null;
  playingFrom: PlayingFrom | null;
  /** Where the next load starts (a restored queue resumes mid-track); the engine clears it. */
  startAtMs: number | null;

  /** Start `track`, with `queue` (defaults to just the track) as what plays after it. */
  playTrack: (track: Track, queue?: Track[], from?: PlayingFrom) => void;
  /** Put back a saved queue, paused where it was left. */
  restore: (saved: RestoredPlayer) => void;
  setCurrentTrack: (track: Track | null) => void;
  /** Make the queue entry at `index` the current one. */
  playAt: (index: number) => void;
  /** Replace the queue; `index` is where the current track ends up (found by identity if left out). */
  setQueue: (queue: Track[], index?: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPositionMs: (positionMs: number) => void;
  setDurationMs: (durationMs: number) => void;
  setBuffering: (buffering: boolean) => void;
  setError: (error: string | null) => void;
  /** Load the current track again after a playback error, from where it stopped. */
  retry: () => void;
  seekTo: (ms: number) => void;
  playNextInQueue: (track: Track) => void;
  addToQueue: (track: Track) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
  /** Called by the audio engine when a track finishes. */
  onTrackEnded: () => void;
  /** What plays after the current track by itself: null at the end of the queue or on repeat one. */
  upcomingTrack: () => Track | null;
  /** The queue position of upcomingTrack(), or -1. */
  upcomingIndex: () => number;
}

/** Fisher–Yates: every order equally likely. */
export const shuffleTracks = shuffleItems;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  index: 0,
  playId: 0,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  buffering: false,
  error: null,
  shuffle: false,
  repeat: 'off',
  seekRequest: null,
  playingFrom: null,
  startAtMs: null,

  playTrack: (track, queue, from) => {
    let list = queue?.length ? queue : [track];
    let at = positionOf(list, track);
    if (at < 0) {
      list = [track, ...list];
      at = 0;
    }
    const shuffle = get().shuffle;
    set({
      playingFrom: from ?? null,
      startAtMs: null,
      currentTrack: track,
      queue: shuffle ? shuffledFrom(list, at) : list,
      index: shuffle ? 0 : at,
      playId: get().playId + 1,
      isPlaying: true,
      positionMs: 0,
      durationMs: track.durationMs ?? 0,
      error: null,
      // Restarts the track if it was already the current one.
      seekRequest: { ms: 0, nonce: Date.now() },
    });
  },

  restore: (saved) =>
    set({
      queue: saved.queue,
      currentTrack: saved.currentTrack,
      index:
        saved.index !== undefined && saved.queue[saved.index] === saved.currentTrack
          ? saved.index
          : Math.max(0, positionOf(saved.queue, saved.currentTrack)),
      playId: get().playId + 1,
      positionMs: saved.positionMs,
      durationMs: saved.currentTrack.durationMs ?? 0,
      shuffle: saved.shuffle,
      repeat: saved.repeat,
      playingFrom: saved.playingFrom,
      startAtMs: saved.positionMs,
      isPlaying: false,
      error: null,
    }),

  setCurrentTrack: (currentTrack) => {
    const { queue, index, playId } = get();
    const at = currentTrack ? positionOf(queue, currentTrack, index) : -1;
    set({
      currentTrack,
      index: Math.max(0, at),
      playId: playId + 1,
      positionMs: 0,
      durationMs: currentTrack?.durationMs ?? 0,
      error: null,
    });
  },
  playAt: (at) => {
    const { queue, playId } = get();
    const track = queue[at];
    if (!track) return;
    set({
      currentTrack: track,
      index: at,
      playId: playId + 1,
      positionMs: 0,
      durationMs: track.durationMs ?? 0,
      error: null,
    });
  },
  setQueue: (queue, at) => {
    const { currentTrack, index } = get();
    const found = at ?? (currentTrack ? positionOf(queue, currentTrack, index) : 0);
    set({ queue, index: Math.max(0, Math.min(found, queue.length - 1)) });
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPositionMs: (positionMs) => set({ positionMs }),
  setDurationMs: (durationMs) => set({ durationMs }),
  setBuffering: (buffering) => set({ buffering }),
  setError: (error) => set({ error, ...(error && { isPlaying: false }) }),
  retry: () => {
    const { currentTrack, positionMs, playId } = get();
    if (!currentTrack) return;
    set({ error: null, isPlaying: true, startAtMs: positionMs > 0 ? positionMs : null, playId: playId + 1 });
  },
  seekTo: (ms) => set({ positionMs: ms, seekRequest: { ms, nonce: Date.now() } }),

  playNextInQueue: (track) => {
    if (!get().currentTrack) return get().playTrack(track);
    set(insertNext(get(), [track]));
  },

  addToQueue: (track) => {
    if (!get().currentTrack) return get().playTrack(track);
    set(append(get(), [track]));
  },

  // Shuffling reorders the queue itself: the playing song first, the rest at random. Turning
  // it off keeps that order ("once a list is shuffled, it stays shuffled").
  toggleShuffle: () => {
    const { shuffle, queue, currentTrack, index } = get();
    set({
      shuffle: !shuffle,
      ...(!shuffle && currentTrack && queue[index] && { queue: shuffledFrom(queue, index), index: 0 }),
    });
  },

  cycleRepeat: () =>
    set((state) => ({
      repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
    })),

  playNext: () => {
    if (!get().currentTrack) return;
    const at = stepIndex(get(), 1);
    if (at >= 0) get().playAt(at);
  },

  playPrevious: () => {
    const { queue, currentTrack, positionMs } = get();
    if (!currentTrack || queue.length === 0) return;

    if (positionMs > 3000) {
      get().seekTo(0);
      return;
    }

    const prevIndex = get().index - 1;
    if (prevIndex < 0) {
      get().seekTo(0);
      return;
    }

    get().playAt(prevIndex);
  },

  upcomingIndex: () => (get().currentTrack ? upcomingIndex(get()) : -1),

  upcomingTrack: () => {
    const at = get().upcomingIndex();
    return at < 0 ? null : get().queue[at];
  },

  onTrackEnded: () => {
    const { repeat, queue, currentTrack, index } = get();
    if (repeat === 'one') return get().seekTo(0);
    const isLast = !currentTrack || index >= queue.length - 1;
    if (isLast && repeat === 'off') {
      set({ isPlaying: false });
      get().seekTo(0);
      return;
    }
    get().playNext();
  },
}));
