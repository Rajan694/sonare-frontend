import type { QueueState } from './queue';

/**
 * When the queue runs low, Sonare keeps going with songs similar to the queue's last catalog
 * song (audit I11). The apps ask for them as soon as fewer than 10 songs remain after the
 * currently playing one, so upcoming tracks are always lined up early enough for gapless
 * playback and crossfade, like any other next song.
 */

/** How many similar songs are added each time, and the minimum songs ahead of the playing track. */
export const AUTOPLAY_COUNT = 10;

interface Song {
  id: string;
}

/** Only catalog songs have similar songs; files on the device don't. */
export const isCatalogSong = (song: Song): boolean => song.id.startsWith('yt:');

/** The last song of the queue is playing and nothing repeats, so the queue is about to end. */
export const isQueueEnding = <T extends Song>(state: QueueState<T>): boolean => {
  const playing = state.queue[state.index];
  return !!playing && state.repeat === 'off' && state.index === state.queue.length - 1;
};

/** Autoplay tops up when fewer than `minUpcoming` (default 10) songs are ahead of the playing track. */
export const needsAutoplay = <T extends Song>(
  state: QueueState<T>,
  minUpcoming = AUTOPLAY_COUNT,
): boolean => {
  const playing = state.queue[state.index];
  return !!playing && state.repeat === 'off' && state.queue.length - 1 - state.index < minUpcoming;
};

/** Seed song for related tracks: last catalog song at or after the playing index, falling back to playing song. */
export const findAutoplaySeed = <T extends Song>(state: QueueState<T>): T | null => {
  if (state.index < 0 || state.index >= state.queue.length) return null;
  for (let i = state.queue.length - 1; i >= state.index; i--) {
    const song = state.queue[i];
    if (song && isCatalogSong(song)) {
      return song;
    }
  }
  return null;
};

/** The similar songs worth adding: catalog songs the queue doesn't already have, at most `max`. */
export const freshSimilar = <T extends Song>(related: readonly T[], queue: readonly T[], max = AUTOPLAY_COUNT): T[] => {
  const known = new Set(queue.map((t) => t.id));
  const out: T[] = [];
  for (const song of related) {
    if (out.length >= max) break;
    if (!isCatalogSong(song) || known.has(song.id)) continue;
    known.add(song.id);
    out.push(song);
  }
  return out;
};

export interface AutoplayDeps<T extends Song> {
  /** Similar songs for this song id (the backend's GET /tracks/:id/related). */
  fetchRelated: (id: string) => Promise<T[]>;
  getState: () => QueueState<T>;
  /** Adds songs at the end of the queue. */
  append: (songs: T[]) => void;
  /** The user wants it, and the app is online. */
  enabled: () => boolean;
}

/**
 * One app's autoplay. `check()` is called whenever the playing entry or the queue changes; it
 * asks once per (seed, queue length), so a failed or empty answer isn't asked again in a loop.
 */
export const createAutoplay = <T extends Song>(deps: AutoplayDeps<T>) => {
  let asked: string | null = null;
  let running = false;
  return {
    check: async (): Promise<void> => {
      if (running) return;
      const state = deps.getState();
      if (!needsAutoplay(state) || !deps.enabled()) return;
      const seed = findAutoplaySeed(state);
      if (!seed) return;
      const key = `${seed.id}@${state.queue.length}`;
      if (asked === key) return;
      asked = key;
      running = true;
      let related: T[];
      try {
        related = await deps.fetchRelated(seed.id);
      } catch {
        running = false;
        return;
      }
      try {
        // Something else was played or queued meanwhile: that wins.
        const now = deps.getState();
        const playingId = state.queue[state.index]?.id;
        if (now.queue[now.index]?.id !== playingId || !needsAutoplay(now) || !deps.enabled()) return;
        const fresh = freshSimilar(related, now.queue);
        if (fresh.length) deps.append(fresh);
      } finally {
        running = false;
      }
    },
    /** Test hook. */
    reset: () => {
      asked = null;
      running = false;
    },
  };
};
