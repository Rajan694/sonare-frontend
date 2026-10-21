import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Home from '../../src/screens/Home';
import Search from '../../src/screens/Search';
import { clearSession, setSession } from '../../src/api/auth';
import { setQuery } from '../../src/store/searchSlice';
import { makePlayer, makeStore, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeAlbum, makeArtist, makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

const trending = Array.from({ length: 12 }, (_, i) =>
  makeTrack({ id: `yt:tr${i}`, title: `Hit ${i}`, artist: `Singer ${i}`, albumId: i === 0 ? 'yt:alb0' : null }),
);

useMockServer(
  http.get(`${API}/trending`, () => HttpResponse.json(page(trending))),
  http.get(`${API}/genres`, () =>
    HttpResponse.json([
      { id: 'g1', name: 'Sufi', query: 'sufi songs' },
      { id: 'g2', name: 'Qawwali' },
    ]),
  ),
  http.get(`${API}/me/not-played-lately`, () => HttpResponse.json(page([]))),
);

afterEach(() => {
  clearSession();
  toast.mockClear();
});

describe('home', () => {
  it('WEB-HOME-001 a guest gets trending tiles and cards', async () => {
    const player = makePlayer();
    const { user } = renderWithProviders(<Home />, { player });
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText("You're listening as a guest")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signin');
    // No history: the first six songs are quick tiles, the shelf picks up from the seventh.
    expect(await screen.findAllByRole('button', { name: 'Play Hit 0' })).toHaveLength(1);
    expect(await screen.findByRole('button', { name: 'Play Hit 6' })).toBeInTheDocument();
    expect(screen.getByText('Trending locally this week')).toBeInTheDocument();
    // "Most played" is a signed-in table; a guest gets no table at all.
    expect(screen.queryByText('Most played')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play trending' }));
    expect(player.playTrack).toHaveBeenCalledWith(trending[0], trending);
  });

  it('WEB-HOME-002 a signed-in user is greeted by name and gets their recent plays as tiles, without duplicates', async () => {
    setSession('a', 'r', testUser);
    const again = makeTrack({ id: 'yt:again', title: 'On repeat' });
    const rec = recordRequests();
    server.use(
      http.get(`${API}/me/recently-played`, () =>
        HttpResponse.json(page([again, makeTrack({ title: 'Once' }), again])),
      ),
    );
    renderWithProviders(<Home />);
    expect(screen.getByText('Welcome back, Test Listener')).toBeInTheDocument();
    expect(screen.queryByText("You're listening as a guest")).not.toBeInTheDocument();
    // A repeat is stored once: one tile. With six or fewer plays the tiles hold them all, so
    // there is no "Recently played" shelf repeating them.
    expect(await screen.findByRole('button', { name: 'Play On repeat' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Play On repeat' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Play Once' })).toBeInTheDocument();
    expect(screen.queryByText('Recently played')).not.toBeInTheDocument();
    rec.stop();
    expect(rec.paths()).toContain('GET /me/recently-played?limit=10');
  });

  it('WEB-HOME-003 when the music service is down it explains why and can retry', async () => {
    let down = true;
    server.use(
      http.get(`${API}/trending`, () =>
        down ? apiError(502, 'UPSTREAM_UNAVAILABLE', 'x') : HttpResponse.json(page(trending)),
      ),
    );
    const { user } = renderWithProviders(<Home />);
    expect(await screen.findByText('Could not load trending')).toBeInTheDocument();
    expect(screen.getByText("Sonare's music service isn't responding. Try again in a moment.")).toBeInTheDocument();
    down = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByText('Hit 3')).not.toHaveLength(0);
    expect(screen.queryByText('Could not load trending')).not.toBeInTheDocument();
  });

  it('WEB-HOME-007 a signed-in user whose recently played fails to load is told so and can retry', async () => {
    setSession('a', 'r', testUser);
    let failing = true;
    server.use(
      http.get(`${API}/me/recently-played`, () =>
        failing
          ? apiError(502, 'UPSTREAM_UNAVAILABLE', 'x')
          : HttpResponse.json(page([makeTrack({ id: 'yt:back', title: 'Back again' })])),
      ),
    );
    const { user } = renderWithProviders(<Home />);
    expect(await screen.findByText('Could not load recently played')).toBeInTheDocument();
    expect(screen.getByText('Recently played')).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByRole('button', { name: 'Play Back again' })).not.toHaveLength(0);
    expect(screen.queryByText('Could not load recently played')).not.toBeInTheDocument();
  });

  it('WEB-HOME-004 with a song loaded the header button pauses or resumes it', async () => {
    const player = makePlayer({ queue: [trending[1]], index: 0, isPlaying: true });
    const { user } = renderWithProviders(<Home />, { player });
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(player.togglePlay).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Play trending' })).not.toBeInTheDocument();
  });

  it('WEB-HOME-005 a trending shelf card plays within the trending list', async () => {
    const player = makePlayer();
    const { user } = renderWithProviders(<Home />, { player });
    // The seventh song is past the six tiles, so it is a shelf card and nothing else.
    const card = await screen.findByRole('button', { name: 'Play Hit 6' });
    await user.click(card);
    expect(player.playTrack).toHaveBeenLastCalledWith(trending[6], trending);
  });

  it('WEB-HOME-006 "See all" shows the full trending shelf', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/recently-played`, () =>
        HttpResponse.json(page([makeTrack({ id: 'yt:back', title: 'Back again' })])),
      ),
    );
    const { user } = renderWithProviders(<Home />);
    // Tiles come from the play history, so the whole chart is in the shelf (capped at 10).
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Play Hit/ })).toHaveLength(10));
    await user.click(screen.getByRole('button', { name: /See all/ }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Play Hit/ })).toHaveLength(12));
    expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument();
  });

  it("WEB-HOME-009 shows 'Haven't played in a while' shelf and plays with the shelf as queue", async () => {
    setSession('a', 'r', testUser);
    const unplayed = [
      makeTrack({ id: 'yt:un1', title: 'Old Gold', artist: 'Classic' }),
      makeTrack({ id: 'yt:un2', title: 'Vintage Vibe', artist: 'Retro' }),
    ];
    server.use(
      http.get(`${API}/me/not-played-lately`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('limit')).toBe('20');
        return HttpResponse.json(page(unplayed));
      }),
    );
    const player = makePlayer();
    const { user } = renderWithProviders(<Home />, { player });
    expect(await screen.findByText("Haven't played in a while")).toBeInTheDocument();
    expect(screen.getByText('Old Gold')).toBeInTheDocument();
    expect(screen.getByText('Vintage Vibe')).toBeInTheDocument();

    const playBtn = screen.getByRole('button', { name: 'Play Old Gold' });
    await user.click(playBtn);
    expect(player.playTrack).toHaveBeenCalledWith(unplayed[0], unplayed);
  });

  it("WEB-HOME-010 'Haven't played in a while' shelf is hidden when empty, on error, for guests, or offline", async () => {
    // 1. As guest
    const { unmount } = renderWithProviders(<Home />);
    expect(screen.queryByText("Haven't played in a while")).not.toBeInTheDocument();
    unmount();

    // 2. Signed in, but empty list
    setSession('a', 'r', testUser);
    server.use(http.get(`${API}/me/not-played-lately`, () => HttpResponse.json(page([]))));
    const { unmount: unmount2 } = renderWithProviders(<Home />);
    await waitFor(() => expect(screen.getByText('Welcome back, Test Listener')).toBeInTheDocument());
    expect(screen.queryByText("Haven't played in a while")).not.toBeInTheDocument();
    unmount2();

    // 3. Signed in, but server error
    server.use(http.get(`${API}/me/not-played-lately`, () => apiError(500, 'SERVER_ERROR')));
    const { unmount: unmount3 } = renderWithProviders(<Home />);
    await waitFor(() => expect(screen.getByText('Welcome back, Test Listener')).toBeInTheDocument());
    expect(screen.queryByText("Haven't played in a while")).not.toBeInTheDocument();
    unmount3();

    // 4. Signed in with data, but offline mode
    server.use(
      http.get(`${API}/me/not-played-lately`, () => HttpResponse.json(page([makeTrack({ title: 'Old Song' })]))),
    );
    renderWithProviders(<Home />, { mode: 'offline' });
    expect(screen.queryByText("Haven't played in a while")).not.toBeInTheDocument();
  });

  it("WEB-HOME-011 phone layout renders 'Haven't played in a while' shelf and plays with the shelf as queue", async () => {
    setSession('a', 'r', testUser);
    const unplayed = [makeTrack({ id: 'yt:un1', title: 'Phone Old Gold', artist: 'Classic' })];
    server.use(http.get(`${API}/me/not-played-lately`, () => HttpResponse.json(page(unplayed))));
    const oldWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    window.dispatchEvent(new Event('resize'));

    try {
      const player = makePlayer();
      const { user } = renderWithProviders(<Home />, { player });
      expect(await screen.findByText("Haven't played in a while")).toBeInTheDocument();
      expect(screen.getByText('Phone Old Gold')).toBeInTheDocument();

      const playBtn = screen.getByRole('button', { name: 'Play Phone Old Gold' });
      await user.click(playBtn);
      expect(player.playTrack).toHaveBeenCalledWith(unplayed[0], unplayed);
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: oldWidth, configurable: true });
      window.dispatchEvent(new Event('resize'));
    }
  });
});

describe('search', () => {
  const search = (query = '', route = '/search', player = makePlayer()) => {
    const store = makeStore();
    if (query) store.dispatch(setQuery(query));
    return { ...renderWithProviders(<Search />, { route, store, player }), store };
  };
  const results = [
    makeTrack({ id: 'yt:s1', title: 'Paranoid Android', artist: 'Radiohead', album: 'OK Computer' }),
    makeTrack({ id: 'yt:s2', title: 'Android Dreams', artist: 'Someone' }),
  ];

  it('WEB-SEARCH-001 without a query it offers genres from the server, and a genre searches for its query', async () => {
    const rec = recordRequests();
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page(results))));
    const { user, store } = search();
    // Until the server answers, the built-in categories show.
    expect(screen.getByRole('button', { name: 'Devotional' })).toBeInTheDocument();
    // A category searches for its query (or its name when it has none).
    await user.click(await screen.findByRole('button', { name: 'Sufi' }));
    expect(store.getState().search.query).toBe('sufi songs');
    await waitFor(() => expect(rec.paths()).toContain('GET /search?q=sufi+songs&type=songs'));
    rec.stop();
  });

  it('WEB-SEARCH-010 a category without a query searches for its name', async () => {
    const { user, store } = search();
    await user.click(await screen.findByRole('button', { name: 'Qawwali' }));
    expect(store.getState().search.query).toBe('Qawwali');
  });

  it('WEB-SEARCH-002 shows a top result and songs, with a result count', async () => {
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page(results))));
    search('android');
    expect(await screen.findByText('Top result')).toBeInTheDocument();
    expect(screen.getByText('Song · Radiohead · OK Computer')).toBeInTheDocument();
    expect(screen.getByText('Server + device · 2 results')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    // Track-shaped hits never masquerade as a second kind, so those sections stay away.
    expect(screen.queryByText('Artists', { selector: '.text-overline' })).not.toBeInTheDocument();
  });

  it('WEB-SEARCH-003 the top result plays within the results', async () => {
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page(results))));
    const player = makePlayer();
    const { user } = search('android', '/search', player);
    const card = (await screen.findByText('Top result')).parentElement!;
    await user.click(within(card).getByRole('button', { name: 'Play Paranoid Android' }));
    expect(player.playTrack).toHaveBeenCalledWith(results[0], results, { kind: 'Search', name: '“android”' });
  });

  it('WEB-SEARCH-004 the chips search albums, artists and playlists and link to them', async () => {
    const rec = recordRequests();
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'albums') return HttpResponse.json(page([makeAlbum({ id: 'yt:okc', title: 'OK Computer' })]));
        if (type === 'artists') return HttpResponse.json(page([makeArtist({ id: 'yt:rh', name: 'Radiohead' })]));
        if (type === 'playlists')
          return HttpResponse.json(page([makePlaylist({ id: 'yt:PL1', name: '90s Alt', kind: 'online' })]));
        return HttpResponse.json(page(results));
      }),
    );
    const { user, store } = search('radiohead');
    await screen.findByText('Top result');
    await user.click(screen.getByRole('button', { name: 'Albums' }));
    expect(store.getState().search.type).toBe('albums');
    expect(await screen.findByRole('link', { name: /OK Computer/ })).toHaveAttribute('href', '/album/yt:okc');
    await user.click(screen.getByRole('button', { name: 'Artists' }));
    expect(await screen.findByRole('link', { name: /Radiohead/ })).toHaveAttribute('href', '/artist/yt:rh');
    await user.click(screen.getByRole('button', { name: 'Playlists' }));
    expect(await screen.findByRole('link', { name: /90s Alt/ })).toHaveAttribute('href', '/playlist/yt:PL1');
    rec.stop();
    expect(rec.paths()).toEqual(
      expect.arrayContaining([
        'GET /search?q=radiohead&type=albums',
        'GET /search?q=radiohead&type=artists',
        'GET /search?q=radiohead&type=playlists',
      ]),
    );
  });

  it('WEB-SEARCH-005 says when nothing matches', async () => {
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page([]))));
    search('zzqx');
    expect(await screen.findByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('No results found matching "zzqx"')).toBeInTheDocument();
  });

  it('WEB-SEARCH-006 a failed search shows the error and can be retried', async () => {
    let fail = true;
    server.use(
      http.get(`${API}/search`, () =>
        fail ? apiError(502, 'UPSTREAM_UNAVAILABLE', 'Piped is down') : HttpResponse.json(page(results)),
      ),
    );
    const { user } = search('android');
    expect(await screen.findByText('Search error: Piped is down')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Top result')).toBeInTheDocument();
  });

  it('WEB-SEARCH-007 a shared ?q= link fills the search box and is removed from the address', async () => {
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page(results))));
    const { store, location } = search('', '/search?q=karma');
    await waitFor(() => expect(store.getState().search.query).toBe('karma'));
    expect(location()).toBe('/search');
  });

  it('WEB-SEARCH-008 add-songs mode adds a result to the playlist and counts it', async () => {
    setSession('a', 'r', testUser);
    const added: unknown[] = [];
    server.use(
      http.get(`${API}/search`, () => HttpResponse.json(page(results))),
      http.get(`${API}/me/playlists/:id`, () => HttpResponse.json(makePlaylist({ id: 'sonare:gym', name: 'Gym' }))),
      http.post(`${API}/me/playlists/:id/tracks`, async ({ request }) => {
        added.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = search('android', '/search?addTo=sonare:gym');
    expect(await screen.findByText('Adding to Gym')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Add Paranoid Android to playlist' }));
    expect(screen.getByRole('button', { name: 'Paranoid Android added' })).toBeDisabled();
    expect(screen.getByText('1 added — search for more')).toBeInTheDocument();
    await waitFor(() =>
      expect(added).toEqual([
        { trackIds: ['yt:s1'], metas: { 'yt:s1': expect.objectContaining({ title: 'Paranoid Android' }) } },
      ]),
    );
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/playlist/sonare:gym');
  });

  it('WEB-SEARCH-009 a song that could not be added is un-ticked with a message', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/search`, () => HttpResponse.json(page(results))),
      http.get(`${API}/me/playlists/:id`, () => HttpResponse.json(makePlaylist({ name: 'Gym' }))),
      http.post(`${API}/me/playlists/:id/tracks`, () => apiError(500, 'X')),
    );
    const { user } = search('android', '/search?addTo=sonare:gym');
    await user.click(await screen.findByRole('button', { name: 'Add Paranoid Android to playlist' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not add to playlist', description: 'Paranoid Android' }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Add Paranoid Android to playlist' })).toBeEnabled();
  });

  it('WEB-SEARCH-011 the All tab shows artists from their own search, with a picture and page', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'artists')
          return HttpResponse.json(
            page([
              makeArtist({ id: 'yt:UCarijit', name: 'Arijit Singh' }),
              makeArtist({ id: 'yt:UCdiljit', name: 'Diljit Dosanjh' }),
            ]),
          );
        return HttpResponse.json(page(results));
      }),
    );
    search('tum');
    const arijit = await screen.findByRole('link', { name: /Arijit Singh/ });
    expect(arijit).toHaveAttribute('href', '/artist/yt:UCarijit');
    expect(within(arijit).getByRole('img', { name: 'Arijit Singh' }).getAttribute('src')).toContain(
      '/api/v1/artists/yt:UCarijit/artwork',
    );
    expect(await screen.findByRole('link', { name: /Diljit Dosanjh/ })).toHaveAttribute('href', '/artist/yt:UCdiljit');
    // The section offers the full list.
    expect(screen.getByRole('button', { name: 'See all artists' })).toBeInTheDocument();
  });
});
