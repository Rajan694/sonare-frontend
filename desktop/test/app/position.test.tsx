import React, { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { PlaybackStatus } from '../../src/audio/player';
import { usePlayerStore, type PlayerStore } from '../../src/store/playerContext';
import { makeTrack } from '../helpers/fixtures';
import { makeStore } from '../helpers/render';

/**
 * The playback position changes about four times a second. These tests mount the real App
 * (audio engine mocked) with the shell replaced by a list of SongRows and the mini player,
 * and count renders while only the position moves.
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
    renders: { rows: 0, progress: 0 },
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
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
}));
vi.mock('../../src/api/plays', () => ({ resetPlay: vi.fn(), maybeRecordPlay: vi.fn() }));
vi.mock('../../src/api/sync', () => ({ setSyncOnline: vi.fn(), startBackgroundSync: vi.fn() }));
vi.mock('../../src/storage/downloads', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/storage/downloads')>();
  mod.downloads.init = vi.fn(async () => {});
  return mod;
});
vi.mock('../../src/components/layout/AppShell', async () => {
  const { default: SongRow } = await import('../../src/components/music/SongRow');
  const { default: MiniPlayer } = await import('../../src/components/layout/MiniPlayer');
  return {
    default: function Shell() {
      const player = usePlayerStore();
      h.store.current = player;
      return (
        <>
          <Profiler id="rows" onRender={() => h.renders.rows++}>
            {player.state.queue.map((t, i) => (
              <SongRow key={t.id} track={t} index={i + 1} isActive={i === player.state.index} />
            ))}
          </Profiler>
          <Profiler id="progress" onRender={() => h.renders.progress++}>
            <MiniPlayer />
          </Profiler>
        </>
      );
    },
  };
});

import App from '../../src/App';

function playback(patch: Partial<PlaybackStatus>) {
  Object.assign(h.status, patch);
  act(() => h.playbackListeners.forEach((fn) => fn({ ...h.status })));
}

const tracks = Array.from({ length: 20 }, (_, i) =>
  makeTrack({ id: `yt:t${i}`, title: `Song ${i}`, durationMs: 200_000 }),
);

beforeEach(() => {
  Object.assign(h.status, { trackId: null, playing: false, positionMs: 0, durationMs: 0 });
  h.playbackListeners.clear();
  window.history.pushState({}, '', '/home');
  render(
    <Provider store={makeStore()}>
      <App />
    </Provider>,
  );
  act(() => h.store.current!.playTrack(tracks[0], tracks));
  // Starting playback is a real state change; everything after it is position only.
  playback({ trackId: 'yt:t0', playing: true, positionMs: 0, durationMs: 200_000 });
  h.renders.rows = 0;
  h.renders.progress = 0;
});

afterEach(() => vi.clearAllMocks());

describe('playback position', () => {
  it('WEB-PERF-001 position ticks re-render the progress display but not the song rows', () => {
    const contextBefore = h.store.current;
    for (const ms of [250, 500, 750, 1000, 1250]) playback({ positionMs: ms });

    expect(h.renders.rows).toBe(0);
    expect(h.renders.progress).toBeGreaterThanOrEqual(5);
    // The context value itself is unchanged, so nothing that reads it re-renders.
    expect(h.store.current).toBe(contextBefore);
    expect(screen.getAllByText('Song 0').length).toBeGreaterThan(0);
  });

  it('WEB-PERF-002 a real change (pausing) still reaches the rows', () => {
    playback({ playing: false, positionMs: 1500 });

    expect(h.renders.rows).toBeGreaterThan(0);
    expect(h.store.current!.isPlaying).toBe(false);
  });
});
