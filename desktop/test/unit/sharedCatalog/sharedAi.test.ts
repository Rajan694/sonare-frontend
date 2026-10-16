import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiPick, Track } from '../../../../shared/apiTypes';
import {
  addTitleFixes,
  applyTitleFix,
  looksMessy,
  pendingTitleCount,
  resetTitleFixes,
  takePendingTitles,
  titleFixesSnapshot,
} from '../../../../shared/catalog/titleFixes';
import { normalizeStreamItemToTrack } from '../../../../shared/catalog/normalize';
import { bestMatch, resolvePicks, searchPlanSongs } from '../../../../shared/ai/resolvePicks';
import { startTitleSync } from '../../../../shared/ai/titleSync';

const track = (id: string, title: string, artist: string): Track => ({
  id: `yt:${id}`,
  title,
  artist,
  artistId: 'yt:UC1',
  albumId: null,
  album: null,
  durationMs: 200_000,
  source: 'server',
  playCount: 0,
  favourite: false,
  addedAt: 0,
});

describe('title fixes', () => {
  beforeEach(() => resetTitleFixes());

  it('WEB-AI-001 looksMessy flags upload-style titles and leaves Topic channels and plain titles alone', () => {
    expect(looksMessy('Tum Hi Ho | Aashiqui 2', 'T-Series')).toBe(true);
    expect(looksMessy('Arijit Singh - Tum Hi Ho', 'T-Series')).toBe(true);
    expect(looksMessy('Kesariya Full Song', 'Sony Music India')).toBe(true);
    expect(looksMessy('Blinding Lights #weeknd', 'The Weeknd')).toBe(true);
    expect(looksMessy('Shape of You', 'Ed Sheeran')).toBe(false);
    expect(looksMessy('Tum Hi Ho - Live', 'Arijit Singh - Topic')).toBe(false);
    expect(looksMessy('', 'x')).toBe(false);
  });

  it('WEB-AI-002 applyTitleFix returns a known fix, else the input, and notes messy songs once', () => {
    expect(applyTitleFix('yt:abc', 'Tum Hi Ho | Aashiqui 2', 'T-Series', 'T-Series')).toEqual({
      title: 'Tum Hi Ho | Aashiqui 2',
      artist: 'T-Series',
    });
    applyTitleFix('abc', 'Tum Hi Ho | Aashiqui 2', 'T-Series', 'T-Series');
    applyTitleFix('clean', 'Shape of You', 'Ed Sheeran', 'Ed Sheeran');
    expect(pendingTitleCount()).toBe(1);

    addTitleFixes({ 'yt:abc': { title: 'Tum Hi Ho', artist: 'Arijit Singh' } });
    expect(pendingTitleCount()).toBe(0);
    expect(applyTitleFix('abc', 'whatever', 'x')).toEqual({ title: 'Tum Hi Ho', artist: 'Arijit Singh' });
    expect(titleFixesSnapshot()).toEqual({ abc: { title: 'Tum Hi Ho', artist: 'Arijit Singh' } });
  });

  it('WEB-AI-003 takePendingTitles spaces retries and gives up after three tries', () => {
    applyTitleFix('m1', 'A | B', 'C', 'C');
    const t0 = 1_000_000;
    expect(takePendingTitles(10, t0)).toEqual([{ id: 'm1', title: 'A | B', artist: 'C' }]);
    expect(takePendingTitles(10, t0 + 1000)).toEqual([]);
    expect(takePendingTitles(10, t0 + 91_000)).toHaveLength(1);
    expect(takePendingTitles(10, t0 + 182_000)).toHaveLength(1);
    expect(takePendingTitles(10, t0 + 273_000)).toEqual([]);
    expect(pendingTitleCount()).toBe(0);
    applyTitleFix('m1', 'A | B', 'C', 'C');
    expect(pendingTitleCount()).toBe(0);
  });

  it('WEB-AI-004 normalizeStreamItemToTrack shows a fix in place of the raw title and artist', () => {
    const item = {
      url: '/watch?v=vid1',
      type: 'stream',
      title: 'Kesariya (Official Video) | Brahmastra',
      uploaderName: 'Sony Music India',
      uploaderUrl: '/channel/UCsony',
      duration: 240,
    };
    expect(normalizeStreamItemToTrack(item as never).title).toBe('Kesariya | Brahmastra');
    expect(pendingTitleCount()).toBe(1);
    addTitleFixes({ vid1: { title: 'Kesariya', artist: 'Arijit Singh' } });
    const fixed = normalizeStreamItemToTrack(item as never);
    expect(fixed.title).toBe('Kesariya');
    expect(fixed.artist).toBe('Arijit Singh');
    expect(fixed.artistId).toBe('yt:UCsony');
  });
});

describe('resolvePicks', () => {
  const pick: AiPick = { title: 'Tum Hi Ho', artist: 'Arijit Singh' };

  it('WEB-AI-005 bestMatch needs the title, prefers the artist, and skips unrelated results', () => {
    const results = [
      track('x', 'Tum Se Hi', 'Mohit Chauhan'),
      track('y', 'Tum Hi Ho (Lyrics) - Aashiqui 2', 'T-Series'),
      track('z', 'Tum Hi Ho', 'Arijit Singh'),
    ];
    expect(bestMatch(pick, results)?.id).toBe('yt:z');
    expect(bestMatch(pick, [results[0]])).toBeNull();
    expect(bestMatch({ title: 'तुम ही हो', artist: 'अरिजीत' }, [track('h', 'तुम ही हो', 'अरिजीत सिंह')])?.id).toBe(
      'yt:h',
    );
  });

  it('WEB-AI-006 resolvePicks keeps found picks in order, once each, skipping failures and excluded ids', async () => {
    const picks: AiPick[] = [
      { title: 'Alpha Light', artist: 'Artist One' },
      { title: 'Bravo Night', artist: 'Artist Two' },
      { title: 'Alpha Light', artist: 'Artist One' },
      { title: 'Charlie Rain', artist: 'Artist Three' },
      { title: 'Delta Sky', artist: 'Artist Four' },
    ];
    const search = vi.fn(async (q: string) => {
      if (q.startsWith('Bravo')) throw new Error('offline');
      const pick = picks.find((p) => q.startsWith(p.title))!;
      return [track(pick.title.split(' ')[0], pick.title, pick.artist)];
    });
    const out = await resolvePicks(picks, search, { exclude: new Set(['yt:Delta']) });
    expect(out.map((r) => r.track.id)).toEqual(['yt:Alpha', 'yt:Charlie']);
    expect(search).toHaveBeenCalledTimes(5);

    const limited = await resolvePicks(picks, search, { limit: 1, concurrency: 1 });
    expect(limited.map((r) => r.track.id)).toEqual(['yt:Alpha']);
  });
});

describe('startTitleSync', () => {
  beforeEach(() => {
    resetTitleFixes();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('WEB-AI-007 sends noted songs in batches while enabled, applies the answer, and saves it', async () => {
    let enabled = false;
    const post = vi.fn(async () => ({ fixes: { s1: { title: 'Song', artist: 'Singer' } } }));
    const save = vi.fn(async () => {});
    const load = vi.fn(async () => ({ old: { title: 'Old', artist: 'One' } }));
    const stop = startTitleSync({ post, save, load, enabled: () => enabled, intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(applyTitleFix('old', 'x | y', 'z', 'z').title).toBe('Old');

    applyTitleFix('s1', 'Song | Movie', 'Label', 'Label');
    await vi.advanceTimersByTimeAsync(1000);
    expect(post).not.toHaveBeenCalled();

    enabled = true;
    await vi.advanceTimersByTimeAsync(1000);
    expect(post).toHaveBeenCalledWith([{ id: 's1', title: 'Song | Movie', artist: 'Label' }]);
    expect(applyTitleFix('s1', 'Song | Movie', 'Label').title).toBe('Song');
    expect(save).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('searchPlanSongs', () => {
  it('WEB-AI-008 takes the first songs of each query in order, each song once by id and by title and artist', async () => {
    const results: Record<string, Track[]> = {
      first: [
        track('a', 'Soch', 'Hardy Sandhu'),
        track('b', 'Joker', 'Hardy Sandhu'),
        track('c', 'Extra', 'X'),
        track('d', 'Fourth', 'Y'),
      ],
      second: [
        track('b', 'Joker', 'Hardy Sandhu'),
        track('e', 'SOCH', 'Hardy  Sandhu'),
        track('f', 'Qismat', 'Ammy Virk'),
      ],
    };
    const songs = await searchPlanSongs(['first', 'second', 'broken'], async (q) => {
      if (q === 'broken') throw new Error('offline');
      return results[q];
    });
    expect(songs.map((t) => t.id)).toEqual(['yt:a', 'yt:b', 'yt:c', 'yt:f']);
  });
});
