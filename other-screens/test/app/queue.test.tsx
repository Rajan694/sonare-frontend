import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { PlayerStore } from '../../src/store/playerStore';
import type { PlaybackStatus } from '../../src/data/player';
import { makeTrack } from '../helpers/fixtures';

/**
 * The play queue lives in App.tsx. These tests mount the real App with the audio engine
 * mocked and the shell replaced by a probe that hands the live PlayerStore to the test.
 */
const h = vi.hoisted(() => {
  const status: PlaybackStatus = {
    trackId: null,
    playing: false,
    loading: false,
    positionMs: 0,
    durationMs: 0,
    muxed: false,
    error: null,
    volume: 1,
  };
  return {
    status,
    playbackListeners: new Set<(s: PlaybackStatus) => void>(),
    endedListeners: new Set<() => void>(),
    store: { current: null as PlayerStore | null },
  };
});

vi.mock('../../src/data/player', () => ({
  getStatus: () => h.status,
  onPlaybackChange: (fn: (s: PlaybackStatus) => void) => {
    h.playbackListeners.add(fn);
    fn(h.status);
    return () => h.playbackListeners.delete(fn);
  },
  onEnded: (fn: () => void) => {
    h.endedListeners.add(fn);
    return () => h.endedListeners.delete(fn);
  },
  playTrackId: vi.fn(async () => {}),
  play: vi.fn(async () => {}),
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
}));
vi.mock('../../src/data/plays', () => ({ resetPlay: vi.fn(), maybeRecordPlay: vi.fn() }));
vi.mock('../../src/data/sync', () => ({ setSyncOnline: vi.fn(), startBackgroundSync: vi.fn() }));
vi.mock('../../src/data/downloads', () => ({ downloads: { init: vi.fn(async () => {}) } }));
vi.mock('../../src/components/layout/AppShell', async () => {
  const { usePlayerStore } = await import('../../src/store/playerStore');
  return {
    default: function Probe() {
      h.store.current = usePlayerStore();
      return null;
    },
  };
});

import App from '../../src/App';
import * as player from '../../src/data/player';
import * as plays from '../../src/data/plays';
import * as sync from '../../src/data/sync';

const store = () => h.store.current!;
const ids = () => store().state.queue.map((t) => t.id);
const current = () => store().currentTrack?.id;

/** Report a playback state from the (mocked) audio engine. */
function playback(patch: Partial<PlaybackStatus>) {
  Object.assign(h.status, patch);
  act(() => h.playbackListeners.forEach((fn) => fn({ ...h.status })));
}
function trackEnds() {
  act(() => h.endedListeners.forEach((fn) => fn()));
}
const run = (fn: () => void) => act(fn);

const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) =>
  makeTrack({ id: `yt:${id}`, title: id.toUpperCase(), durationMs: 200_000 }),
);

beforeEach(() => {
  Object.assign(h.status, { trackId: null, playing: false, positionMs: 0, durationMs: 0 });
  h.playbackListeners.clear();
  h.endedListeners.clear();
  window.history.pushState({}, '', '/home');
  render(<App />);
});

afterEach(() => vi.clearAllMocks());

describe('starting playback', () => {
  it('WEB-QUEUE-001 playing a song from a list queues the list and starts that song', () => {
    run(() => store().playTrack(b, [a, b, c]));
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:c']);
    expect(current()).toBe('yt:b');
    expect(player.playTrackId).toHaveBeenCalledWith('yt:b');
    expect(plays.resetPlay).toHaveBeenCalledWith('yt:b', expect.any(Number));
  });

  it('WEB-QUEUE-002 playing a single song jumps to it if queued, otherwise puts it first', () => {
    run(() => store().playTrack(a, [a, b, c]));
    run(() => store().playTrack(c));
    expect(current()).toBe('yt:c');
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:c']);
    run(() => store().playTrack(d));
    expect(ids()).toEqual(['yt:d', 'yt:a', 'yt:b', 'yt:c']);
    expect(current()).toBe('yt:d');
  });

  it('WEB-QUEUE-003 counts a play from the live playback position', () => {
    run(() => store().playTrack(a, [a]));
    playback({ playing: true, positionMs: 31_000, durationMs: 200_000 });
    expect(plays.maybeRecordPlay).toHaveBeenLastCalledWith('yt:a', expect.any(Number), 31_000, 200_000);
    // Paused progress does not count.
    vi.mocked(plays.maybeRecordPlay).mockClear();
    playback({ playing: false, positionMs: 32_000 });
    expect(plays.maybeRecordPlay).not.toHaveBeenCalled();
  });

  it('WEB-QUEUE-004 the web app always syncs in Online Mode', () => {
    expect(sync.startBackgroundSync).toHaveBeenCalled();
    expect(sync.setSyncOnline).toHaveBeenCalledWith(true);
  });
});

describe('next, previous and the end of a track', () => {
  beforeEach(() => run(() => store().playTrack(a, [a, b, c])));

  it('WEB-QUEUE-005 next walks forward and stops at the end when repeat is off', () => {
    run(() => store().next());
    run(() => store().next());
    expect(current()).toBe('yt:c');
    run(() => store().next());
    expect(current()).toBe('yt:c');
  });

  it('WEB-QUEUE-006 repeat all wraps from the last song to the first', () => {
    run(() => store().cycleRepeat());
    expect(store().state.repeat).toBe('all');
    run(() => store().playTrack(c));
    run(() => store().next());
    expect(current()).toBe('yt:a');
  });

  it('WEB-QUEUE-007 repeat cycles off → all → one → off', () => {
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      run(() => store().cycleRepeat());
      seen.push(store().state.repeat);
    }
    expect(seen).toEqual(['all', 'one', 'off']);
  });

  it('WEB-QUEUE-008 previous restarts the song after 3 seconds, and goes back before that', () => {
    run(() => store().next());
    playback({ positionMs: 5_000 });
    run(() => store().previous());
    expect(player.seek).toHaveBeenCalledWith(0);
    expect(current()).toBe('yt:b');
    playback({ positionMs: 2_000 });
    run(() => store().previous());
    expect(current()).toBe('yt:a');
    // Already at the start of the queue: nothing earlier to go to.
    playback({ positionMs: 0 });
    run(() => store().previous());
    expect(current()).toBe('yt:a');
  });

  it('WEB-QUEUE-009 skip-to-previous always changes song, however far in', () => {
    run(() => store().next());
    playback({ positionMs: 90_000 });
    run(() => store().skipToPrevious());
    expect(current()).toBe('yt:a');
  });

  it('WEB-QUEUE-010 a finished song advances to the next one', () => {
    trackEnds();
    expect(current()).toBe('yt:b');
    expect(player.playTrackId).toHaveBeenLastCalledWith('yt:b');
  });

  it('WEB-QUEUE-011 with repeat one, a finished song plays again from the start', () => {
    run(() => store().cycleRepeat());
    run(() => store().cycleRepeat());
    trackEnds();
    expect(current()).toBe('yt:a');
    expect(player.seek).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalled();
  });

  it('WEB-QUEUE-012 seeking by fraction clamps to the track and uses the live duration', () => {
    playback({ durationMs: 180_000 });
    run(() => store().seekRatio(0.5));
    run(() => store().seekRatio(1.4));
    run(() => store().seekRatio(-1));
    expect(vi.mocked(player.seek).mock.calls.map((c) => c[0])).toEqual([90_000, 180_000, 0]);
  });
});

describe('shuffle', () => {
  const tracks = Array.from({ length: 8 }, (_, i) => makeTrack({ id: `yt:s${i}` }));

  it('WEB-QUEUE-013 shuffle plays every song exactly once, starting from the current one, without reordering the queue', () => {
    run(() => store().playTrack(tracks[3], tracks));
    run(() => store().toggleShuffle());
    const heard = [current()];
    for (let i = 0; i < tracks.length + 2; i++) {
      run(() => store().next());
      if (current() !== heard[heard.length - 1]) heard.push(current());
    }
    expect(heard[0]).toBe('yt:s3');
    expect([...heard].sort()).toEqual(tracks.map((t) => t.id).sort());
    expect(ids()).toEqual(tracks.map((t) => t.id));
  });

  it('WEB-QUEUE-014 turning shuffle off continues in the real queue order from the current song', () => {
    run(() => store().playTrack(tracks[0], tracks));
    run(() => store().toggleShuffle());
    run(() => store().next());
    const at = store().state.index;
    run(() => store().toggleShuffle());
    run(() => store().next());
    expect(store().state.index).toBe(Math.min(at + 1, tracks.length - 1));
  });
});

describe('editing the queue', () => {
  beforeEach(() => run(() => store().playTrack(b, [a, b, c])));

  it('WEB-QUEUE-015 play next puts a song right after the current one', () => {
    run(() => store().playNext(d));
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:d', 'yt:c']);
    expect(current()).toBe('yt:b');
  });

  it('WEB-QUEUE-016 play next moves a song that is already queued instead of duplicating it', () => {
    run(() => store().playNext(a));
    expect(ids()).toEqual(['yt:b', 'yt:a', 'yt:c']);
    expect(current()).toBe('yt:b');
    run(() => store().playNext(b));
    expect(ids()).toEqual(['yt:b', 'yt:a', 'yt:c']);
  });

  it('WEB-QUEUE-017 add to queue appends new songs and skips ones already there', () => {
    run(() => store().enqueue([c, d, a]));
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:c', 'yt:d']);
    expect(current()).toBe('yt:b');
  });

  it('WEB-QUEUE-018 removing a song before the current one keeps the same song playing', () => {
    run(() => store().removeFromQueue(0));
    expect(ids()).toEqual(['yt:b', 'yt:c']);
    expect(current()).toBe('yt:b');
  });

  it('WEB-QUEUE-019 removing the playing song hands over to the one after it', () => {
    run(() => store().removeFromQueue(1));
    expect(ids()).toEqual(['yt:a', 'yt:c']);
    expect(current()).toBe('yt:c');
  });

  it('WEB-QUEUE-020 removing the playing last song falls back to the new last song', () => {
    run(() => store().playTrack(c));
    run(() => store().removeFromQueue(2));
    expect(current()).toBe('yt:b');
  });

  it('WEB-QUEUE-021 reordering keeps the playing song playing and ignores invalid moves', () => {
    run(() => store().moveInQueue(0, 2));
    expect(ids()).toEqual(['yt:b', 'yt:c', 'yt:a']);
    expect(current()).toBe('yt:b');
    run(() => store().moveInQueue(0, 9));
    run(() => store().moveInQueue(-1, 0));
    expect(ids()).toEqual(['yt:b', 'yt:c', 'yt:a']);
  });

  it('WEB-QUEUE-022 clear upcoming keeps everything up to the current song', () => {
    run(() => store().clearUpcoming());
    expect(ids()).toEqual(['yt:a', 'yt:b']);
    expect(current()).toBe('yt:b');
  });

  it('WEB-QUEUE-023 play next on an empty queue makes it the only song', () => {
    run(() => store().removeFromQueue(0));
    run(() => store().removeFromQueue(0));
    run(() => store().removeFromQueue(0));
    expect(ids()).toEqual([]);
    run(() => store().playNext(d));
    expect(ids()).toEqual(['yt:d']);
    expect(current()).toBe('yt:d');
  });
});
