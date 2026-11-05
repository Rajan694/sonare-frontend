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

/** Autoplay tops up when fewer than `minUpcoming` (default 10) songs are ahead of the playing track. */
export const needsAutoplay = <T extends Song>(
  state: QueueState<T>,
  minUpcoming = AUTOPLAY_COUNT,
): boolean => {
  const playing = state.queue[state.index];
  return !!playing && state.repeat === 'off' && state.queue.length - 1 - state.index < minUpcoming;
};

/** Seeds tried per check: the last catalog songs, so one song with no fresh similar songs doesn't stop it. */
export const AUTOPLAY_SEEDS = 3;

/** First wait before asking again when no seed gave anything; it doubles up to the maximum. */
export const AUTOPLAY_RETRY_MS = 30_000;
export const AUTOPLAY_RETRY_MAX_MS = 10 * 60_000;

/** Seed songs for related tracks, best first: catalog songs from the end of the queue back to the playing one. */
export const autoplaySeeds = <T extends Song>(state: QueueState<T>, max = AUTOPLAY_SEEDS): T[] => {
  const seeds: T[] = [];
  if (state.index < 0 || state.index >= state.queue.length) return seeds;
  for (let i = state.queue.length - 1; i >= state.index && seeds.length < max; i--) {
    const song = state.queue[i];
    if (song && isCatalogSong(song) && !seeds.some((s) => s.id === song.id)) seeds.push(song);
  }
  return seeds;
};

/** Seed song for related tracks: last catalog song at or after the playing index, falling back to playing song. */
export const findAutoplaySeed = <T extends Song>(state: QueueState<T>): T | null => autoplaySeeds(state, 1)[0] ?? null;

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
 * asks once per (playing entry, queue length), so a failed or empty answer isn't asked again in a
 * loop, but is asked again when the next song starts. When every seed fails or has nothing new,
 * it also tries again by itself after a wait, so a queue that ran out still fills up.
 */
export const createAutoplay = <T extends Song>(deps: AutoplayDeps<T>) => {
  let asked: string | null = null;
  let running = false;
  // Bumped by reset(), so a check still waiting for an answer stops there.
  let generation = 0;
  let retryMs = AUTOPLAY_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRetry = () => {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      asked = null;
      void check();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, AUTOPLAY_RETRY_MAX_MS);
  };

  const check = async (): Promise<void> => {
    if (running) return;
    const state = deps.getState();
    if (!needsAutoplay(state) || !deps.enabled()) return;
    const seeds = autoplaySeeds(state);
    if (!seeds.length) return;
    const playingId = state.queue[state.index]?.id;
    const key = `${state.index}:${playingId}@${state.queue.length}`;
    if (asked === key) return;
    asked = key;
    running = true;
    const gen = generation;
    let fresh: T[] = [];
    try {
      for (const seed of seeds) {
        let related: T[];
        try {
          related = await deps.fetchRelated(seed.id);
        } catch {
          if (gen !== generation) return;
          continue;
        }
        if (gen !== generation) return;
        // Something else was played or queued meanwhile: that wins.
        const now = deps.getState();
        if (now.queue[now.index]?.id !== playingId || !needsAutoplay(now) || !deps.enabled()) return;
        fresh = freshSimilar(related, now.queue);
        if (fresh.length) break;
      }
    } finally {
      if (gen === generation) running = false;
    }
    // Appended after `running` is cleared, so the check the new queue triggers can top up further.
    if (fresh.length) {
      retryMs = AUTOPLAY_RETRY_MS;
      deps.append(fresh);
    } else {
      scheduleRetry();
    }
  };

  return {
    check,
    /** Forgets what was asked and stops any wait or answer still to come (when the player goes away). */
    reset: () => {
      generation++;
      asked = null;
      running = false;
      retryMs = AUTOPLAY_RETRY_MS;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    },
  };
};
