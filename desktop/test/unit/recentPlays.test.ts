import { beforeEach, describe, expect, it, vi } from 'vitest';

const fresh = async () => {
  vi.resetModules();
  return import('../../src/storage/recentPlays');
};

beforeEach(() => localStorage.clear());

describe('device recent plays', () => {
  it('WEB-RECENT-001 starts empty and keeps the newest play first', async () => {
    const p = await fresh();
    expect(p.getRecentPlays()).toEqual([]);
    p.rememberRecentPlay({ id: 'yt:a' });
    p.rememberRecentPlay({ id: 'local:b' });
    expect(p.getRecentPlays().map((x) => x.id)).toEqual(['local:b', 'yt:a']);
  });

  it('WEB-RECENT-002 a repeat moves the song back to the front instead of listing it twice', async () => {
    const p = await fresh();
    p.rememberRecentPlay({ id: 'yt:a' });
    p.rememberRecentPlay({ id: 'yt:b' });
    p.rememberRecentPlay({ id: 'yt:a' });
    expect(p.getRecentPlays().map((x) => x.id)).toEqual(['yt:a', 'yt:b']);
  });

  it('WEB-RECENT-003 keeps the last 50, reads them back, and ignores unreadable storage', async () => {
    let p = await fresh();
    for (let i = 0; i < 60; i++) p.rememberRecentPlay({ id: `yt:${i}` });
    expect(p.getRecentPlays()).toHaveLength(50);
    // Reloading the module reads the saved list back.
    p = await fresh();
    expect(p.getRecentPlays().map((x) => x.id)).toEqual(Array.from({ length: 50 }, (_, i) => `yt:${59 - i}`));
    localStorage.setItem('sonare_recent_plays', '{oops');
    p = await fresh();
    expect(p.getRecentPlays()).toEqual([]);
  });
});
