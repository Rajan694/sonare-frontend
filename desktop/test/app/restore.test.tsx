import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { PlayerStore } from '../../src/store/playerContext';
import type { PlaybackStatus } from '../../src/audio/player';
import { makeTrack, testUser } from '../helpers/fixtures';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';

/**
 * Bringing the queue back (App.tsx + storage/playerPersist.ts) and the Media Session controls.
 * The real App, the audio engine mocked, the shell replaced by a probe for the PlayerStore.
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
    store: { current: null as PlayerStore | null },
    handlers: new Map<string, (d: { seekTime?: number }) => void>(),
  };
});

vi.mock('../../src/audio/player', () => ({
  getStatus: () => h.status,
  onPlaybackChange: (fn: (s: PlaybackStatus) => void) => {
    h.playbackListeners.add(fn);
    fn(h.status);
    return () => h.playbackListeners.delete(fn);
  },
  onEnded: () => () => {},
  playTrackId: vi.fn(async () => {}),
  play: vi.fn(async () => {}),
  pause: vi.fn(),
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
}));
vi.mock('../../src/api/plays', () => ({ resetPlay: vi.fn(), maybeRecordPlay: vi.fn() }));
vi.mock('../../src/api/sync', () => ({ setSyncOnline: vi.fn(), startBackgroundSync: vi.fn() }));
vi.mock('../../src/storage/downloads', () => ({ downloads: { init: vi.fn(async () => {}) } }));
vi.mock('../../src/components/layout/AppShell', async () => {
  const { usePlayerStore } = await import('../../src/store/playerContext');
  return {
    default: function Probe() {
      h.store.current = usePlayerStore();
      return null;
    },
  };
});

import App from '../../src/App';
import * as player from '../../src/audio/player';
import { setSession } from '../../src/api/auth';
import { getPlaybackPosition } from '../../src/store/playbackPosition';

useMockServer(http.get(`${API}/me/settings`, () => HttpResponse.json({})));

const store = () => h.store.current!;
const ids = () => store().state.queue.map((t) => t.id);
const [a, b, c] = ['a', 'b', 'c'].map((id) => makeTrack({ id: `yt:${id}`, title: id.toUpperCase() }));
const saved = (over: object = {}) => ({
  queue: [a, b, c],
  index: 1,
  positionMs: 42_000,
  shuffle: true,
  repeat: 'all',
  playingFrom: { kind: 'Album', name: 'Some album' },
  savedAt: 1_000,
  ...over,
});

beforeEach(() => {
  window.history.pushState({}, '', '/home');
  vi.stubGlobal(
    'MediaMetadata',
    class {
      constructor(public init: object) {}
    },
  );
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: {
      metadata: null,
      playbackState: 'none',
      setActionHandler: (action: string, fn: ((d: { seekTime?: number }) => void) | null) => {
        if (fn) h.handlers.set(action, fn);
        else h.handlers.delete(action);
      },
      setPositionState: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  h.handlers.clear();
});

describe('bringing the queue back', () => {
  it('WEB-RESTORE-001 a saved queue comes back paused at its song and position; Play resumes there', () => {
    localStorage.setItem('sonare_player', JSON.stringify(saved()));
    render(<App />);
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:c']);
    expect(store().currentTrack?.id).toBe('yt:b');
    expect(store().state).toMatchObject({ shuffle: true, repeat: 'all', playingFrom: { kind: 'Album' } });
    expect(getPlaybackPosition()).toBe(42_000);
    // Nothing loads until Play.
    expect(player.playTrackId).not.toHaveBeenCalled();
    act(() => store().togglePlay());
    expect(player.playTrackId).toHaveBeenCalledWith('yt:b', false, 42_000);
    expect(player.toggle).not.toHaveBeenCalled();
  });

  it('WEB-RESTORE-002 seeking a restored song before Play moves where it resumes', () => {
    localStorage.setItem('sonare_player', JSON.stringify(saved()));
    render(<App />);
    act(() => store().seek(90_000));
    expect(player.seek).not.toHaveBeenCalled();
    act(() => store().togglePlay());
    expect(player.playTrackId).toHaveBeenCalledWith('yt:b', false, 90_000);
  });

  it('WEB-RESTORE-003 the queue, its song and the modes are saved on the device as they change', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<App />);
    act(() => store().playTrack(c, [a, b, c], { kind: 'Playlist', name: 'Mix' }));
    await act(() => vi.advanceTimersByTimeAsync(1100));
    const stored = JSON.parse(localStorage.getItem('sonare_player')!);
    expect(stored).toMatchObject({ index: 2, repeat: 'off', playingFrom: { kind: 'Playlist', name: 'Mix' } });
    expect(stored.queue.map((t: { id: string }) => t.id)).toEqual(['yt:a', 'yt:b', 'yt:c']);
  });

  it("WEB-RESTORE-004 signed in, a newer queue from another device replaces this one's", async () => {
    localStorage.setItem('sonare_player', JSON.stringify(saved({ savedAt: 1_000 })));
    setSession('acc', 'ref', testUser);
    server.use(
      http.get(`${API}/me/player-state`, () =>
        HttpResponse.json({
          trackRef: { kind: 'server', id: 'yt:c' },
          positionMs: 5_000,
          queue: [{ v: 1, playingFrom: { kind: 'Search', name: 'phone' } }, c, a],
          index: 0,
          shuffle: false,
          repeat: 'off',
          updatedAt: 2_000,
        }),
      ),
    );
    render(<App />);
    await vi.waitFor(() => expect(store().currentTrack?.id).toBe('yt:c'));
    expect(ids()).toEqual(['yt:c', 'yt:a']);
    expect(store().state.playingFrom).toEqual({ kind: 'Search', name: 'phone' });
    expect(getPlaybackPosition()).toBe(5_000);
  });

  it('WEB-RESTORE-005 a queue from the account arriving after something was played changes nothing', async () => {
    localStorage.setItem('sonare_player', JSON.stringify(saved({ savedAt: 5_000 })));
    setSession('acc', 'ref', testUser);
    let answer!: () => void;
    const gate = new Promise<void>((r) => (answer = r));
    server.use(
      http.get(`${API}/me/player-state`, async () => {
        await gate;
        return HttpResponse.json({ queue: [{ v: 1, playingFrom: null }, c], index: 0, updatedAt: 9_000 });
      }),
    );
    render(<App />);
    act(() => store().playTrack(a, [a, b]));
    answer();
    await new Promise((r) => setTimeout(r, 30));
    expect(ids()).toEqual(['yt:a', 'yt:b']);
  });

  it("WEB-RESTORE-006 an account queue older than the device's changes nothing", async () => {
    localStorage.setItem('sonare_player', JSON.stringify(saved({ savedAt: 5_000 })));
    setSession('acc', 'ref', testUser);
    let asked = false;
    server.use(
      http.get(`${API}/me/player-state`, () => {
        asked = true;
        return HttpResponse.json({ queue: [{ v: 1, playingFrom: null }, c], index: 0, updatedAt: 4_000 });
      }),
    );
    render(<App />);
    await vi.waitFor(() => expect(asked).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:c']);
  });
});

describe('media session', () => {
  it('WEB-MEDIA-001 lock-screen and media-key controls drive the player and show the song', () => {
    render(<App />);
    act(() => store().playTrack(a, [a, b, c]));
    expect((navigator.mediaSession.metadata as unknown as { init: object }).init).toMatchObject({ title: 'A' });
    act(() => h.handlers.get('nexttrack')!({}));
    expect(store().currentTrack?.id).toBe('yt:b');
    act(() => h.handlers.get('previoustrack')!({}));
    expect(store().currentTrack?.id).toBe('yt:a');
    act(() => h.handlers.get('seekto')!({ seekTime: 12 }));
    expect(player.seek).toHaveBeenCalledWith(12_000);
    act(() => h.handlers.get('pause')!({}));
    expect(player.pause).toHaveBeenCalled();
  });
});
