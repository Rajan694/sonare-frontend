import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import QueuePanel from '../../src/components/layout/QueuePanel';
import NowPlaying from '../../src/screens/NowPlaying';
import { localLibrary } from '../../src/storage/local';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { makeTrack } from '../helpers/fixtures';

vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn(), pause: vi.fn(), resume: vi.fn(), remove: vi.fn(), removeMany: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

vi.mock('../../src/audio/player', () => ({
  retry: vi.fn(async () => {}),
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  getVolume: vi.fn(() => 0.5),
  getStatus: vi.fn(() => ({ positionMs: 60_000 })),
}));

describe('queue history and up next', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('WEB-QH-001 up next shows 10 of a 15-entry queue and the right ones', () => {
    const queue = Array.from({ length: 15 }, (_, i) => makeTrack({ id: `yt:q${i}`, title: `Song ${i}` }));
    const p = makePlayer({ queue, index: 0 });
    renderWithProviders(<NowPlaying />, { player: p, route: '/now-playing' });

    expect(screen.getByText('UP NEXT')).toBeInTheDocument();
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`Song ${i}`)).toBeInTheDocument();
    }
    for (let i = 11; i < 15; i++) {
      expect(screen.queryByText(`Song ${i}`)).not.toBeInTheDocument();
    }
  });

  it('WEB-QH-002 up next shows 3 when only 3 follow', () => {
    const queue = Array.from({ length: 4 }, (_, i) => makeTrack({ id: `yt:q${i}`, title: `Track ${i}` }));
    const p = makePlayer({ queue, index: 0 });
    renderWithProviders(<NowPlaying />, { player: p, route: '/now-playing' });

    expect(screen.getByText('UP NEXT')).toBeInTheDocument();
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
    expect(screen.getByText('Track 3')).toBeInTheDocument();
    expect(screen.queryByText('Track 4')).not.toBeInTheDocument();
  });

  it('WEB-QH-003 panel shows exactly the 2 before the current one in order', () => {
    const queue = Array.from({ length: 5 }, (_, i) => makeTrack({ id: `yt:q${i}`, title: `Item ${i}` }));
    const p = makePlayer({ queue, index: 3 });
    renderWithProviders(<QueuePanel onClose={vi.fn()} />, { player: p });

    expect(screen.getByText('Played')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument();
  });

  it('WEB-QH-004 panel shows 1 when current is index 1, and none at index 0', () => {
    const queue = Array.from({ length: 4 }, (_, i) => makeTrack({ id: `yt:q${i}`, title: `TrackItem ${i}` }));
    // index 1
    const p1 = makePlayer({ queue, index: 1 });
    const { unmount } = renderWithProviders(<QueuePanel onClose={vi.fn()} />, { player: p1 });

    expect(screen.getByText('Played')).toBeInTheDocument();
    expect(screen.getByText('TrackItem 0')).toBeInTheDocument();
    unmount();

    // index 0
    const p0 = makePlayer({ queue, index: 0 });
    renderWithProviders(<QueuePanel onClose={vi.fn()} />, { player: p0 });
    expect(screen.queryByText('Played')).not.toBeInTheDocument();
  });

  it('WEB-QH-005 clicking a played row calls playAt with its queue index', async () => {
    const queue = Array.from({ length: 5 }, (_, i) => makeTrack({ id: `yt:q${i}`, title: `SongRow ${i}` }));
    const p = makePlayer({ queue, index: 3 });
    const { user } = renderWithProviders(<QueuePanel onClose={vi.fn()} />, { player: p });

    await user.click(screen.getByText('SongRow 1'));
    expect(p.playAt).toHaveBeenCalledWith(1);
  });

  it('WEB-QH-006 offline mode leaves out entries without a local copy in both lists', () => {
    const queue = [
      makeTrack({ id: 'yt:p0', title: 'Played Offline' }),
      makeTrack({ id: 'yt:p1', title: 'Played OnlineOnly' }),
      makeTrack({ id: 'yt:curr', title: 'Current Song' }),
      makeTrack({ id: 'yt:u0', title: 'Up Next Offline' }),
      makeTrack({ id: 'yt:u1', title: 'Up Next OnlineOnly' }),
    ];
    vi.spyOn(localLibrary, 'localIdFor').mockImplementation((id) => {
      if (id === 'yt:p0' || id === 'yt:curr' || id === 'yt:u0') return `local:${id}`;
      return null;
    });

    // Test QueuePanel in offline mode
    const pPanel = makePlayer({ queue, index: 2 });
    const { unmount } = renderWithProviders(<QueuePanel onClose={vi.fn()} />, {
      player: pPanel,
      mode: 'offline',
    });

    expect(screen.getByText('Played')).toBeInTheDocument();
    expect(screen.getByText('Played Offline')).toBeInTheDocument();
    expect(screen.queryByText('Played OnlineOnly')).not.toBeInTheDocument();
    expect(screen.getByText('Up Next Offline')).toBeInTheDocument();
    expect(screen.queryByText('Up Next OnlineOnly')).not.toBeInTheDocument();
    unmount();

    // Test NowPlaying in offline mode
    const pNowPlaying = makePlayer({ queue, index: 2 });
    renderWithProviders(<NowPlaying />, {
      player: pNowPlaying,
      mode: 'offline',
      route: '/now-playing',
    });

    expect(screen.getByText('Up Next Offline')).toBeInTheDocument();
    expect(screen.queryByText('Up Next OnlineOnly')).not.toBeInTheDocument();
  });
});
