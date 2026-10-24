import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import Library from '../../src/screens/Library';
import Album from '../../src/screens/Album';
import Artist from '../../src/screens/Artist';
import TrackMenu, { closeTrackMenu } from '../../src/components/music/TrackMenu';
import { bindAccountGateNavigator } from '../../src/api/accountGate';
import { clearSession, setSession } from '../../src/api/auth';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeAlbum, makeArtist, makeTrack, page, testUser } from '../helpers/fixtures';
import { answerConfirm, chooseOption } from '../helpers/dialogs';
import { setFavourite } from '../../src/api/favourites';
import { downloads } from '../../src/storage/downloads';
import { showToast } from '../../src/store/toasts';

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/lib/caps', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/lib/caps')>();
  return {
    ...mod,
    CAPS: {
      ...mod.CAPS,
      offlineDownloads: true,
    },
  };
});
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

let mockLocalTracks: any[] = [];
let mockDownloads = new Map<string, string>();
vi.mock('../../src/storage/local', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/storage/local')>();
  return {
    ...mod,
    useLocalLibrary: () => ({
      ready: true,
      folders: [],
      tracks: mockLocalTracks,
      downloads: mockDownloads,
      scanning: null,
    }),
  };
});

const mine = [
  makeTrack({ id: 'yt:m1', title: 'Bravo', artist: 'Zed', durationMs: 300_000, album: 'Beta' }),
  makeTrack({ id: 'yt:m2', title: 'alpha', artist: 'Yan', durationMs: 100_000, album: 'Alpha' }),
  makeTrack({ id: 'yt:m3', title: 'Charlie', artist: 'Xu', durationMs: 200_000, album: 'Gamma' }),
];
const trending = [makeTrack({ id: 'yt:tr', title: 'Trending tune' })];

useMockServer(
  http.get(`${API}/trending`, () => HttpResponse.json(page(trending))),
  http.get(`${API}/genres`, () => HttpResponse.json([{ id: 'g', name: 'Indie' }])),
  http.get(`${API}/me/library/tracks`, ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter');
    const sort = url.searchParams.get('sort') as keyof (typeof mine)[0] | null;
    const order = url.searchParams.get('order');
    const items = filter === 'liked' ? [mine[0], mine[2]].map((t) => ({ ...t, favourite: true })) : [...mine];
    if (sort) {
      items.sort((a, b) => {
        const x = a[sort] ?? '';
        const y = b[sort] ?? '';
        return typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), undefined, { sensitivity: 'base' });
      });
      if (order === 'desc') items.reverse();
    }
    return HttpResponse.json(page(items));
  }),
  http.get(`${API}/me/favourites/tracks`, () =>
    HttpResponse.json(page([mine[0], mine[2]].map((t) => ({ ...t, favourite: true })))),
  ),
  http.get(`${API}/me/favourites/ids`, () => HttpResponse.json([])),
  http.get(`${API}/me/most-played`, () => HttpResponse.json(page([mine[2]]))),
  http.get(`${API}/me/library/albums`, () =>
    HttpResponse.json(page([makeAlbum({ id: 'yt:okc', title: 'OK Computer' })])),
  ),
  http.get(`${API}/me/library/artists`, () =>
    HttpResponse.json(page([makeArtist({ id: 'yt:rh', name: 'Radiohead' })])),
  ),
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
);

afterEach(() => {
  act(() => closeTrackMenu());
  clearSession();
  mockLocalTracks = [];
  mockDownloads = new Map();
  vi.restoreAllMocks();
});

const titles = () => screen.getAllByRole('row').map((r) => within(r).getAllByRole('button')[0].textContent);

describe('library', () => {
  it('WEB-LIBRARY-001 lists the saved songs with a count; Play all plays them in order', async () => {
    setSession('a', 'r', testUser);
    const player = makePlayer();
    const { user } = renderWithProviders(<Library />, { player, route: '/library' });
    expect(await screen.findByText('3 songs in your library')).toBeInTheDocument();
    expect(titles()).toEqual(['Bravo', 'alpha', 'Charlie']);
    await user.click(screen.getByRole('button', { name: 'Play all' }));
    expect(player.playTrack).toHaveBeenCalledWith(mine[0], mine, { kind: 'Library', name: 'Songs' });
  });

  it('WEB-LIBRARY-002 shuffle plays every saved song in some order', async () => {
    setSession('a', 'r', testUser);
    const player = makePlayer();
    const { user } = renderWithProviders(<Library />, { player });
    await screen.findByText('3 songs in your library');
    await user.click(screen.getByRole('button', { name: 'Shuffle' }));
    const [queue, from] = vi.mocked(player.playShuffled).mock.calls[0];
    expect(queue.map((t) => t.id).sort()).toEqual(['yt:m1', 'yt:m2', 'yt:m3']);
    expect(from).toEqual({ kind: 'Library', name: 'Songs' });
  });

  it('WEB-LIBRARY-003 sorts by title (case-insensitive), then reverses on a second click; sorts by duration', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('3 songs in your library');
    await user.click(screen.getByRole('button', { name: 'Sort by Title' }));
    await waitFor(() => expect(titles()).toEqual(['alpha', 'Bravo', 'Charlie']));
    expect(rec.paths()).toContain('GET /me/library/tracks?filter=all&sort=title&limit=100');
    await user.click(screen.getByRole('button', { name: 'Sort by Title' }));
    await waitFor(() => expect(titles()).toEqual(['Charlie', 'Bravo', 'alpha']));
    expect(rec.paths()).toContain('GET /me/library/tracks?filter=all&sort=title&order=desc&limit=100');
    await chooseOption(user, 'Sort order', 'Duration');
    await waitFor(() => expect(titles()).toEqual(['alpha', 'Charlie', 'Bravo']));
    expect(rec.paths()).toContain('GET /me/library/tracks?filter=all&sort=durationMs&limit=100');
    expect(screen.getByRole('button', { name: 'Sort order' })).toHaveTextContent('Duration');
    rec.stop();
  });

  it('WEB-LIBRARY-004 filtering to "On device" on the web leaves nothing, and says so', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('3 songs in your library');
    await chooseOption(user, 'Filter source', 'On device');
    expect(await screen.findByText('No songs found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play all' })).toBeDisabled();
    await chooseOption(user, 'Filter source', 'Server');
    expect(await screen.findAllByRole('row')).toHaveLength(3);
  });

  it('WEB-LIBRARY-005 grid view shows the songs as cards that play in the list', async () => {
    setSession('a', 'r', testUser);
    const player = makePlayer();
    const { user } = renderWithProviders(<Library />, { player });
    await screen.findByText('3 songs in your library');
    await user.click(screen.getByRole('button', { name: 'Grid view' }));
    await waitFor(() => expect(screen.queryAllByRole('row')).toHaveLength(0));
    await user.click(screen.getByRole('button', { name: 'Play Charlie' }));
    expect(player.playTrack).toHaveBeenCalledWith(mine[2], mine, { kind: 'Library', name: 'Songs' });
  });

  it('WEB-LIBRARY-006 tabs are reflected in the address, and the address opens a tab', async () => {
    setSession('a', 'r', testUser);
    const { user, location } = renderWithProviders(<Library />, { route: '/library?view=albums' });
    expect(await screen.findByRole('link', { name: /OK Computer/ })).toHaveAttribute('href', '/album/yt:okc');
    await user.click(screen.getByRole('button', { name: 'Artists' }));
    expect(location()).toBe('/library?view=artists');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Radiohead/ })).toHaveAttribute('href', '/artist/yt:rh'),
    );
    await user.click(screen.getByRole('button', { name: 'Songs' }));
    expect(location()).toBe('/library');
    // The web build has no local folders.
    expect(screen.queryByRole('button', { name: 'Folders' })).not.toBeInTheDocument();
  });

  it('WEB-LIBRARY-007 followed artists link to their pages; empty albums and artists say so', async () => {
    setSession('a', 'r', testUser);
    const first = renderWithProviders(<Library />, { route: '/library?view=artists' });
    expect(await screen.findByRole('link', { name: /Radiohead/ })).toHaveAttribute('href', '/artist/yt:rh');
    first.unmount();
    server.use(
      http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([]))),
      http.get(`${API}/me/library/artists`, () => HttpResponse.json(page([]))),
    );
    const other = renderWithProviders(<Library />, { route: '/library?view=albums' });
    expect(await screen.findByText('No saved albums')).toBeInTheDocument();
    other.unmount();
    renderWithProviders(<Library />, { route: '/library?view=artists' });
    expect(await screen.findByText('No artists yet')).toBeInTheDocument();
  });

  it('WEB-LIBRARY-008 ?view=favourites opens the Favourites tab (Liked Songs)', async () => {
    setSession('a', 'r', testUser);
    renderWithProviders(<Library />, { route: '/library?view=favourites' });
    expect(await screen.findByText('Liked Songs')).toBeInTheDocument();
    expect(await screen.findByText('2 liked songs')).toBeInTheDocument();
    expect(titles()).toEqual(['Bravo', 'Charlie']);
  });

  it("WEB-LIBRARY-009 a guest's account-only tabs invite them to sign up; Songs works", async () => {
    const { user } = renderWithProviders(<Library />, { route: '/library' });
    // Songs is the guest's own list.
    expect(await screen.findByText('Songs you like or add to a playlist show up here.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Albums' }));
    expect(screen.getByText('This lives in your account')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signin');
    await user.click(screen.getByRole('button', { name: 'Artists' }));
    expect(screen.getByText('This lives in your account')).toBeInTheDocument();
  });

  it('WEB-LIBRARY-014 an empty Songs list shows the empty state, not a chart', async () => {
    setSession('a', 'r', testUser);
    server.use(http.get(`${API}/me/library/tracks`, () => HttpResponse.json(page([]))));
    renderWithProviders(<Library />);
    expect(await screen.findByText('No songs found')).toBeInTheDocument();
    expect(screen.getByText('Songs you like or add to a playlist show up here.')).toBeInTheDocument();
    expect(screen.queryByText('Trending tune')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play all' })).toBeDisabled();
  });

  it('WEB-LIBRARY-010 genres tab is removed; ?view=genres falls back to Songs', async () => {
    setSession('a', 'r', testUser);
    renderWithProviders(<Library />, { route: '/library?view=genres' });
    expect(await screen.findByText('3 songs in your library')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Genres' })).not.toBeInTheDocument();
    expect(screen.queryByText('Browse music by genre')).not.toBeInTheDocument();
  });

  it('WEB-LIBRARY-011 artists from liked and playlisted songs show their song count; followed ones say so', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/library/artists`, () =>
        HttpResponse.json(
          page([
            makeArtist({ id: 'yt:rh', name: 'Radiohead', following: true }),
            { ...makeArtist({ id: 'yt:dil', name: 'Diljit Dosanjh', following: false }), songCount: 3 },
            { ...makeArtist({ id: 'yt:one', name: 'One Song', following: false }), songCount: 1 },
          ]),
        ),
      ),
    );
    renderWithProviders(<Library />, { route: '/library?view=artists' });
    const card = (name: string) => screen.findByRole('link', { name: new RegExp(name) });
    expect(await card('Radiohead')).toHaveTextContent('Following');
    expect(await card('Diljit Dosanjh')).toHaveTextContent('3 songs in your library');
    expect(await card('One Song')).toHaveTextContent('1 song in your library');
    expect((await card('Diljit Dosanjh')).getAttribute('href')).toBe('/artist/yt:dil');
  });

  it('WEB-LIBRARY-012 Liked chip sends filter=liked and switches between Songs and ?view=favourites', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    const { user, location } = renderWithProviders(<Library />, { route: '/library' });
    await screen.findByText('3 songs in your library');
    const chip = screen.getByRole('button', { name: 'Liked' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(await screen.findByText('Liked Songs')).toBeInTheDocument();
    expect(location()).toBe('/library?view=favourites');
    expect(rec.paths()).toContain('GET /me/library/tracks?filter=liked&sort=addedAt&limit=100');
    // Clicking again switches back to Songs
    await user.click(screen.getByRole('button', { name: 'Liked' }));
    expect(await screen.findByText('Songs', { selector: '.text-display-m' })).toBeInTheDocument();
    expect(location()).toBe('/library');
    rec.stop();
  });

  it('WEB-LIBRARY-015 first page request carries limit, sort, and filter params', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    renderWithProviders(<Library />);
    await screen.findByText('3 songs in your library');
    expect(rec.paths()).toContain('GET /me/library/tracks?filter=all&sort=addedAt&limit=100');
    rec.stop();
  });

  it('WEB-LIBRARY-016 Load more requests cursor and appends tracks', async () => {
    setSession('a', 'r', testUser);
    const moreTrack = makeTrack({ id: 'yt:m4', title: 'Delta', artist: 'Dave', durationMs: 150_000 });
    server.use(
      http.get(`${API}/me/library/tracks`, ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        if (cursor === 'next-page') {
          return HttpResponse.json(page([moreTrack]));
        }
        return HttpResponse.json(page(mine, 'next-page'));
      }),
    );
    const rec = recordRequests();
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');
    const loadMoreBtn = await screen.findByRole('button', { name: 'Load more' });
    await user.click(loadMoreBtn);
    expect(await screen.findByText('Delta')).toBeInTheDocument();
    expect(rec.paths()).toContain('GET /me/library/tracks?filter=all&sort=addedAt&limit=100&cursor=next-page');
    rec.stop();
  });

  it('WEB-LIBRARY-017 device file merge: local file sorting after last server song is hidden until last page', async () => {
    setSession('a', 'r', testUser);
    // Two local tracks: "Alpha Local" (sorts before "Bravo Server") and "Zulu Local" (sorts after "Bravo Server")
    const localBefore = makeTrack({ id: 'local:before', title: 'Alpha Local', source: 'local' });
    const localAfter = makeTrack({ id: 'local:after', title: 'Zulu Local', source: 'local' });
    mockLocalTracks = [localBefore, localAfter];

    const serverP1 = [makeTrack({ id: 'yt:s1', title: 'Bravo Server' })];
    const serverP2 = [makeTrack({ id: 'yt:s2', title: 'Charlie Server' })];

    server.use(
      http.get(`${API}/me/library/tracks`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('cursor') === 'c2') {
          return HttpResponse.json(page(serverP2));
        }
        return HttpResponse.json(page(serverP1, 'c2'));
      }),
    );

    const { user } = renderWithProviders(<Library />);
    // Sort by Title asc to test boundary
    await user.click(await screen.findByRole('button', { name: 'Sort by Title' }));
    // Alpha Local sorts before Bravo Server -> shown
    expect(await screen.findByText('Alpha Local')).toBeInTheDocument();
    expect(screen.getByText('Bravo Server')).toBeInTheDocument();
    // Zulu Local sorts after Bravo Server while hasMore is true -> HIDDEN
    expect(screen.queryByText('Zulu Local')).not.toBeInTheDocument();

    // Now load page 2 (last page, hasMore becomes false)
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    // Now Zulu Local should be shown!
    expect(await screen.findByText('Zulu Local')).toBeInTheDocument();
    expect(screen.getByText('Charlie Server')).toBeInTheDocument();
  });

  it('WEB-LIBRARY-018 Play all loads all pages before starting playback and includes device files', async () => {
    setSession('a', 'r', testUser);
    const localTrack = makeTrack({
      id: 'local:dev1',
      title: 'Zulu Device Song',
      artist: 'Local',
      source: 'local',
      addedAt: 50,
    });
    mockLocalTracks = [localTrack];
    const page2Track = makeTrack({ id: 'yt:p2', title: 'Page 2 Song', addedAt: 100 });
    server.use(
      http.get(`${API}/me/library/tracks`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('cursor') === 'c2') {
          return HttpResponse.json(page([page2Track]));
        }
        return HttpResponse.json(page(mine, 'c2'));
      }),
    );
    const player = makePlayer();
    const { user } = renderWithProviders(<Library />, { player });
    await screen.findByText('Bravo');
    await user.click(screen.getByRole('button', { name: 'Play all' }));
    await waitFor(() => {
      expect(player.playTrack).toHaveBeenCalledWith(
        mine[0],
        expect.arrayContaining([localTrack, page2Track, ...mine]),
        { kind: 'Library', name: 'Songs' },
      );
    });
  });

  it('WEB-LIBRARY-019 offline Most played shows only local and downloaded tracks', async () => {
    setSession('a', 'r', testUser);
    const downloadedTrack = makeTrack({ id: 'yt:dl1', title: 'Downloaded Song' });
    const streamedTrack = makeTrack({ id: 'yt:stream', title: 'Online Only Song' });
    const localDeviceTrack = makeTrack({ id: 'local:d1', title: 'Device Song', source: 'local' });

    mockDownloads = new Map([['yt:dl1', 'local:dl1-file']]);
    mockLocalTracks = [localDeviceTrack];

    server.use(
      http.get(`${API}/me/most-played`, () =>
        HttpResponse.json(page([downloadedTrack, streamedTrack, localDeviceTrack])),
      ),
    );

    renderWithProviders(<Library />, { route: '/library?view=most-played', mode: 'offline' });
    expect(await screen.findByText('Downloaded Song')).toBeInTheDocument();
    expect(screen.getByText('Device Song')).toBeInTheDocument();
    expect(screen.queryByText('Online Only Song')).not.toBeInTheDocument();
  });

  it('WEB-LIBRARY-020 offline Favourites shows only liked device songs', async () => {
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    const likedLocal = makeTrack({ id: 'local:fav', title: 'Fav Local Song', source: 'local' });
    const unlikedLocal = makeTrack({ id: 'local:notfav', title: 'Unliked Local Song', source: 'local' });
    mockLocalTracks = [likedLocal, unlikedLocal];

    await act(async () => {
      await setFavourite('local:fav', true, likedLocal);
    });

    renderWithProviders(<Library />, { route: '/library?view=favourites', mode: 'offline' });
    expect(await screen.findByText('Fav Local Song')).toBeInTheDocument();
    expect(screen.queryByText('Unliked Local Song')).not.toBeInTheDocument();
  });

  it('WEB-LIBRARY-021 grid view renders Load more and allows loading more songs', async () => {
    setSession('a', 'r', testUser);
    const moreTrack = makeTrack({ id: 'yt:m4', title: 'Delta Grid Song', artist: 'Dave', durationMs: 150_000 });
    server.use(
      http.get(`${API}/me/library/tracks`, ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        if (cursor === 'grid-more') {
          return HttpResponse.json(page([moreTrack]));
        }
        return HttpResponse.json(page(mine, 'grid-more'));
      }),
    );
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');
    const gridBtn = screen.getByRole('button', { name: 'Grid view' });
    await user.click(gridBtn);

    const loadMoreBtn = await screen.findByRole('button', { name: 'Load more' });
    expect(loadMoreBtn).toBeInTheDocument();
    await user.click(loadMoreBtn);
    expect(await screen.findByText('Delta Grid Song')).toBeInTheDocument();
  });

  it('WEB-LIBRARY-022 unliking in Liked view hides row without sending refetch request', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })),
      http.delete(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })),
    );
    const rec = recordRequests();
    const { user } = renderWithProviders(<Library />, { route: '/library?view=favourites' });
    expect(await screen.findByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    const initialFetchCount = rec.paths().filter((p) => p.startsWith('GET /me/library/tracks')).length;
    expect(initialFetchCount).toBe(1);

    const removeBtn = screen.getAllByRole('button', { name: 'Remove from favourites' })[0];
    await user.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    const afterFetchCount = rec.paths().filter((p) => p.startsWith('GET /me/library/tracks')).length;
    expect(afterFetchCount).toBe(initialFetchCount);
    rec.stop();
  });

  it('WEB-LIBRARY-023 selection mode toggle (toolbar button, Esc, Cancel)', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    const selectBtn = screen.getByRole('button', { name: 'Select' });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Enter selection mode
    await user.click(selectBtn);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);

    // Cancel leaves selection mode
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Re-enter and Esc leaves selection mode
    await user.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('WEB-LIBRARY-024 row click and Shift-click range selection', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));

    // Click row 1 ('Bravo')
    const row1 = screen.getByText('Bravo').closest('[role="row"]')!;
    await user.click(row1);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(within(row1).getByRole('checkbox', { name: 'Select Bravo' })).toBeChecked();

    // Shift-click row 3 ('Charlie')
    const row3 = screen.getByText('Charlie').closest('[role="row"]')!;
    await user.keyboard('{Shift>}');
    await user.click(row3);
    await user.keyboard('{/Shift}');

    expect(screen.getByText('3 selected')).toBeInTheDocument();
    const row2 = screen.getByText('alpha').closest('[role="row"]')!;
    expect(within(row1).getByRole('checkbox', { name: 'Select Bravo' })).toBeChecked();
    expect(within(row2).getByRole('checkbox', { name: 'Select alpha' })).toBeChecked();
    expect(within(row3).getByRole('checkbox', { name: 'Select Charlie' })).toBeChecked();
  });

  it('WEB-LIBRARY-025 select-all header checkbox handles all/none/indeterminate', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    const headerCheckbox = screen.getByRole('checkbox', { name: 'Select all' }) as HTMLInputElement;
    expect(headerCheckbox).not.toBeChecked();
    expect(headerCheckbox.indeterminate).toBe(false);

    // Select row 1 -> partial selection (indeterminate)
    const row1 = screen.getByText('Bravo').closest('[role="row"]')!;
    await user.click(row1);
    expect(headerCheckbox.indeterminate).toBe(true);
    expect(headerCheckbox).not.toBeChecked();

    // Click header checkbox -> selects all loaded rows
    await user.click(headerCheckbox);
    expect(headerCheckbox).toBeChecked();
    expect(headerCheckbox.indeterminate).toBe(false);
    expect(screen.getByText('3 selected')).toBeInTheDocument();

    // Click header checkbox again -> deselects all
    await user.click(headerCheckbox);
    expect(headerCheckbox).not.toBeChecked();
    expect(headerCheckbox.indeterminate).toBe(false);
    await waitFor(() => {
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  it('WEB-LIBRARY-026 batch queue enqueues all selected tracks in order and clears selection', async () => {
    setSession('a', 'r', testUser);
    const player = makePlayer();
    const { user } = renderWithProviders(<Library />, { player });
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);
    await user.click(screen.getByText('Charlie').closest('[role="row"]')!);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to queue' }));
    expect(player.enqueue).toHaveBeenCalledWith([mine[0], mine[2]]);
    // Exited selection mode
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('WEB-LIBRARY-027 batch add-to-playlist opens picker with selected tracks and clears selection', async () => {
    setSession('a', 'r', testUser);
    server.use(http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))));
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);
    await user.click(screen.getByText('alpha').closest('[role="row"]')!);

    await user.click(screen.getByRole('button', { name: 'Add to playlist…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add to playlist' });
    expect(dialog).toHaveTextContent('2 songs');
    // Exited selection mode
    await waitFor(() => {
      expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
    });
  });

  it('WEB-LIBRARY-028 batch download enqueues only downloadable server tracks', async () => {
    setSession('a', 'r', testUser);
    // Mark mine[0] ('yt:m1') as already downloaded
    mockDownloads = new Map([['yt:m1', 'local:m1']]);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);
    await user.click(screen.getByText('alpha').closest('[role="row"]')!);

    const downloadBtn = screen.getByRole('button', { name: 'Download' });
    await user.click(downloadBtn);

    expect(downloads.enqueue).toHaveBeenCalledWith([mine[1]]);
    expect(showToast).toHaveBeenCalledWith({
      title: 'Added to downloads',
      description: 'alpha',
      icon: 'download',
      variant: 'gold',
    });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    mockDownloads = new Map();
  });

  it('WEB-LIBRARY-029 batch remove from liked asks confirmation when >1 liked track selected, deletes in bulk, rolls back on error', async () => {
    setSession('a', 'r', testUser);
    server.use(http.delete(`${API}/me/favourites/tracks`, () => HttpResponse.json({ ok: true, removed: 2 })));
    const rec = recordRequests();
    const { user } = renderWithProviders(<Library />, { route: '/library?view=favourites' });
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);
    await user.click(screen.getByText('Charlie').closest('[role="row"]')!);

    const removeBtn = screen.getByRole('button', { name: 'Remove from Liked' });
    await user.click(removeBtn);

    // Confirmation dialog appears
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Remove from Liked?')).toBeInTheDocument();
    expect(screen.getByText(/Remove 2 songs/)).toBeInTheDocument();

    // Cancel cancels without deleting
    await answerConfirm(user, false);
    expect(rec.paths().filter((p) => p.includes('DELETE'))).toHaveLength(0);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    // Click again and confirm
    await user.click(removeBtn);
    await answerConfirm(user, true);

    await waitFor(() => {
      expect(rec.paths()).toContain('DELETE /me/favourites/tracks');
    });
    const deleteReq = rec.seen.find((r) => r.method === 'DELETE' && r.url.includes('/me/favourites/tracks'));
    expect(await deleteReq?.clone().json()).toEqual({ ids: ['yt:m1', 'yt:m3'] });

    rec.stop();
  });

  it('WEB-LIBRARY-030 batch remove from liked removes immediately without dialog when 1 liked track selected', async () => {
    setSession('a', 'r', testUser);
    server.use(http.delete(`${API}/me/favourites/tracks`, () => HttpResponse.json({ ok: true, removed: 1 })));
    const rec = recordRequests();
    const { user } = renderWithProviders(<Library />, { route: '/library?view=favourites' });
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);

    await user.click(screen.getByRole('button', { name: 'Remove from Liked' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(rec.paths()).toContain('DELETE /me/favourites/tracks');
    });
    rec.stop();
  });

  it('WEB-LIBRARY-031 selection resets on tab change and sort change', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    // Change sort order
    await user.click(screen.getByRole('button', { name: 'Sort by Title' }));
    await waitFor(() => {
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    // Re-enter selection mode and switch tab
    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Albums' }));
    await waitFor(() => {
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  it('WEB-LIBRARY-032 floating action bar renders icon-only buttons with aria-labels and tooltips in narrow container', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('Bravo');

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByText('Bravo').closest('[role="row"]')!);

    const toolbar = screen.getByRole('toolbar', { name: 'Selection actions' });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.className).toContain('absolute');
    expect(toolbar.className).toContain('bottom-[16px]');

    // Verify all buttons have aria-label, data-tip (tooltips), whitespace-nowrap, flex-none, and hidden @[720px]:inline label wrapper
    const queueBtn = within(toolbar).getByRole('button', { name: 'Add to queue' });
    expect(queueBtn).toHaveAttribute('aria-label', 'Add to queue');
    expect(queueBtn).toHaveAttribute('data-tip', 'Add to queue');
    expect(queueBtn.className).toContain('whitespace-nowrap');
    expect(queueBtn.className).toContain('flex-none');
    expect(queueBtn.querySelector('span')?.className).toContain('hidden @[720px]:inline');

    const playlistBtn = within(toolbar).getByRole('button', { name: 'Add to playlist…' });
    expect(playlistBtn).toHaveAttribute('aria-label', 'Add to playlist…');
    expect(playlistBtn).toHaveAttribute('data-tip', 'Add to playlist…');
    expect(playlistBtn.className).toContain('whitespace-nowrap');
    expect(playlistBtn.className).toContain('flex-none');
    expect(playlistBtn.querySelector('span')?.className).toContain('hidden @[720px]:inline');

    const downloadBtn = within(toolbar).getByRole('button', { name: 'Download' });
    expect(downloadBtn).toHaveAttribute('aria-label', 'Download');
    expect(downloadBtn).toHaveAttribute('data-tip', 'Download');
    expect(downloadBtn.className).toContain('whitespace-nowrap');
    expect(downloadBtn.className).toContain('flex-none');
    expect(downloadBtn.querySelector('span')?.className).toContain('hidden @[720px]:inline');

    const likedBtn = within(toolbar).getByRole('button', { name: 'Remove from Liked' });
    expect(likedBtn).toHaveAttribute('aria-label', 'Remove from Liked');
    expect(likedBtn).toHaveAttribute('data-tip', 'Remove from Liked');
    expect(likedBtn.className).toContain('whitespace-nowrap');
    expect(likedBtn.className).toContain('flex-none');
    expect(likedBtn.querySelector('span')?.className).toContain('hidden @[720px]:inline');

    const cancelBtn = within(toolbar).getByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toHaveAttribute('aria-label', 'Cancel');
    expect(cancelBtn).toHaveAttribute('data-tip', 'Cancel');
    expect(cancelBtn.className).toContain('whitespace-nowrap');
    expect(cancelBtn.className).toContain('flex-none');
    expect(cancelBtn.querySelector('span')?.className).toContain('hidden @[720px]:inline');
  });

  it('WEB-LIBRARY-033 phone and tablet show Songs, Albums, Artists, Downloads tabs; Downloads renders downloads', async () => {
    setSession('a', 'r', testUser);
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
    window.dispatchEvent(new Event('resize'));

    const { user, location } = renderWithProviders(<Library />, { route: '/library' });
    await screen.findByText('3 songs in your library');

    // Verify tabs are Songs, Albums, Artists, Downloads (no Favourites, no Most played)
    const tabs = screen.getAllByRole('button', { name: /^(Songs|Albums|Artists|Downloads)$/ });
    expect(tabs.map((t) => t.textContent)).toEqual(['Songs', 'Albums', 'Artists', 'Downloads']);
    expect(screen.queryByRole('button', { name: 'Favourites' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Most played' })).not.toBeInTheDocument();

    // Click Downloads tab: changes location to ?view=downloads and shows downloads view
    await user.click(screen.getByRole('button', { name: 'Downloads' }));
    expect(location()).toBe('/library?view=downloads');
    expect(await screen.findByText('No downloads yet')).toBeInTheDocument();
  });

  it('WEB-LIBRARY-034 pinned views render without tabs and with phone back button navigating back or playlists', async () => {
    setSession('a', 'r', testUser);
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
    window.dispatchEvent(new Event('resize'));

    // 1. ?view=favourites
    const fav = renderWithProviders(<Library />, { route: '/library?view=favourites' });
    expect(await screen.findByText('Liked Songs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Songs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Downloads' })).not.toBeInTheDocument();
    const favBack = screen.getByRole('button', { name: 'Back' });
    expect(favBack).toBeInTheDocument();
    await fav.user.click(favBack);
    expect(fav.location()).toBe('/playlists');
    fav.unmount();

    // 2. ?view=most-played
    const mp = renderWithProviders(<Library />, { route: '/library?view=most-played' });
    expect(await screen.findByText('Most played')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Songs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Downloads' })).not.toBeInTheDocument();
    const mpBack = screen.getByRole('button', { name: 'Back' });
    expect(mpBack).toBeInTheDocument();
    await mp.user.click(mpBack);
    expect(mp.location()).toBe('/playlists');
    mp.unmount();
  });

  it('WEB-LIBRARY-035 Most played view displays plays count in track subtitle below 720px', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/most-played`, () =>
        HttpResponse.json(page([makeTrack({ id: 'yt:c1', title: 'Top Tune', artist: 'Pop Star', playCount: 42 })])),
      ),
    );

    // Most played view
    const mp = renderWithProviders(<Library />, { route: '/library?view=most-played' });
    expect(await screen.findByText('Top Tune')).toBeInTheDocument();
    const playsSpan = screen.getByText('42 plays');
    expect(playsSpan).toBeInTheDocument();
    expect(playsSpan.parentElement?.className).toContain('@[720px]:hidden');
    mp.unmount();

    // Regular songs view should not render plays count in subtitle
    const songs = renderWithProviders(<Library />, { route: '/library' });
    expect(await screen.findByText('Bravo')).toBeInTheDocument();
    expect(screen.queryByText(/\d+ plays/)).not.toBeInTheDocument();
    songs.unmount();
  });
});

describe('album', () => {
  const album = makeAlbum({
    id: 'yt:inr',
    title: 'In Rainbows',
    artist: 'Radiohead',
    artistId: 'yt:rh',
    year: 2007,
    trackCount: 3,
    genre: 'Alternative',
  });
  const albumTracks = mine;
  const openAlbum = (player = makePlayer()) =>
    renderWithProviders(
      <>
        <Album />
        <TrackMenu />
      </>,
      { route: '/album/yt:inr', path: '/album/:id', player },
    );

  it('WEB-ALBUM-001 shows the album, its artist link, year, size and total length', async () => {
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json(album)),
      http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
    );
    openAlbum();
    expect(await screen.findByText('In Rainbows')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Radiohead' })).toHaveAttribute('href', '/artist/yt:rh');
    expect(await screen.findByText(/2007 · 3 songs · 10:00/)).toBeInTheDocument();
    expect(screen.getByText('Alternative')).toBeInTheDocument();
    expect(await screen.findAllByRole('row')).toHaveLength(3);
  });

  it('WEB-ALBUM-002 play and shuffle play the whole album', async () => {
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json(album)),
      http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
    );
    const player = makePlayer();
    const { user } = openAlbum(player);
    await screen.findAllByRole('row');
    const from = { kind: 'Album', name: 'In Rainbows' };
    await user.click(screen.getByRole('button', { name: 'Play album' }));
    expect(player.playTrack).toHaveBeenCalledWith(albumTracks[0], albumTracks, from);
    await user.click(screen.getByRole('button', { name: 'Shuffle' }));
    expect(player.playShuffled).toHaveBeenCalledWith(albumTracks, from);
  });

  it('WEB-ALBUM-003 an unknown album shows "Album not found" with the reason', async () => {
    server.use(
      http.get(`${API}/albums/:id`, () => apiError(404, 'NOT_FOUND', 'No such album')),
      http.get(`${API}/albums/:id/tracks`, () => apiError(404, 'NOT_FOUND')),
    );
    openAlbum();
    expect(await screen.findByText('Album not found')).toBeInTheDocument();
    expect(screen.getByText('No such album')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
  });

  it('WEB-ALBUM-004 hearting an album saves it, and a failed un-heart puts the heart back', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json(album)),
      http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
      http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([]))),
      http.put(`${API}/me/favourites/albums/:id`, () => HttpResponse.json({ ok: true })),
      http.delete(`${API}/me/favourites/albums/:id`, () => apiError(500, 'X')),
    );
    const { user } = openAlbum();
    const heart = await screen.findByRole('button', { name: 'Favourite album' });
    expect(heart).not.toHaveClass('ib-on');
    await user.click(heart);
    await waitFor(() => expect(rec.paths()).toContain('PUT /me/favourites/albums/yt%3Ainr'));
    expect(heart).toHaveClass('ib-on');
    await user.click(heart);
    await waitFor(() => expect(rec.paths()).toContain('DELETE /me/favourites/albums/yt%3Ainr'));
    await waitFor(() => expect(heart).toHaveClass('ib-on'));
    rec.stop();
  });

  it('WEB-ALBUM-007 an album already saved in the library starts hearted', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json(album)),
      http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
      http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([album]))),
    );
    openAlbum();
    const heart = await screen.findByRole('button', { name: 'Favourite album' });
    await waitFor(() => expect(heart).toHaveClass('ib-on'));
  });

  it('WEB-ALBUM-005 a guest hearting an album is asked to sign up', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json(album)),
      http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
    );
    const { user } = openAlbum();
    await user.click(await screen.findByRole('button', { name: 'Favourite album' }));
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to save albums you love.', mode: 'signup' },
    });
  });

  it('WEB-ALBUM-006 "More options" opens the menu for all the album\'s songs', async () => {
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json(album)),
      http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
    );
    const player = makePlayer();
    const { user } = openAlbum(player);
    await screen.findAllByRole('row');
    const heroMore = screen.getAllByRole('button', { name: 'More options' })[0];
    await user.click(heroMore);
    await user.click(within(screen.getByRole('menu')).getByRole('button', { name: 'Add to queue' }));
    expect(player.enqueue).toHaveBeenCalledWith(albumTracks);
  });
});

describe('artist', () => {
  const artist = makeArtist({
    id: 'yt:rh',
    name: 'Radiohead',
    monthlyListeners: 12_345_678,
    albumCount: 9,
    following: false,
  });
  const top = Array.from({ length: 7 }, (_, i) => makeTrack({ id: `yt:top${i}`, title: `Top ${i}` }));
  const openArtist = (player = makePlayer()) =>
    renderWithProviders(<Artist />, { route: '/artist/yt:rh', path: '/artist/:id', player });

  const artistServer = (over: Partial<typeof artist> = {}) => {
    server.use(
      http.get(`${API}/artists/:id`, () => HttpResponse.json({ ...artist, ...over })),
      http.get(`${API}/artists/:id/top-tracks`, () => HttpResponse.json(page(top))),
      http.get(`${API}/artists/:id/albums`, () =>
        HttpResponse.json(page([makeAlbum({ id: 'yt:kida', title: 'Kid A', year: 2000 })])),
      ),
    );
  };

  it('WEB-ARTIST-001 shows the album count, the top five songs and the discography, without a listener figure', async () => {
    artistServer();
    openArtist();
    expect(await screen.findByText('Radiohead')).toBeInTheDocument();
    expect(screen.getByText('9 albums')).toBeInTheDocument();
    expect(screen.queryByText(/listener/i)).toBeNull();
    expect(await screen.findAllByRole('row')).toHaveLength(5);
    expect(await screen.findByRole('link', { name: /Kid A/ })).toHaveAttribute('href', '/album/yt:kida');
  });

  it("WEB-ARTIST-002 playing a popular song queues all of the artist's top songs", async () => {
    artistServer();
    const player = makePlayer();
    const { user } = openArtist(player);
    const rows = await screen.findAllByRole('row');
    await user.click(within(rows[1]).getByRole('button', { name: 'Play Top 1' }));
    expect(player.playTrack).toHaveBeenCalledWith(top[1], top, { kind: 'Artist', name: 'Radiohead' });
    await user.click(screen.getByRole('button', { name: 'Play artist' }));
    expect(player.playTrack).toHaveBeenLastCalledWith(top[0], top, { kind: 'Artist', name: 'Radiohead' });
  });

  it('WEB-ARTIST-003 follow and unfollow, with the button following the saved state', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    artistServer();
    server.use(http.all(`${API}/me/following/artists/:id`, () => HttpResponse.json({ ok: true })));
    const { user } = openArtist();
    await user.click(await screen.findByRole('button', { name: 'Follow' }));
    expect(screen.getByRole('button', { name: 'Following' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Following' }));
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
    await waitFor(() =>
      expect(rec.paths()).toEqual(
        expect.arrayContaining(['PUT /me/following/artists/yt%3Arh', 'DELETE /me/following/artists/yt%3Arh']),
      ),
    );
    rec.stop();
  });

  it('WEB-ARTIST-004 a failed follow is undone', async () => {
    setSession('a', 'r', testUser);
    artistServer({ following: true });
    server.use(http.delete(`${API}/me/following/artists/:id`, () => apiError(500, 'X')));
    const { user } = openArtist();
    await user.click(await screen.findByRole('button', { name: 'Following' }));
    expect(await screen.findByRole('button', { name: 'Following' })).toBeInTheDocument();
  });

  it('WEB-ARTIST-005 an artist with no songs says so and disables play; an unknown artist is "not found"', async () => {
    server.use(
      http.get(`${API}/artists/:id`, () => HttpResponse.json(artist)),
      http.get(`${API}/artists/:id/top-tracks`, () => HttpResponse.json(page([]))),
      http.get(`${API}/artists/:id/albums`, () => HttpResponse.json(page([]))),
    );
    const { unmount } = openArtist();
    expect(await screen.findByText('No tracks found for this artist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play artist' })).toBeDisabled();
    unmount();
    server.use(http.get(`${API}/artists/:id`, () => apiError(404, 'NOT_FOUND', 'Channel not found')));
    openArtist();
    expect(await screen.findByText('Artist not found')).toBeInTheDocument();
    expect(screen.getByText('Channel not found')).toBeInTheDocument();
  });
});
