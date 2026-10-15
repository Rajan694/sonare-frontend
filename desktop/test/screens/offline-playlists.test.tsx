import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import Playlists from '../../src/screens/Playlists';
import PlaylistDetail from '../../src/screens/PlaylistDetail';
import TrackMenu, { closeTrackMenu } from '../../src/components/music/TrackMenu';
import { clearSession, setSession } from '../../src/api/auth';
import { renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';
import {
  saveOfflinePlaylists,
  saveOfflinePlaylistSongs,
  getOfflinePlaylists,
} from '../../src/storage/offlinePlaylists';
import { localLibrary } from '../../src/storage/local';

/**
 * Offline Playlists store + screen tests (DSK-4 Part 1, audit I7).
 *
 * Pattern: seed localStorage before calling setSession so the onAuthChange
 * listener inside offlinePlaylists.ts picks the data up immediately.  Tests
 * that go through the public API (saveOfflinePlaylists / saveOfflinePlaylistSongs)
 * use setSession first to establish a user, then call the API.
 */

const STORAGE_KEY = 'sonare_offline_playlists';

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

useMockServer(
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/favourites/ids`, () => HttpResponse.json({ ids: [] })),
);

afterEach(() => {
  act(() => closeTrackMenu());
  clearSession();
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Store-level tests
// ---------------------------------------------------------------------------

describe('offline playlists store', () => {
  it('WEB-OFPL-001 saveOfflinePlaylists persists the list for the signed-in user and is readable by getOfflinePlaylists', () => {
    act(() => setSession('a', 'r', testUser));
    const pl = makePlaylist({ id: 'sonare:a', name: 'Morning', kind: 'synced' });
    act(() => saveOfflinePlaylists([pl]));

    const state = getOfflinePlaylists();
    expect(state.playlists).toHaveLength(1);
    expect(state.playlists[0].name).toBe('Morning');

    // Also check localStorage directly.
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.userId).toBe(testUser.id);
    expect(parsed.playlists[0].id).toBe('sonare:a');
  });

  it('WEB-OFPL-002 saveOfflinePlaylistSongs saves songs per playlist id and tracks updatedAt', () => {
    act(() => setSession('a', 'r', testUser));
    const songs = [makeTrack({ id: 'yt:s1', title: 'Alpha' }), makeTrack({ id: 'yt:s2', title: 'Beta' })];
    act(() => saveOfflinePlaylistSongs('sonare:b', songs, 1_700_000_001_000));

    const state = getOfflinePlaylists();
    const saved = state.songs.get('sonare:b');
    expect(saved).toHaveLength(2);
    expect(saved![0].title).toBe('Alpha');

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.songs['sonare:b'].updatedAt).toBe(1_700_000_001_000);
  });

  it('WEB-OFPL-003 signing in as a different user shows nothing until that user has data', () => {
    // Seed data for user A.
    const storedA = {
      userId: 'u-a',
      playlists: [makePlaylist({ id: 'sonare:x', name: 'UserA playlist', kind: 'synced' })],
      songs: {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedA));

    // Sign in as testUser (u-test), not u-a: nothing should show for them.
    act(() => setSession('a', 'r', testUser));
    const state = getOfflinePlaylists();
    expect(state.playlists).toHaveLength(0);
    expect(state.songs.size).toBe(0);
  });

  it('WEB-OFPL-004 signing out clears the view (another user or guest sees nothing)', () => {
    const stored = {
      userId: testUser.id,
      playlists: [makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced' })],
      songs: {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    act(() => setSession('a', 'r', testUser));
    expect(getOfflinePlaylists().playlists).toHaveLength(1);

    act(() => clearSession());
    expect(getOfflinePlaylists().playlists).toHaveLength(0);
  });

  it('WEB-OFPL-005 saveOfflinePlaylists drops songs for playlists no longer in the list', () => {
    act(() => setSession('a', 'r', testUser));
    const plA = makePlaylist({ id: 'sonare:keep', name: 'Keep', kind: 'synced' });
    const plB = makePlaylist({ id: 'sonare:drop', name: 'Drop', kind: 'synced' });
    act(() => {
      saveOfflinePlaylists([plA, plB]);
      saveOfflinePlaylistSongs('sonare:keep', [makeTrack()]);
      saveOfflinePlaylistSongs('sonare:drop', [makeTrack()]);
    });
    // Now save without plB.
    act(() => saveOfflinePlaylists([plA]));
    const state = getOfflinePlaylists();
    expect(state.songs.has('sonare:keep')).toBe(true);
    expect(state.songs.has('sonare:drop')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Screen-level tests
// ---------------------------------------------------------------------------

describe('Playlists screen in Offline Mode', () => {
  const seedAndSignIn = (
    playlists: ReturnType<typeof makePlaylist>[],
    songs: Record<string, ReturnType<typeof makeTrack>[]> = {},
  ) => {
    const stored = {
      userId: testUser.id,
      playlists,
      songs: Object.fromEntries(
        Object.entries(songs).map(([id, s]) => [id, { updatedAt: 1_700_000_000_000, songs: s }]),
      ),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    act(() => setSession('a', 'r', testUser));
  };

  it('WEB-OFPL-006 offline Playlists lists only sonare: playlists from the offline store', async () => {
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced', trackCount: 8 });
    const ytPl = makePlaylist({ id: 'yt:PL99', name: 'YouTube Hits', kind: 'online' });
    seedAndSignIn([gym, ytPl]);
    renderWithProviders(<Playlists />, { mode: 'offline' });
    expect(await screen.findByRole('link', { name: /Gym/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /YouTube Hits/ })).not.toBeInTheDocument();
  });

  it('WEB-OFPL-007 offline Playlists dims playlists with no songs on this device', async () => {
    const noSongs = makePlaylist({ id: 'sonare:empty', name: 'No Device Songs', kind: 'synced' });
    seedAndSignIn([noSongs], { 'sonare:empty': [] });
    renderWithProviders(<Playlists />, { mode: 'offline' });
    const link = await screen.findByRole('link', { name: /No Device Songs/ });
    expect(link).toHaveClass('opacity-60');
    expect(within(link).getByText('No songs on this device')).toBeInTheDocument();
  });

  it('WEB-OFPL-011 offline Playlists counts the songs on this device and does not dim a playlist that has some', async () => {
    vi.spyOn(localLibrary, 'localIdFor').mockImplementation((id) => (id === 'yt:have' ? 'local:have' : null));
    const mix = makePlaylist({ id: 'sonare:mix', name: 'Mix', kind: 'synced', trackCount: 3 });
    seedAndSignIn([mix], {
      'sonare:mix': [makeTrack({ id: 'yt:have' }), makeTrack({ id: 'yt:a' }), makeTrack({ id: 'yt:b' })],
    });
    renderWithProviders(<Playlists />, { mode: 'offline' });
    const link = await screen.findByRole('link', { name: /Mix/ });
    expect(within(link).getByText('1 of 3 songs on this device')).toBeInTheDocument();
    expect(link).not.toHaveClass('opacity-60');
  });

  it('WEB-OFPL-008 offline Playlists does not show the New playlist button', async () => {
    seedAndSignIn([makePlaylist({ id: 'sonare:x', name: 'Mix', kind: 'synced' })]);
    renderWithProviders(<Playlists />, { mode: 'offline' });
    await screen.findByRole('link', { name: /Mix/ });
    expect(screen.queryByRole('button', { name: 'New playlist' })).not.toBeInTheDocument();
  });
});

describe('PlaylistDetail screen in Offline Mode (own playlist)', () => {
  const openOfflinePlaylist = (id: string) =>
    renderWithProviders(
      <>
        <PlaylistDetail />
        <TrackMenu />
      </>,
      { route: `/playlist/${id}`, path: '/playlist/:id', mode: 'offline' },
    );

  it('WEB-OFPL-009 offline own playlist shows meta from the offline store and no Add songs button', async () => {
    const pl = makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced', trackCount: 3 });
    const stored = {
      userId: testUser.id,
      playlists: [pl],
      songs: { 'sonare:gym': { updatedAt: 1_700_000_000_000, songs: [] } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    act(() => setSession('a', 'r', testUser));

    openOfflinePlaylist('sonare:gym');
    expect(await screen.findByText('Gym', { selector: '.text-display-m, .text-display' })).toBeInTheDocument();
    // No server-dependent editing controls.
    expect(screen.queryByRole('button', { name: 'Add songs' })).not.toBeInTheDocument();
  });

  it("WEB-OFPL-010 offline own playlist shows empty-state message when songs aren't on device", async () => {
    const pl = makePlaylist({ id: 'sonare:chill', name: 'Chill', kind: 'synced' });
    const stored = {
      userId: testUser.id,
      playlists: [pl],
      songs: { 'sonare:chill': { updatedAt: 1_700_000_000_000, songs: [] } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    act(() => setSession('a', 'r', testUser));

    openOfflinePlaylist('sonare:chill');
    expect(await screen.findByText('No songs on this device')).toBeInTheDocument();
    expect(screen.getByText("None of this playlist's songs are on this device.")).toBeInTheDocument();
  });

  it('WEB-OFPL-012 offline own playlist lists only the songs on this device and says how many need the internet', async () => {
    vi.spyOn(localLibrary, 'localIdFor').mockImplementation((id) => (id === 'yt:have' ? 'local:have' : null));
    const pl = makePlaylist({ id: 'sonare:mix', name: 'Mix', kind: 'synced', trackCount: 3 });
    const stored = {
      userId: testUser.id,
      playlists: [pl],
      songs: {
        'sonare:mix': {
          updatedAt: 1_700_000_000_000,
          songs: [
            makeTrack({ id: 'yt:have', title: 'On Disk' }),
            makeTrack({ id: 'yt:a', title: 'Online One' }),
            makeTrack({ id: 'yt:b', title: 'Online Two' }),
          ],
        },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    act(() => setSession('a', 'r', testUser));

    openOfflinePlaylist('sonare:mix');
    expect(await screen.findByRole('button', { name: 'Play On Disk' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play Online One' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play Online Two' })).not.toBeInTheDocument();
    expect(screen.getByText('2 songs need the internet')).toBeInTheDocument();
    expect(screen.getByText(/· 1 song(?!s)/)).toBeInTheDocument();
  });
});
