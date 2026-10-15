import type { QueueState } from './queue';

/**
 * When the queue runs out, Sonare keeps going with songs like the last one (audit I11). The apps
 * ask for them as the queue's last song starts, so the first of them is lined up early enough
 * for gapless playback and crossfade, like any other next song.
 */

/** How many similar songs are added each time the queue is about to run out. */
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
 * asks once per (song, queue length), so a failed or empty answer isn't asked again in a loop.
 */
export const createAutoplay = <T extends Song>(deps: AutoplayDeps<T>) => {
  let asked: string | null = null;
  return {
    check: async (): Promise<void> => {
      const state = deps.getState();
      if (!isQueueEnding(state) || !deps.enabled()) return;
      const seed = state.queue[state.index];
      if (!isCatalogSong(seed)) return;
      const key = `${seed.id}@${state.queue.length}`;
      if (asked === key) return;
      asked = key;
      let related: T[];
      try {
        related = await deps.fetchRelated(seed.id);
      } catch {
        return;
      }
      // Something else was played or queued meanwhile: that wins.
      const now = deps.getState();
      if (now.queue[now.index]?.id !== seed.id || !isQueueEnding(now)) return;
      const fresh = freshSimilar(related, now.queue);
      if (fresh.length) deps.append(fresh);
    },
    /** Test hook. */
    reset: () => {
      asked = null;
    },
  };
};
