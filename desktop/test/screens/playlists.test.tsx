import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import Playlists from '../../src/screens/Playlists';
import PlaylistDetail from '../../src/screens/PlaylistDetail';
import TrackMenu, { closeTrackMenu } from '../../src/components/music/TrackMenu';
import { bindAccountGateNavigator } from '../../src/api/accountGate';
import { clearSession, setSession } from '../../src/api/auth';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeSavedPlaylist, makeTrack, page, testUser } from '../helpers/fixtures';
import { answerPrompt } from '../helpers/dialogs';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

useMockServer(
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/saved-playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/favourites/ids`, () => HttpResponse.json({ ids: [] })),
);

afterEach(() => {
  act(() => closeTrackMenu());
  clearSession();
  localStorage.clear();
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
    expect(screen.getByText('4 playlists in your collection')).toBeInTheDocument();
    expect(screen.queryByText('Create and sync playlists')).not.toBeInTheDocument();
  });

  it('WEB-PLAYLISTS-003 creating a playlist opens it; a failure is reported', async () => {
    setSession('a', 'r', testUser);
    let fail = false;
    server.use(
      http.post(`${API}/me/playlists`, async ({ request }) => {
        expect(await request.json()).toEqual({ name: 'Run club', kind: 'synced' });
        return fail ? apiError(500, 'X', 'Database down') : HttpResponse.json(makePlaylist({ id: 'sonare:run' }));
      }),
    );
    const { user, location } = renderWithProviders(<Playlists />);
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    await answerPrompt(user, 'Run club');
    await waitFor(() => expect(location()).toBe('/playlist/sonare:run'));
    fail = true;
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    await answerPrompt(user, 'Run club');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not create playlist', description: 'Database down' }),
      ),
    );
  });

  it('WEB-PLAYLISTS-004 in Offline Mode the stored own playlists are shown with device counts; no server call', async () => {
    // Seed the offline store: two sonare: playlists (one with songs on device, one without) +
    // a yt: playlist the filter must drop entirely.
    const stored = {
      userId: testUser.id,
      playlists: [
        makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced', trackCount: 5 }),
        makePlaylist({ id: 'sonare:chill', name: 'Chill', kind: 'synced', trackCount: 3 }),
        makePlaylist({ id: 'yt:PL123', name: 'YouTube', kind: 'online', trackCount: 10 }),
      ],
      songs: {
        'sonare:gym': { updatedAt: 1_700_000_000_000, songs: [] },
        'sonare:chill': { updatedAt: 1_700_000_000_000, songs: [] },
      },
    };
    localStorage.setItem('sonare_offline_playlists', JSON.stringify(stored));
    // Fire auth-change so the store re-reads from localStorage.
    act(() => setSession('a', 'r', testUser));
    renderWithProviders(<Playlists />, { mode: 'offline' });
    // Both sonare: playlists appear.
    expect(await screen.findByRole('link', { name: /Gym/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chill/ })).toBeInTheDocument();
    // The yt: playlist is filtered out.
    expect(screen.queryByRole('link', { name: /YouTube/ })).not.toBeInTheDocument();
    // Counter: 2 own + 1 Liked Songs.
    expect(screen.getByText('3 playlists available offline')).toBeInTheDocument();
    // No New playlist button in offline mode.
    expect(screen.queryByRole('button', { name: 'New playlist' })).not.toBeInTheDocument();
    // Playlists with no songs on device are shown dimmed.
    const gymLink = screen.getByRole('link', { name: /Gym/ });
    expect(gymLink).toHaveClass('opacity-60');
  });

  it('WEB-PLAYLISTS-005 Playlists screen pins Liked Songs first and Most played second (online user only)', async () => {
    // 1. Signed-in online user: both Liked Songs and Most played pinned first
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(page([makePlaylist({ id: 'sonare:p1', name: 'Chill' })])),
      ),
      http.get(`${API}/me/saved-playlists`, () => HttpResponse.json(page([]))),
    );
    const userView = renderWithProviders(<Playlists />);
    expect(await screen.findByRole('link', { name: /Liked Songs/ })).toHaveAttribute(
      'href',
      '/library?view=favourites',
    );
    const mostPlayedLink = screen.getByRole('link', { name: /Most played/ });
    expect(mostPlayedLink).toHaveAttribute('href', '/library?view=most-played');
    expect(within(mostPlayedLink).getByText('Your top tracks')).toBeInTheDocument();

    // Verify ordering: Liked Songs is 1st link in grid, Most played is 2nd
    const links = screen.getAllByRole('link', { name: /(Liked Songs|Most played|Chill)/ });
    expect(links.map((l) => within(l).getByText(/Liked Songs|Most played|Chill/).textContent)).toEqual([
      'Liked Songs',
      'Most played',
      'Chill',
    ]);
    userView.unmount();

    // 2. Guest user: Liked Songs pinned, but Most played hidden
    clearSession();
    const guest = renderWithProviders(<Playlists />);
    expect(await screen.findByRole('link', { name: /Liked Songs/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Most played/ })).not.toBeInTheDocument();
    guest.unmount();

    // 3. Offline mode: Most played hidden
    setSession('a', 'r', testUser);
    const offline = renderWithProviders(<Playlists />, { mode: 'offline' });
    expect(await screen.findByRole('link', { name: /Liked Songs/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Most played/ })).not.toBeInTheDocument();
    offline.unmount();
  });
});

describe('playlist page', () => {
  const songs = [
    makeTrack({ id: 'yt:p1', title: 'One', durationMs: 100_000 }),
    makeTrack({ id: 'yt:p2', title: 'Two', durationMs: 200_000 }),
    makeTrack({ id: 'yt:p3', title: 'Three', durationMs: 300_000 }),
  ];
  const titles = () => screen.getAllByRole('row').map((r) => within(r).getAllByRole('button')[0].textContent);

  const own = (tracks = songs) => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced' })),
      ),
      http.get(`${API}/me/playlists/:id/tracks`, () => HttpResponse.json(page(tracks))),
    );
  };
  const openPlaylist = (id = 'sonare:gym', player = makePlayer()) =>
    renderWithProviders(
      <>
        <PlaylistDetail />
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
    const from = { kind: 'Playlist', name: 'Gym' };
    await user.click(screen.getByRole('button', { name: 'Play playlist' }));
    expect(player.playTrack).toHaveBeenCalledWith(songs[0], songs, from);
    await user.click(screen.getByRole('button', { name: 'Shuffle' }));
    expect(player.playShuffled).toHaveBeenCalledWith(songs, from);
    await user.click(within(screen.getAllByRole('row')[2]).getByRole('button', { name: 'Play Three' }));
    expect(player.playTrack).toHaveBeenLastCalledWith(songs[2], songs, from);
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

  it('WEB-PLAYLIST-009 an own playlist is renamed from its menu; the page shows the new name, a failure says so', async () => {
    own();
    let name = 'Gym';
    const sent: unknown[] = [];
    let fail = false;
    server.use(
      http.get(`${API}/me/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'sonare:gym', name, kind: 'synced' })),
      ),
      http.patch(`${API}/me/playlists/:id`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        sent.push(body);
        if (fail) return apiError(500, 'X', 'Database down');
        name = body.name;
        return HttpResponse.json(makePlaylist({ id: 'sonare:gym', name, kind: 'synced' }));
      }),
    );
    const { user } = openPlaylist();
    expect(await screen.findByText('Gym', { selector: '.text-display-m' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(within(screen.getByRole('menu')).getByRole('button', { name: 'Rename playlist…' }));
    await answerPrompt(user, 'Leg day');
    await waitFor(() => expect(sent).toEqual([{ name: 'Leg day' }]));
    expect(await screen.findByText('Leg day', { selector: '.text-display-m' })).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Playlist renamed' }));

    fail = true;
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(within(screen.getByRole('menu')).getByRole('button', { name: 'Rename playlist…' }));
    await answerPrompt(user, 'Arms');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not rename playlist', description: 'Database down' }),
      ),
    );
    expect(screen.getByText('Leg day', { selector: '.text-display-m' })).toBeInTheDocument();
  });

  it('WEB-PLAYLIST-010 a YouTube playlist is saved to the library like an album; a guest is asked to sign in', async () => {
    const youtube = () =>
      server.use(
        http.get(`${API}/playlists/:id`, () =>
          HttpResponse.json(makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online', trackCount: 3 })),
        ),
        http.get(`${API}/playlists/:id/tracks`, () => HttpResponse.json(page(songs))),
      );
    youtube();
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const guest = openPlaylist('yt:PL1');
    await guest.user.click(await screen.findByRole('button', { name: 'Save to your library' }));
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to save playlists you love.', mode: 'signup' },
    });
    guest.unmount();

    setSession('a', 'r', testUser);
    youtube();
    let saved: unknown;
    server.use(
      http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([]))),
      http.put(`${API}/me/favourites/albums/:id`, async ({ request, params }) => {
        saved = { id: params.id, ...((await request.json()) as object) };
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = openPlaylist('yt:PL1');
    await user.click(await screen.findByRole('button', { name: 'Save to your library' }));
    await waitFor(() =>
      expect(saved).toEqual({
        id: 'yt:PL1',
        meta: expect.objectContaining({ title: 'Hits', trackCount: 3 }),
      }),
    );
    expect(screen.getByRole('button', { name: 'Remove from your library' })).toBeInTheDocument();
  });

  it('WEB-PLAYLIST-011 saved YouTube playlists appear in Saved from YouTube section on Playlists screen', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(page([makePlaylist({ id: 'sonare:1', name: 'Own Playlist' })])),
      ),
      http.get(`${API}/me/saved-playlists`, () =>
        HttpResponse.json(
          page([
            makeSavedPlaylist({
              id: 'yt:PL999',
              name: 'Lo-Fi Beats',
              owner: 'Lofi Girl',
              trackCount: 50,
              thumbnail: 'https://example.com/thumb.jpg',
            }),
          ]),
        ),
      ),
    );
    renderWithProviders(<Playlists />);
    expect(await screen.findByRole('link', { name: /Own Playlist/ })).toBeInTheDocument();
    expect(screen.getByText('Saved from YouTube')).toBeInTheDocument();
    const savedLink = screen.getByRole('link', { name: /Lo-Fi Beats/ });
    expect(savedLink).toHaveAttribute('href', '/playlist/yt:PL999');
    expect(within(savedLink).getByText('Lofi Girl · 50 songs')).toBeInTheDocument();
    expect(within(savedLink).getByText('YOUTUBE')).toBeInTheDocument();
    expect(screen.getByText(/4 playlists in your collection/)).toBeInTheDocument();
  });

  it('WEB-PLAYLIST-012 PlaylistDetail reads saved state from saved playlists, unsaves via DELETE, and fires playlists-changed', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/playlists/:id`, () =>
        HttpResponse.json(makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online', trackCount: 3 })),
      ),
      http.get(`${API}/playlists/:id/tracks`, () => HttpResponse.json(page(songs))),
      http.get(`${API}/me/saved-playlists`, () =>
        HttpResponse.json(
          page([makeSavedPlaylist({ id: 'yt:PL1', name: 'Hits', owner: 'Test Channel', trackCount: 3 })]),
        ),
      ),
    );
    let deletedId: string | undefined;
    server.use(
      http.delete(`${API}/me/favourites/albums/:id`, async ({ params }) => {
        deletedId = String(params.id);
        return HttpResponse.json({ ok: true });
      }),
    );
    const changedListener = vi.fn();
    window.addEventListener('sonare:playlists-changed', changedListener);
    try {
      const { user } = openPlaylist('yt:PL1');
      const removeBtn = await screen.findByRole('button', { name: 'Remove from your library' });
      expect(removeBtn).toBeInTheDocument();
      await user.click(removeBtn);
      await waitFor(() => expect(deletedId).toBe('yt:PL1'));
      expect(changedListener).toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Removed from your library', description: 'Hits' }),
      );
      expect(await screen.findByRole('button', { name: 'Save to your library' })).toBeInTheDocument();
    } finally {
      window.removeEventListener('sonare:playlists-changed', changedListener);
    }
  });
});
