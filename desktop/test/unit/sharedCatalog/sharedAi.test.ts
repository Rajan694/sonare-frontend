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
import { shortTitlesFor, shouldFixTitle, isServerSong } from '../../../../shared/ai/downloadTitles';

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

describe('shortTitlesFor', () => {
  beforeEach(() => resetTitleFixes());

  it('WEB-AI-009 shortTitlesFor selects messy titles and titles longer than 40 characters, including live and katha broadcasts', async () => {
    const kathaTrack = track(
      'katha1',
      'LIVE - SRI RAMKATHA | PUJYA RAJAN JEE | KEWAT PREM | SIWAN BIHAR | DAY 07',
      'Pujya Rajan Jee',
    );
    const messyTrack = track('messy1', 'Tum Hi Ho | Aashiqui 2', 'T-Series');
    const longCleanTrack = track(
      'long1',
      'A Very Long Symphonic Movement Number Nine In D Minor Op 125',
      'Philharmonic Orchestra',
    );

    expect(shouldFixTitle(kathaTrack)).toBe(true);
    expect(shouldFixTitle(messyTrack)).toBe(true);
    expect(shouldFixTitle(longCleanTrack)).toBe(true);

    const post = vi.fn(async (items: { id: string }[]) => {
      const fixes: Record<string, { title: string; artist: string }> = {};
      for (const item of items) {
        if (item.id === 'katha1') fixes[item.id] = { title: 'Shri Ram Katha · Day 7', artist: 'Pujya Rajan Jee' };
        if (item.id === 'messy1') fixes[item.id] = { title: 'Tum Hi Ho', artist: 'Arijit Singh' };
        if (item.id === 'long1') fixes[item.id] = { title: 'Symphony No. 9', artist: 'Beethoven' };
      }
      return { fixes };
    });

    const res = await shortTitlesFor([kathaTrack, messyTrack, longCleanTrack], post);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith([
      { id: 'katha1', title: kathaTrack.title, artist: kathaTrack.artist },
      { id: 'messy1', title: messyTrack.title, artist: messyTrack.artist },
      { id: 'long1', title: longCleanTrack.title, artist: longCleanTrack.artist },
    ]);

    expect(res.get('yt:katha1')).toEqual({ title: 'Shri Ram Katha · Day 7', artist: 'Pujya Rajan Jee' });
    expect(res.get('katha1')).toEqual({ title: 'Shri Ram Katha · Day 7', artist: 'Pujya Rajan Jee' });
    expect(res.get('yt:messy1')?.title).toBe('Tum Hi Ho');
    expect(res.get('yt:long1')?.title).toBe('Symphony No. 9');
  });

  it('WEB-AI-010 shortTitlesFor skips local songs, short clean titles, and songs with known fixes', async () => {
    addTitleFixes({ known1: { title: 'Pre-existing Title', artist: 'Known Artist' } });

    const localTrack: Track = {
      ...track('loc1', 'Messy Song Title | Official Audio', 'Local Artist'),
      id: 'local:loc1',
      source: 'local',
    };
    const cleanTrack = track('clean1', 'Shape of You', 'Ed Sheeran');
    const knownTrack = track('known1', 'Pre-existing Song Title | With Clutter', 'Upload Channel');

    expect(isServerSong(localTrack)).toBe(false);
    expect(shouldFixTitle(localTrack)).toBe(false);
    expect(shouldFixTitle(cleanTrack)).toBe(false);
    expect(shouldFixTitle(knownTrack)).toBe(false);

    const post = vi.fn(async () => ({ fixes: {} }));
    const res = await shortTitlesFor([localTrack, cleanTrack, knownTrack], post);

    expect(post).not.toHaveBeenCalled();
    // Known fix is present in the returned Map
    expect(res.get('yt:known1')).toEqual({ title: 'Pre-existing Title', artist: 'Known Artist' });
    expect(res.get('known1')).toEqual({ title: 'Pre-existing Title', artist: 'Known Artist' });
    // Local and clean tracks are not in the Map
    expect(res.has('local:loc1')).toBe(false);
    expect(res.has('yt:clean1')).toBe(false);
  });

  it('WEB-AI-011 shortTitlesFor sends in chunks of 50 with at most 3 in parallel, updates registry, and resolves Map', async () => {
    const tracks: Track[] = Array.from({ length: 120 }, (_, i) =>
      track(`song${i}`, `Messy Title Number ${i} | Official Music Video HD`, `Artist ${i}`),
    );

    let activeRequests = 0;
    let maxConcurrent = 0;

    const post = vi.fn(async (items: { id: string; title: string; artist: string }[]) => {
      activeRequests++;
      maxConcurrent = Math.max(maxConcurrent, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeRequests--;

      const fixes: Record<string, { title: string; artist: string }> = {};
      for (const item of items) {
        fixes[item.id] = { title: `Short ${item.id}`, artist: item.artist };
      }
      return { fixes };
    });

    const res = await shortTitlesFor(tracks, post);
    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls[0][0]).toHaveLength(50);
    expect(post.mock.calls[1][0]).toHaveLength(50);
    expect(post.mock.calls[2][0]).toHaveLength(20);
    expect(maxConcurrent).toBeLessThanOrEqual(3);

    expect(res.size).toBe(240); // 120 bare IDs + 120 yt: IDs
    expect(res.get('yt:song0')).toEqual({ title: 'Short song0', artist: 'Artist 0' });
    expect(res.get('song119')).toEqual({ title: 'Short song119', artist: 'Artist 119' });
    expect(titleFixesSnapshot()['song0']).toEqual({ title: 'Short song0', artist: 'Artist 0' });
  });

  it('WEB-AI-012 shortTitlesFor resolves with completed fixes upon timeout and never rejects on chunk failure', async () => {
    // Test 1: Chunk failure does not reject
    const t1 = track('f1', 'Messy Song 1 | Official Audio 2026', 'Artist 1');
    const t2 = track('f2', 'Messy Song 2 | Official Audio 2026', 'Artist 2');

    const failingPost = vi.fn(async (items: { id: string }[]) => {
      if (items.some((i) => i.id === 'f1')) {
        throw new Error('500 Internal Server Error');
      }
      return { fixes: { f2: { title: 'Clean Song 2', artist: 'Artist 2' } } };
    });

    const res1 = await shortTitlesFor([t1, t2], failingPost);
    expect(res1.has('yt:f1')).toBe(false);

    // Test 2: Timeout resolves with whatever completed in time
    const t3 = track('slow1', 'Messy Song 3 | Official Audio 2026', 'Artist 3');
    const slowPost = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { fixes: { slow1: { title: 'Slow Fixed', artist: 'Artist 3' } } };
    });

    const res2 = await shortTitlesFor([t3], slowPost, { timeoutMs: 30 });
    expect(res2.has('yt:slow1')).toBe(false);

    // Test 3: Fix with empty artist keeps the song's original artist
    const tEmptyArtist = track('emptyArt1', 'Messy Title | Official Audio 2026', 'Original Artist');
    const emptyArtistPost = vi.fn(async () => ({
      fixes: { emptyArt1: { title: 'Clean Title Only', artist: '' } },
    }));
    const res3 = await shortTitlesFor([tEmptyArtist], emptyArtistPost);
    expect(res3.get('yt:emptyArt1')).toEqual({ title: 'Clean Title Only', artist: 'Original Artist' });
    expect(res3.get('emptyArt1')).toEqual({ title: 'Clean Title Only', artist: 'Original Artist' });

    // Test 4: Known fix with empty artist keeps original artist
    addTitleFixes({ emptyKnown: { title: 'Known Clean Title', artist: '' } });
    const tEmptyKnown = track('emptyKnown', 'Another Messy Title | Official Audio', 'Fallback Artist');
    const res4 = await shortTitlesFor([tEmptyKnown], vi.fn());
    expect(res4.get('emptyKnown')).toEqual({ title: 'Known Clean Title', artist: 'Fallback Artist' });
  });
});
