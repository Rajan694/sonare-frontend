import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import Search from '../../src/screens/Search';
import Album from '../../src/screens/Album';
import PlaylistDetail from '../../src/screens/PlaylistDetail';
import { closeTrackMenu } from '../../src/components/music/TrackMenu';
import { clearSession, setSession } from '../../src/api/auth';
import { loadMoreSearch, runSearch, setQuery } from '../../src/store/searchSlice';
import { makeStore, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeAlbum, makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

useMockServer(
  http.get(`${API}/genres`, () => HttpResponse.json([{ id: 'g', name: 'Indie' }])),
  http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([]))),
);

afterEach(() => {
  act(() => closeTrackMenu());
  clearSession();
});

const first = [makeTrack({ id: 'yt:l1', title: 'One' }), makeTrack({ id: 'yt:l2', title: 'Two' })];
const second = [makeTrack({ id: 'yt:l3', title: 'Three' })];

describe('load more', () => {
  const searchServer = (opts: { nextCursor?: string; failMore?: boolean } = {}) =>
    http.get(`${API}/search`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('type') !== 'songs') return HttpResponse.json(page([]));
      if (url.searchParams.get('cursor'))
        return opts.failMore ? apiError(502, 'UPSTREAM_UNAVAILABLE', 'Piped down') : HttpResponse.json(page(second));
      return HttpResponse.json(page(first, opts.nextCursor));
    });

  const openSearch = () => {
    const store = makeStore();
    store.dispatch(setQuery('android'));
    return { store, ...renderWithProviders(<Search />, { store }) };
  };

  it('WEB-PAGE-001 Load more asks for the next page and appends it', async () => {
    const rec = recordRequests();
    server.use(searchServer({ nextCursor: 'c1' }));
    const { user } = openSearch();
    await screen.findByText('Top result');
    await user.click(screen.getByRole('button', { name: 'Songs' }));
    // The chip's branch replaces the All tab once the cross-fade finishes.
    await screen.findByText('TITLE');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    expect(screen.getByText('Three')).toBeInTheDocument();
    rec.stop();
    expect(rec.paths()).toContain('GET /search?q=android&type=songs&cursor=c1');
  });

  it('WEB-PAGE-002 no cursor from the server means no Load more', async () => {
    server.use(searchServer());
    const { user } = openSearch();
    await screen.findByText('Top result');
    await user.click(screen.getByRole('button', { name: 'Songs' }));
    await screen.findByText('TITLE');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('WEB-PAGE-003 a failed next page keeps the list and offers a retry', async () => {
    let failMore = true;
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('type') !== 'songs') return HttpResponse.json(page([]));
        if (url.searchParams.get('cursor'))
          return failMore ? apiError(502, 'UPSTREAM_UNAVAILABLE', 'Piped down') : HttpResponse.json(page(second));
        return HttpResponse.json(page(first, 'c1'));
      }),
    );
    const { user } = openSearch();
    await screen.findByText('Top result');
    await user.click(screen.getByRole('button', { name: 'Songs' }));
    await screen.findByText('TITLE');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    const retry = await screen.findByRole('button', { name: "Couldn't load more · Try again" });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    failMore = false;
    await user.click(retry);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
  });

  it('WEB-PAGE-004 a new query replaces the pages instead of adding to them', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('q') !== 'one')
          return HttpResponse.json(page([makeTrack({ id: 'yt:b', title: 'B' })]));
        return HttpResponse.json(
          url.searchParams.get('cursor')
            ? page([makeTrack({ id: 'yt:more', title: 'One more' })])
            : page([makeTrack({ id: 'yt:a', title: 'A' })], 'c1'),
        );
      }),
    );
    const store = makeStore();
    await store.dispatch(runSearch({ query: 'one', type: 'songs' }));
    await store.dispatch(loadMoreSearch({ query: 'one', type: 'songs' }));
    expect(store.getState().search.results.map((r) => r.id)).toEqual(['yt:a', 'yt:more']);
    await store.dispatch(runSearch({ query: 'two', type: 'songs' }));
    expect(store.getState().search.results.map((r) => r.id)).toEqual(['yt:b']);
    expect(store.getState().search.nextCursor).toBe(null);
  });

  it('WEB-PAGE-005 an album appends its next page of songs', async () => {
    const rec = recordRequests();
    server.use(
      http.get(`${API}/albums/:id`, () =>
        HttpResponse.json(makeAlbum({ id: 'yt:inr', title: 'In Rainbows', artistId: 'yt:rh' })),
      ),
      http.get(`${API}/albums/:id/tracks`, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('cursor') ? page(second) : page(first, 'c1')),
      ),
    );
    const { user } = renderWithProviders(<Album />, { route: '/album/yt:inr', path: '/album/:id' });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    rec.stop();
    expect(rec.paths()).toContain('GET /albums/yt%3Ainr/tracks?cursor=c1');
  });

  it('WEB-PAGE-006 a YouTube playlist appends its next page of songs', async () => {
    server.use(
      http.get(`${API}/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online', trackCount: 3 })),
      ),
      http.get(`${API}/playlists/:id/tracks`, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('cursor') ? page(second) : page(first, 'c1')),
      ),
    );
    const { user } = renderWithProviders(<PlaylistDetail />, { route: '/playlist/yt:PL1', path: '/playlist/:id' });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
  });

  it('WEB-PAGE-007 an own playlist comes whole, so it never offers Load more', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced' })),
      ),
      // A stray cursor is ignored: own playlists are fetched in full.
      http.get(`${API}/me/playlists/:id/tracks`, () => HttpResponse.json(page([...first, ...second], 'c1'))),
    );
    renderWithProviders(<PlaylistDetail />, { route: '/playlist/sonare:gym', path: '/playlist/:id' });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });
});
