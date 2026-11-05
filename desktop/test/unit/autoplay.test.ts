import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOPLAY_COUNT,
  AUTOPLAY_RETRY_MS,
  createAutoplay,
  findAutoplaySeed,
  isCatalogSong,
  needsAutoplay,
} from '../../../shared/player/autoplay';
import { DEFAULT_SEEK_STEP, SEEK_STEPS, sanitizeSeekStep, seekTarget } from '../../../shared/player/seek';
import type { QueueState } from '../../../shared/player/queue';

interface Track {
  id: string;
}

const t = (id: string): Track => ({ id });

const makeQueue = (ids: string[], index = 0, repeat: 'off' | 'all' | 'one' = 'off'): QueueState<Track> => ({
  queue: ids.map(t),
  index,
  repeat,
  shuffle: false,
  playingFrom: null,
});

describe('autoplay top-up rule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('WEB-AUTO-001 fewer than 10 songs left asks for similar songs using the last catalog song as seed', async () => {
    const queue = makeQueue(['yt:a', 'yt:b', 'local:c', 'yt:d', 'local:e'], 1);
    // index is 1 (yt:b), queue length is 5. Upcoming ahead of index: 5 - 1 - 1 = 3 (< 10).
    expect(needsAutoplay(queue)).toBe(true);
    expect(findAutoplaySeed(queue)?.id).toBe('yt:d');

    const fetchRelated = vi.fn().mockResolvedValue([t('yt:f'), t('yt:g')]);
    const appended: Track[][] = [];
    let state = queue;
    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => state,
      append: (songs) => {
        appended.push(songs);
        state = { ...state, queue: [...state.queue, ...songs] };
      },
      enabled: () => true,
    });

    await autoplay.check();
    expect(fetchRelated).toHaveBeenCalledTimes(1);
    expect(fetchRelated).toHaveBeenCalledWith('yt:d');
    expect(appended).toHaveLength(1);
    expect(appended[0].map((s) => s.id)).toEqual(['yt:f', 'yt:g']);
  });

  it('WEB-AUTO-002 10 or more songs left does not ask for similar songs', async () => {
    // 10 upcoming tracks ahead of currently playing track
    const tracks = ['yt:current', ...Array.from({ length: 10 }, (_, i) => `yt:next${i}`)];
    const queue = makeQueue(tracks, 0);
    expect(queue.queue.length - 1 - queue.index).toBe(10);
    expect(needsAutoplay(queue)).toBe(false);

    const fetchRelated = vi.fn().mockResolvedValue([]);
    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => queue,
      append: () => {},
      enabled: () => true,
    });

    await autoplay.check();
    expect(fetchRelated).not.toHaveBeenCalled();
  });

  it('WEB-AUTO-003 repeat all or repeat one does not ask for similar songs', async () => {
    const fetchRelated = vi.fn().mockResolvedValue([]);
    let state = makeQueue(['yt:a'], 0, 'all');
    expect(needsAutoplay(state)).toBe(false);

    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => state,
      append: () => {},
      enabled: () => true,
    });

    await autoplay.check();
    expect(fetchRelated).not.toHaveBeenCalled();

    state = makeQueue(['yt:a'], 0, 'one');
    expect(needsAutoplay(state)).toBe(false);
    await autoplay.check();
    expect(fetchRelated).not.toHaveBeenCalled();
  });

  it('WEB-AUTO-004 asks once per (playing entry, queue length) key, avoiding loops if 0 songs returned', async () => {
    const state = makeQueue(['yt:a'], 0);
    const fetchRelated = vi.fn().mockResolvedValue([]);
    const append = vi.fn();
    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => state,
      append,
      enabled: () => true,
    });

    await autoplay.check();
    expect(fetchRelated).toHaveBeenCalledTimes(1);
    expect(fetchRelated).toHaveBeenCalledWith('yt:a');
    expect(append).not.toHaveBeenCalled();

    // Check again with unchanged state: does not re-fetch the same seed
    await autoplay.check();
    expect(fetchRelated).toHaveBeenCalledTimes(1);
    autoplay.reset();
  });

  it('WEB-AUTO-005 stale answer dropped if playing song changed during fetch', async () => {
    let resolveFetch!: (tracks: Track[]) => void;
    const fetchPromise = new Promise<Track[]>((res) => {
      resolveFetch = res;
    });
    let state = makeQueue(['yt:a'], 0);
    const append = vi.fn();
    const autoplay = createAutoplay<Track>({
      fetchRelated: () => fetchPromise,
      getState: () => state,
      append,
      enabled: () => true,
    });

    const checkPromise = autoplay.check();
    // User switches track while fetch is in-flight
    state = makeQueue(['yt:other', 'yt:a'], 0);
    resolveFetch([t('yt:x'), t('yt:y')]);
    await checkPromise;

    expect(append).not.toHaveBeenCalled();
  });

  it('WEB-AUTO-006 seed selection: finds last catalog song at or after index or falls back to current track', () => {
    // Falls back to current playing track when no upcoming songs
    expect(findAutoplaySeed(makeQueue(['yt:only'], 0))?.id).toBe('yt:only');
    // Finds last catalog song even if preceded or followed by local files
    expect(findAutoplaySeed(makeQueue(['yt:start', 'local:mid', 'yt:end', 'local:trail'], 0))?.id).toBe('yt:end');
    // Falls back to playing track when all ahead are local
    expect(findAutoplaySeed(makeQueue(['yt:cur', 'local:1', 'local:2'], 0))?.id).toBe('yt:cur');
    // Returns null when no catalog songs at or after current index
    expect(findAutoplaySeed(makeQueue(['local:1', 'local:2'], 0))).toBeNull();
    expect(findAutoplaySeed(makeQueue(['yt:old', 'local:current'], 1))).toBeNull();
    // Helper exports sanity
    expect(AUTOPLAY_COUNT).toBe(10);
    expect(isCatalogSong(t('yt:123'))).toBe(true);
    expect(isCatalogSong(t('local:123'))).toBe(false);
  });

  it("WEB-AUTO-007 a seed that fails or has nothing new falls back to the queue's earlier catalog songs", async () => {
    let state = makeQueue(['yt:a', 'yt:b', 'local:c', 'yt:d'], 0);
    const fetchRelated = vi.fn(async (id: string) => {
      if (id === 'yt:d') throw new Error('upstream down');
      if (id === 'yt:b') return [t('yt:a'), t('yt:d')]; // all already queued
      return [t('yt:x'), t('yt:y')];
    });
    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => state,
      append: (songs) => {
        state = { ...state, queue: [...state.queue, ...songs] };
      },
      enabled: () => true,
    });

    await autoplay.check();
    expect(fetchRelated.mock.calls.map(([id]) => id)).toEqual(['yt:d', 'yt:b', 'yt:a']);
    expect(state.queue.map((s) => s.id)).toEqual(['yt:a', 'yt:b', 'local:c', 'yt:d', 'yt:x', 'yt:y']);
    autoplay.reset();
  });

  it('WEB-AUTO-008 an answer that gave nothing is asked again when the next song starts', async () => {
    let state = makeQueue(['yt:a', 'yt:b'], 0);
    const fetchRelated = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([t('yt:z')]);
    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => state,
      append: (songs) => {
        state = { ...state, queue: [...state.queue, ...songs] };
      },
      enabled: () => true,
    });

    await autoplay.check();
    // Both seeds were tried (yt:b failed, yt:a then answered); the queue grew.
    expect(state.queue.map((s) => s.id)).toEqual(['yt:a', 'yt:b', 'yt:z']);

    // The queue's length stays the same while the next songs play: it still asks each time.
    state = makeQueue(['yt:a', 'yt:b', 'yt:z'], 1);
    fetchRelated.mockClear();
    fetchRelated.mockResolvedValue([]);
    await autoplay.check();
    expect(fetchRelated).toHaveBeenCalled();
    fetchRelated.mockClear();
    fetchRelated.mockResolvedValue([t('yt:w')]);
    state = { ...state, index: 2 };
    await autoplay.check();
    expect(fetchRelated).toHaveBeenCalledWith('yt:z');
    expect(state.queue.map((s) => s.id)).toEqual(['yt:a', 'yt:b', 'yt:z', 'yt:w']);
    autoplay.reset();
  });

  it('WEB-AUTO-009 with nothing found it tries again by itself after a wait that doubles', async () => {
    vi.useFakeTimers();
    let state = makeQueue(['yt:a'], 0);
    const fetchRelated = vi.fn().mockRejectedValue(new Error('upstream down'));
    const autoplay = createAutoplay<Track>({
      fetchRelated,
      getState: () => state,
      append: (songs) => {
        state = { ...state, queue: [...state.queue, ...songs] };
      },
      enabled: () => true,
    });

    await autoplay.check();
    expect(fetchRelated).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(AUTOPLAY_RETRY_MS - 1);
    expect(fetchRelated).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchRelated).toHaveBeenCalledTimes(2);
    // The next wait is twice as long.
    await vi.advanceTimersByTimeAsync(AUTOPLAY_RETRY_MS);
    expect(fetchRelated).toHaveBeenCalledTimes(2);
    fetchRelated.mockResolvedValue([t('yt:b')]);
    await vi.advanceTimersByTimeAsync(AUTOPLAY_RETRY_MS);
    expect(fetchRelated).toHaveBeenCalledTimes(3);
    expect(state.queue.map((s) => s.id)).toEqual(['yt:a', 'yt:b']);
    autoplay.reset();
  });

  it('WEB-AUTO-010 seek buttons jump inside the song and the saved step is one of the offered ones', () => {
    expect(seekTarget(30_000, 10_000, 200_000)).toBe(40_000);
    expect(seekTarget(4_000, -10_000, 200_000)).toBe(0);
    // Never past the end, which would skip the song.
    expect(seekTarget(195_000, 10_000, 200_000)).toBe(199_000);
    // Length not known yet: only the start is a limit.
    expect(seekTarget(5_000, 30_000, 0)).toBe(35_000);
    expect(SEEK_STEPS).toEqual([0, 5, 10, 15, 30]);
    expect(sanitizeSeekStep(15)).toBe(15);
    expect(sanitizeSeekStep(0)).toBe(0);
    expect(sanitizeSeekStep(7)).toBe(DEFAULT_SEEK_STEP);
    expect(sanitizeSeekStep('10')).toBe(DEFAULT_SEEK_STEP);
  });
});
