import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import Search from '../../src/screens/Search';
import TrackMenu from '../../src/components/music/TrackMenu';
import AppShell from '../../src/components/layout/AppShell';
import { clearSession, setSession } from '../../src/api/auth';
import { setQuery } from '../../src/store/searchSlice';
import { makePlayer, makeStore, renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeAlbum, makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', async () => {
  const actual = await vi.importActual<typeof import('../../src/store/toasts')>('../../src/store/toasts');
  return {
    ...actual,
    showToast: toast,
  };
});

vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

const albumFixture = makeAlbum({
  id: 'yt:album-1',
  title: 'Test Album',
  artist: 'Test Artist',
  trackCount: 2,
});

const playlistFixture = makePlaylist({
  id: 'yt:playlist-1',
  name: 'Test Playlist',
  kind: 'online',
  trackCount: 3,
});

const albumTracks = [
  makeTrack({ id: 'yt:alb-tr-1', title: 'Album Song 1', artist: 'Test Artist' }),
  makeTrack({ id: 'yt:alb-tr-2', title: 'Album Song 2', artist: 'Test Artist' }),
];

const playlistTracks = [
  makeTrack({ id: 'yt:pl-tr-1', title: 'Playlist Song 1' }),
  makeTrack({ id: 'yt:pl-tr-2', title: 'Playlist Song 2' }),
];

useMockServer(
  http.get(`${API}/genres`, () => HttpResponse.json([])),
  http.get(`${API}/me/favourites/ids`, () => HttpResponse.json({ ids: [] })),
  http.get(`${API}/me/favourites/albums`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/saved-playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/albums/:id/tracks`, () => HttpResponse.json(page(albumTracks))),
  http.get(`${API}/playlists/:id/tracks`, () => HttpResponse.json(page(playlistTracks))),
  http.put(`${API}/me/favourites/albums/:id`, () => HttpResponse.json({ ok: true })),
  http.delete(`${API}/me/favourites/albums/:id`, () => HttpResponse.json({ ok: true })),
);

afterEach(() => {
  clearSession();
  toast.mockClear();
});

const renderSearchWithMenu = (query: string, player = makePlayer()) => {
  const store = makeStore();
  store.dispatch(setQuery(query));
  const rendered = renderWithProviders(
    <>
      <Search />
      <TrackMenu />
    </>,
    { store, player },
  );
  return { ...rendered, player, store };
};

describe('search collection cards menu (Phase D4)', () => {
  it('WEB-COLMENU-001 album and playlist results have a ⋯ button that opens Add to queue, Add to playlist… and Save', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'albums') return HttpResponse.json(page([albumFixture]));
        if (type === 'playlists') return HttpResponse.json(page([playlistFixture]));
        return HttpResponse.json(page([]));
      }),
    );

    const { user } = renderSearchWithMenu('rock');

    expect(await screen.findAllByText('Test Album')).not.toHaveLength(0);
    expect(await screen.findAllByText('Test Playlist')).not.toHaveLength(0);

    const albumMoreButtons = await screen.findAllByRole('button', { name: 'More options for Test Album' });
    expect(albumMoreButtons[0]).toBeInTheDocument();

    await user.click(albumMoreButtons[0]);
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to playlist…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to library' })).toBeInTheDocument();
  });

  it('WEB-COLMENU-002 Add to queue fetches the album songs on demand and enqueues them', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'albums') return HttpResponse.json(page([albumFixture]));
        return HttpResponse.json(page([]));
      }),
    );

    const player = makePlayer();
    const { user } = renderSearchWithMenu('rock', player);

    expect(await screen.findAllByText('Test Album')).not.toHaveLength(0);
    const albumMoreButtons = await screen.findAllByRole('button', { name: 'More options for Test Album' });
    await user.click(albumMoreButtons[0]);

    const addToQueueBtn = await screen.findByRole('button', { name: 'Add to queue' });
    await user.click(addToQueueBtn);

    await waitFor(() => {
      expect(player.enqueue).toHaveBeenCalledWith(albumTracks);
    });
  });

  it('WEB-COLMENU-003 Save to library calls the API and flips to Remove from library, and back', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'albums') return HttpResponse.json(page([albumFixture]));
        return HttpResponse.json(page([]));
      }),
    );

    const { user } = renderSearchWithMenu('rock');

    expect(await screen.findAllByText('Test Album')).not.toHaveLength(0);
    const albumMoreButtons = await screen.findAllByRole('button', { name: 'More options for Test Album' });
    await user.click(albumMoreButtons[0]);

    const saveBtn = await screen.findByRole('button', { name: 'Save to library' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove from library' })).toBeInTheDocument();
      expect(rec.paths()).toContain('PUT /me/favourites/albums/yt%3Aalbum-1');
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Saved to your library',
        description: 'Test Album',
      }),
    );

    // Clicking Remove from library flips it back and sends DELETE
    const removeBtn = screen.getByRole('button', { name: 'Remove from library' });
    await user.click(removeBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save to library' })).toBeInTheDocument();
      expect(rec.paths()).toContain('DELETE /me/favourites/albums/yt%3Aalbum-1');
    });
  });

  it('WEB-COLMENU-004 Add to playlist… fetches the songs and adds them to the picked playlist', async () => {
    setSession('a', 'r', testUser);
    const myPl = makePlaylist({ id: 'sonare:my1', name: 'My Own Playlist', kind: 'own' });
    server.use(
      http.get(`${API}/me/playlists`, () => HttpResponse.json(page([myPl]))),
      http.post(`${API}/me/playlists/:id/tracks`, () => HttpResponse.json({ ok: true })),
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'playlists') return HttpResponse.json(page([playlistFixture]));
        return HttpResponse.json(page([]));
      }),
    );

    const { user } = renderSearchWithMenu('chill');

    expect(await screen.findAllByText('Test Playlist')).not.toHaveLength(0);
    const plMoreButtons = await screen.findAllByRole('button', { name: 'More options for Test Playlist' });
    await user.click(plMoreButtons[0]);

    const addToPlBtn = await screen.findByRole('button', { name: 'Add to playlist…' });
    await user.click(addToPlBtn);

    // Picker opens showing own playlists
    expect(await screen.findByText('My Own Playlist')).toBeInTheDocument();
    await user.click(screen.getByText('My Own Playlist'));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Added to My Own Playlist',
        }),
      );
    });
  });

  it('WEB-COLMENU-005 a failed fetch shows a toast and queues nothing', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'albums') return HttpResponse.json(page([albumFixture]));
        return HttpResponse.json(page([]));
      }),
      http.get(`${API}/albums/:id/tracks`, () => new HttpResponse(null, { status: 500 })),
    );

    const { user } = renderSearchWithMenu('rock');

    expect(await screen.findAllByText('Test Album')).not.toHaveLength(0);
    const albumMoreButtons = await screen.findAllByRole('button', { name: 'More options for Test Album' });
    await user.click(albumMoreButtons[0]);

    const addToQueueBtn = await screen.findByRole('button', { name: 'Add to queue' });
    await user.click(addToQueueBtn);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not load tracks',
          description: 'Test Album',
        }),
      );
    });
  });

  it('WEB-COLMENU-006 at phone width the toasts sit above the mini player and bottom tabs', () => {
    const width = window.innerWidth;
    window.innerWidth = 400;
    try {
      renderWithProviders(<AppShell />);
      expect(screen.getByRole('status')).toHaveClass('bottom-[136px]');
    } finally {
      window.innerWidth = width;
    }
  });

  it('WEB-COLMENU-007 a playlist with several pages queues every song, not just the first page', async () => {
    const more = [makeTrack({ id: 'yt:pl-tr-3', title: 'Playlist Song 3' })];
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'playlists') return HttpResponse.json(page([playlistFixture]));
        return HttpResponse.json(page([]));
      }),
      http.get(`${API}/playlists/:id/tracks`, ({ request }) =>
        new URL(request.url).searchParams.get('cursor') === 'p2'
          ? HttpResponse.json(page(more))
          : HttpResponse.json(page(playlistTracks, 'p2')),
      ),
    );
    const player = makePlayer();
    const { user } = renderSearchWithMenu('chill', player);

    await user.click((await screen.findAllByRole('button', { name: 'More options for Test Playlist' }))[0]);
    await user.click(await screen.findByRole('button', { name: 'Add to queue' }));

    await waitFor(() => expect(player.enqueue).toHaveBeenCalledWith([...playlistTracks, ...more]));
  });

  it("WEB-COLMENU-008 a song's menu doesn't fetch the saved albums or playlists; an album's does", async () => {
    // Signed in: the saved lists are account-only, so a guest never asks for them anyway.
    setSession('a', 'r', testUser);
    const song = makeTrack({ id: 'yt:song-1', title: 'Lone Song' });
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        if (type === 'albums') return HttpResponse.json(page([albumFixture]));
        if (type === 'songs') return HttpResponse.json(page([song]));
        return HttpResponse.json(page([]));
      }),
    );
    const { user } = renderSearchWithMenu('rock');
    expect(await screen.findAllByText('Lone Song')).not.toHaveLength(0);
    const savedLists = (rec: ReturnType<typeof recordRequests>) =>
      rec.paths().filter((p) => p.startsWith('GET /me/library/albums') || p.startsWith('GET /me/saved-playlists'));

    const rec = recordRequests();
    await user.click((await screen.findAllByRole('button', { name: 'More options for Lone Song' }))[0]);
    expect(await screen.findByRole('button', { name: 'Add to queue' })).toBeInTheDocument();
    expect(savedLists(rec)).toEqual([]);

    await user.keyboard('{Escape}');
    await user.click((await screen.findAllByRole('button', { name: 'More options for Test Album' }))[0]);
    await waitFor(() => expect(savedLists(rec).length).toBeGreaterThan(0));
    rec.stop();
  });
});
