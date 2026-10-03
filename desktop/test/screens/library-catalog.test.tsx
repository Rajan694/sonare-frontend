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
import { chooseOption } from '../helpers/dialogs';

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

const mine = [
  makeTrack({ id: 'yt:m1', title: 'Bravo', artist: 'Zed', durationMs: 300_000, album: 'Beta' }),
  makeTrack({ id: 'yt:m2', title: 'alpha', artist: 'Yan', durationMs: 100_000, album: 'Alpha' }),
  makeTrack({ id: 'yt:m3', title: 'Charlie', artist: 'Xu', durationMs: 200_000, album: 'Gamma' }),
];
const trending = [makeTrack({ id: 'yt:tr', title: 'Trending tune' })];

useMockServer(
  http.get(`${API}/trending`, () => HttpResponse.json(page(trending))),
  http.get(`${API}/genres`, () => HttpResponse.json([{ id: 'g', name: 'Indie' }])),
  http.get(`${API}/me/library/tracks`, () => HttpResponse.json(page(mine))),
  http.get(`${API}/me/favourites/tracks`, () =>
    HttpResponse.json(page([mine[0], mine[2]].map((t) => ({ ...t, favourite: true })))),
  ),
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
    expect(player.playTrack).toHaveBeenCalledWith(mine[0], mine);
  });

  it('WEB-LIBRARY-002 shuffle plays every saved song in some order', async () => {
    setSession('a', 'r', testUser);
    const player = makePlayer();
    const { user } = renderWithProviders(<Library />, { player });
    await screen.findByText('3 songs in your library');
    await user.click(screen.getByRole('button', { name: 'Shuffle' }));
    const [first, queue] = vi.mocked(player.playTrack).mock.calls[0];
    expect(queue!.map((t) => t.id).sort()).toEqual(['yt:m1', 'yt:m2', 'yt:m3']);
    expect(first).toBe(queue![0]);
  });

  it('WEB-LIBRARY-003 sorts by title (case-insensitive), then reverses on a second click; sorts by duration', async () => {
    setSession('a', 'r', testUser);
    const { user } = renderWithProviders(<Library />);
    await screen.findByText('3 songs in your library');
    await user.click(screen.getByRole('button', { name: 'Sort by Title' }));
    expect(titles()).toEqual(['alpha', 'Bravo', 'Charlie']);
    await user.click(screen.getByRole('button', { name: 'Sort by Title' }));
    expect(titles()).toEqual(['Charlie', 'Bravo', 'alpha']);
    await chooseOption(user, 'Sort order', 'Duration');
    expect(titles()).toEqual(['alpha', 'Charlie', 'Bravo']);
    expect(screen.getByRole('button', { name: 'Sort order' })).toHaveTextContent('Duration');
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
    expect(player.playTrack).toHaveBeenCalledWith(mine[2], mine);
  });

  it('WEB-LIBRARY-006 tabs are reflected in the address, and the address opens a tab', async () => {
    setSession('a', 'r', testUser);
    const { user, location } = renderWithProviders(<Library />, { route: '/library?view=albums' });
    expect(await screen.findByRole('link', { name: /OK Computer/ })).toHaveAttribute('href', '/album/yt:okc');
    await user.click(screen.getByRole('button', { name: 'Most played' }));
    expect(location()).toBe('/library?view=most-played');
    await waitFor(() => expect(titles()).toEqual(['Charlie']));
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

  it('WEB-LIBRARY-008 un-hearting a favourite removes it from the list at once', async () => {
    setSession('a', 'r', testUser);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.delete(`${API}/me/favourites/tracks/:id`, async () => {
        await gate;
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = renderWithProviders(<Library />, { route: '/library?view=favourites' });
    await waitFor(() => expect(titles()).toEqual(['Bravo', 'Charlie']));
    const row = screen.getAllByRole('row')[0];
    await user.click(within(row).getByRole('button', { name: 'Remove from favourites' }));
    expect(titles()).toEqual(['Charlie']);
    release();
  });

  it("WEB-LIBRARY-009 a guest's account-only tabs invite them to sign up; Songs still works", async () => {
    const { user } = renderWithProviders(<Library />, { route: '/library?view=favourites' });
    expect(screen.getByText('This lives in your account')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signin');
    await user.click(screen.getByRole('button', { name: 'Albums' }));
    expect(screen.getByText('This lives in your account')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Songs' }));
    // Nothing saved as a guest: the trending chart fills the page instead of an empty list.
    expect(await screen.findByRole('button', { name: 'Play Trending tune' })).toBeInTheDocument();
  });

  it('WEB-LIBRARY-010 genres link to a search for that genre', async () => {
    renderWithProviders(<Library />, { route: '/library?view=genres' });
    expect(await screen.findByRole('link', { name: 'Indie' })).toHaveAttribute('href', '/search?q=Indie');
    expect(screen.getByText('Browse music by genre')).toBeInTheDocument();
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

  it('WEB-LIBRARY-012 genres show the browse categories and search for their query', async () => {
    server.use(
      http.get(`${API}/genres`, () =>
        HttpResponse.json([
          { id: 'dev', name: 'Devotional', query: 'devotional bhajan songs' },
          { id: 'q', name: 'Qawwali' },
        ]),
      ),
    );
    renderWithProviders(<Library />, { route: '/library?view=genres' });
    expect(await screen.findByRole('link', { name: 'Devotional' })).toHaveAttribute(
      'href',
      '/search?q=devotional%20bhajan%20songs',
    );
    expect(screen.getByRole('link', { name: 'Qawwali' })).toHaveAttribute('href', '/search?q=Qawwali');
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
    await user.click(screen.getByRole('button', { name: 'Play album' }));
    expect(player.playTrack).toHaveBeenCalledWith(albumTracks[0], albumTracks);
    await user.click(screen.getByRole('button', { name: 'Shuffle' }));
    expect(vi.mocked(player.playTrack).mock.calls[1][1]).toHaveLength(3);
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

  function artistServer(over: Partial<typeof artist> = {}) {
    server.use(
      http.get(`${API}/artists/:id`, () => HttpResponse.json({ ...artist, ...over })),
      http.get(`${API}/artists/:id/top-tracks`, () => HttpResponse.json(page(top))),
      http.get(`${API}/artists/:id/albums`, () =>
        HttpResponse.json(page([makeAlbum({ id: 'yt:kida', title: 'Kid A', year: 2000 })])),
      ),
    );
  }

  it('WEB-ARTIST-001 shows listeners and albums, the top five songs and the discography', async () => {
    artistServer();
    openArtist();
    expect(await screen.findByText('Radiohead')).toBeInTheDocument();
    expect(screen.getByText(/12,345,678 monthly listeners · 9 albums/)).toBeInTheDocument();
    expect(await screen.findAllByRole('row')).toHaveLength(5);
    expect(await screen.findByRole('link', { name: /Kid A/ })).toHaveAttribute('href', '/album/yt:kida');
  });

  it("WEB-ARTIST-002 playing a popular song queues all of the artist's top songs", async () => {
    artistServer();
    const player = makePlayer();
    const { user } = openArtist(player);
    const rows = await screen.findAllByRole('row');
    await user.click(within(rows[1]).getByRole('button', { name: 'Play Top 1' }));
    expect(player.playTrack).toHaveBeenCalledWith(top[1], top);
    await user.click(screen.getByRole('button', { name: 'Play artist' }));
    expect(player.playTrack).toHaveBeenLastCalledWith(top[0], top);
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
