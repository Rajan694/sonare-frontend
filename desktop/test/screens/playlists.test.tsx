import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import Playlists from '../../src/screens/Playlists';
import Playlist from '../../src/screens/Playlist';
import TrackMenu, { closeTrackMenu } from '../../src/components/music/TrackMenu';
import { bindAccountGateNavigator } from '../../src/data/accountGate';
import { clearSession, setSession } from '../../src/data/auth';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toastStore', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/data/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

useMockServer(http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))));

afterEach(() => {
  act(() => closeTrackMenu());
  clearSession();
  toast.mockClear();
  vi.restoreAllMocks();
});

describe('playlists page', () => {
  it('WEB-PLAYLISTS-001 a guest sees Liked Songs, an invitation, and is asked to sign up to create one', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const { user } = renderWithProviders(<Playlists />);
    expect(screen.getByText('1 playlist in your collection')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Liked Songs/ })).toHaveAttribute('href', '/library?view=favourites');
    expect(screen.getByText('Create and sync playlists')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to make playlists.', mode: 'signup' },
    });
  });

  it("WEB-PLAYLISTS-002 lists the user's playlists with size and where they live", async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(
          page([
            makePlaylist({ id: 'sonare:a', name: 'Gym', kind: 'synced', trackCount: 12 }),
            makePlaylist({ id: 'yt:PL', name: 'Chart', kind: 'online', trackCount: null }),
          ]),
        ),
      ),
    );
    renderWithProviders(<Playlists />);
    const gym = await screen.findByRole('link', { name: /Gym/ });
    expect(gym).toHaveAttribute('href', '/playlist/sonare:a');
    expect(within(gym).getByText('12 songs')).toBeInTheDocument();
    expect(within(gym).getByText('SYNCED')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Chart/ })).getByText('ONLINE')).toBeInTheDocument();
    expect(screen.getByText('3 playlists in your collection')).toBeInTheDocument();
    expect(screen.queryByText('Create and sync playlists')).not.toBeInTheDocument();
  });

  it('WEB-PLAYLISTS-003 creating a playlist opens it; a failure is reported', async () => {
    setSession('a', 'r', testUser);
    vi.spyOn(window, 'prompt').mockReturnValue('Run club');
    let fail = false;
    server.use(
      http.post(`${API}/me/playlists`, async ({ request }) => {
        expect(await request.json()).toEqual({ name: 'Run club', kind: 'synced' });
        return fail ? apiError(500, 'X', 'Database down') : HttpResponse.json(makePlaylist({ id: 'sonare:run' }));
      }),
    );
    const { user, location } = renderWithProviders(<Playlists />);
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    await waitFor(() => expect(location()).toBe('/playlist/sonare:run'));
    fail = true;
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not create playlist', description: 'Database down' }),
      ),
    );
  });

  it('WEB-PLAYLISTS-004 in Offline Mode only playlists available on the device are shown', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(
          page([
            makePlaylist({ name: 'Downloaded', kind: 'synced', downloadedCount: 3 }),
            makePlaylist({ name: 'Cloud only', kind: 'online', downloadedCount: 0 }),
            makePlaylist({ name: 'Local mix', kind: 'local' }),
          ]),
        ),
      ),
    );
    renderWithProviders(<Playlists />, { mode: 'offline' });
    expect(await screen.findByRole('link', { name: /Downloaded/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Local mix/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Cloud only/ })).not.toBeInTheDocument();
    expect(screen.getByText('3 playlists available offline')).toBeInTheDocument();
  });
});

describe('playlist page', () => {
  const songs = [
    makeTrack({ id: 'yt:p1', title: 'One', durationMs: 100_000 }),
    makeTrack({ id: 'yt:p2', title: 'Two', durationMs: 200_000 }),
    makeTrack({ id: 'yt:p3', title: 'Three', durationMs: 300_000 }),
  ];
  const titles = () => screen.getAllByRole('row').map((r) => within(r).getAllByRole('button')[0].textContent);

  function own(tracks = songs) {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced' })),
      ),
      http.get(`${API}/me/playlists/:id/tracks`, () => HttpResponse.json(page(tracks))),
    );
  }
  const openPlaylist = (id = 'sonare:gym', player = makePlayer()) =>
    renderWithProviders(
      <>
        <Playlist />
        <TrackMenu />
      </>,
      { route: `/playlist/${id}`, path: '/playlist/:id', player },
    );

  it('WEB-PLAYLIST-001 the user\'s own playlist shows "Made by you", its length, and an Add songs link', async () => {
    own();
    const { user, location } = openPlaylist();
    expect(await screen.findByText('Made by you · 3 songs · 10:00')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add songs' }));
    expect(location()).toBe('/search?addTo=sonare%3Agym');
  });

  it('WEB-PLAYLIST-002 a public playlist cannot be edited', async () => {
    server.use(
      http.get(`${API}/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online' })),
      ),
      http.get(`${API}/playlists/:id/tracks`, () => HttpResponse.json(page(songs))),
    );
    openPlaylist('yt:PL1');
    expect(await screen.findByText('Curated playlist · 3 songs · 10:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add songs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
    expect(document.querySelector('[draggable="true"]')).toBeNull();
  });

  it('WEB-PLAYLIST-003 play and shuffle play the playlist', async () => {
    own();
    const player = makePlayer();
    const { user } = openPlaylist('sonare:gym', player);
    await screen.findAllByRole('row');
    await user.click(screen.getByRole('button', { name: 'Play playlist' }));
    expect(player.playTrack).toHaveBeenCalledWith(songs[0], songs);
    await user.click(within(screen.getAllByRole('row')[2]).getByRole('button', { name: 'Play Three' }));
    expect(player.playTrack).toHaveBeenLastCalledWith(songs[2], songs);
  });

  it('WEB-PLAYLIST-004 removing a song takes it out at once and tells the server its position', async () => {
    own();
    let body: unknown;
    server.use(
      http.delete(`${API}/me/playlists/:id/tracks`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = openPlaylist();
    await screen.findAllByRole('row');
    await user.click(screen.getByRole('button', { name: 'Remove Two' }));
    expect(titles()).toEqual(['One', 'Three']);
    await waitFor(() => expect(body).toEqual({ index: 1 }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Removed from playlist', description: 'Two' }));
  });

  it('WEB-PLAYLIST-005 a failed removal puts the song back and says so', async () => {
    own();
    server.use(http.delete(`${API}/me/playlists/:id/tracks`, () => apiError(500, 'X')));
    const { user } = openPlaylist();
    await screen.findAllByRole('row');
    await user.click(screen.getByRole('button', { name: 'Remove Two' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not remove song' })),
    );
    await waitFor(() => expect(titles()).toEqual(['One', 'Two', 'Three']));
  });

  it('WEB-PLAYLIST-006 dragging reorders at once and saves the move; a failed save restores the order', async () => {
    own();
    const moves: unknown[] = [];
    let fail = false;
    server.use(
      http.patch(`${API}/me/playlists/:id/tracks/order`, async ({ request }) => {
        moves.push(await request.json());
        return fail ? apiError(500, 'X') : HttpResponse.json({ ok: true });
      }),
    );
    openPlaylist();
    await screen.findAllByRole('row');
    const drag = (from: number, to: number) => {
      const handles = document.querySelectorAll('[draggable="true"]');
      const dataTransfer = { effectAllowed: '' };
      fireEvent.dragStart(handles[from], { dataTransfer });
      fireEvent.dragOver(handles[to], { dataTransfer });
      fireEvent.drop(handles[to], { dataTransfer });
    };
    drag(0, 2);
    expect(titles()).toEqual(['Two', 'Three', 'One']);
    await waitFor(() => expect(moves).toEqual([{ from: 0, to: 2 }]));

    fail = true;
    drag(0, 1);
    expect(titles()).toEqual(['Three', 'Two', 'One']);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not reorder songs' })),
    );
    // Back to what the server has.
    await waitFor(() => expect(titles()).toEqual(['One', 'Two', 'Three']));
  });

  it('WEB-PLAYLIST-007 an empty playlist says so, cannot play, but can still be deleted from its menu', async () => {
    own([]);
    const { user } = openPlaylist();
    expect(await screen.findByText('Empty playlist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play playlist' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(within(screen.getByRole('menu')).getByRole('button', { name: 'Delete playlist' })).toBeInTheDocument();
  });

  it('WEB-PLAYLIST-008 someone else\'s own-playlist link shows "Playlist not found" to a guest', async () => {
    openPlaylist('sonare:someone');
    expect(await screen.findByText('Playlist not found')).toBeInTheDocument();
  });
});
