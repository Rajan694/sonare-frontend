import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Artwork, { resolveArtworkUrl, trackArtwork } from '../../src/components/music/Artwork';
import EqualizerBars from '../../src/components/music/EqualizerBars';
import { GenreCard, genreVariant } from '../../src/components/music/GenreCard';
import SongRow, { SongTableHeader } from '../../src/components/music/SongRow';
import TrackMenu, { closeTrackMenu, openPlaylistMenu, openTrackMenu } from '../../src/components/music/TrackMenu';
import TrackDownloadButton from '../../src/components/music/TrackDownloadButton';
import DownloadButton from '../../src/components/music/DownloadButton';
import Waveform from '../../src/components/music/Waveform';
import { bindAccountGateNavigator, takePendingAction } from '../../src/api/accountGate';
import { clearSession, setSession } from '../../src/api/auth';
import type { DownloadItem } from '../../src/storage/downloads';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';
import { answerConfirm, answerPrompt } from '../helpers/dialogs';

/** A download store the test controls: each state is set directly. */
const dl = vi.hoisted(() => {
  const items = new Map<string, Partial<DownloadItem>>();
  const listeners = new Set<() => void>();
  let snapshot = { byId: new Map(items), items: [] as unknown[], ready: true, activeCount: 0 };
  const emit = () => {
    snapshot = { ...snapshot, byId: new Map(items) };
    listeners.forEach((l) => l());
  };
  return {
    items,
    set(id: string, item: Partial<DownloadItem> | null) {
      if (item) items.set(id, { id, totalBytes: 0, receivedBytes: 0, ...item });
      else items.delete(id);
      emit();
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    snap: () => snapshot,
    api: {
      enqueue: vi.fn(async (tracks: { id: string }[]) => tracks.length),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      remove: vi.fn(async () => ({ fileDeleted: true })),
      removeMany: vi.fn(async () => 0),
    },
    toast: vi.fn(),
  };
});

vi.mock('../../src/storage/downloads', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    downloads: dl.api,
    useDownloads: () => useSyncExternalStore(dl.subscribe, dl.snap),
    useDownload: (id: string) => useSyncExternalStore(dl.subscribe, () => dl.snap().byId.get(id)),
    downloadProgress: (i: DownloadItem) => (i.totalBytes > 0 ? Math.min(1, i.receivedBytes / i.totalBytes) : null),
  };
});
vi.mock('../../src/store/toasts', () => ({ showToast: dl.toast, dismissToast: () => {}, useToasts: () => [] }));

useMockServer();

beforeEach(() => {
  dl.items.clear();
  dl.set('__reset__', null);
});
afterEach(() => {
  act(() => closeTrackMenu());
  clearSession();
  vi.restoreAllMocks();
});

const track = makeTrack({
  id: 'yt:reck',
  title: 'Reckoner',
  artist: 'Radiohead',
  album: 'In Rainbows',
  albumId: 'yt:inr',
  artistId: 'yt:rh',
  durationMs: 290_000,
});

describe('artwork', () => {
  it('WEB-MUSIC-001 resolves server artwork on the API origin at a size that fits', () => {
    expect(resolveArtworkUrl('/api/v1/tracks/yt:1/artwork', 44)).toBe(
      'http://api.sonare.test/api/v1/tracks/yt:1/artwork?size=64',
    );
    expect(resolveArtworkUrl('/api/v1/albums/a/artwork?x=1', 200)).toBe(
      'http://api.sonare.test/api/v1/albums/a/artwork?x=1&size=300',
    );
    expect(resolveArtworkUrl('https://img.example/a.jpg', 640)).toBe('https://img.example/a.jpg');
    expect(resolveArtworkUrl(null)).toBeUndefined();
    expect(trackArtwork({ id: 'yt:1', source: 'server' }, 300)).toBe('/api/v1/tracks/yt:1/artwork?size=300');
    expect(trackArtwork({ id: 'local:1', source: 'local' })).toBeUndefined();
    expect(trackArtwork({ id: 'yt:1', source: 'server', thumbnail: 'https://t/x.jpg' })).toBe('https://t/x.jpg');
  });

  it('WEB-MUSIC-002 shows the image once loaded and falls back to the gradient when it fails', () => {
    const { container, rerender } = render(<Artwork src="/api/v1/tracks/yt:1/artwork" alt="Reckoner" size={140} />);
    const img = screen.getByRole('img', { name: 'Reckoner' });
    expect(img).toHaveClass('opacity-0');
    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
    fireEvent.error(img);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<Artwork alt="" />);
    expect(container.querySelector('span.art')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('small pieces', () => {
  it('WEB-MUSIC-003 the equalizer bars say whether audio is playing', () => {
    const { rerender } = render(<EqualizerBars playing />);
    expect(screen.getByLabelText('Now playing')).toBeInTheDocument();
    rerender(<EqualizerBars playing={false} />);
    expect(screen.getByLabelText('Paused')).toBeInTheDocument();
  });

  it('WEB-MUSIC-004 a genre card links to its page, or acts as a button, with a cycling colour', async () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <GenreCard name="Jazz" variant="a3" to="/search?genre=jazz" />
        <GenreCard name="Folk" variant="a4" onClick={onClick} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Jazz' })).toHaveAttribute('href', '/search?genre=jazz');
    fireEvent.click(screen.getByRole('button', { name: 'Folk' }));
    expect(onClick).toHaveBeenCalled();
    expect([0, 11, 12].map(genreVariant)).toEqual(['a1', 'a12', 'a1']);
  });
});

describe('song row', () => {
  const row = (props: Partial<React.ComponentProps<typeof SongRow>> = {}, player = makePlayer()) =>
    renderWithProviders(
      <>
        <SongRow track={track} index={3} {...props} />
        <TrackMenu />
      </>,
      { player },
    );

  it('WEB-MUSIC-005 shows title, artist, album, duration and where it plays from', () => {
    row();
    expect(screen.getByRole('button', { name: 'Play Reckoner' })).toHaveTextContent('Reckoner');
    expect(screen.getByText('Radiohead')).toBeInTheDocument();
    expect(screen.getAllByText('In Rainbows').length).toBeGreaterThan(0);
    expect(screen.getByText('4:50')).toBeInTheDocument();
    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('WEB-MUSIC-006 clicking the title or double-clicking the row plays it', () => {
    const onClick = vi.fn();
    row({ onClick });
    fireEvent.click(screen.getByRole('button', { name: 'Play Reckoner' }));
    fireEvent.doubleClick(screen.getByRole('row'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('WEB-MUSIC-007 the current song is marked, and its bars follow play/pause', () => {
    row({ isActive: true }, makePlayer({ isPlaying: true }));
    expect(screen.getByRole('row')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Now playing')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-008 the heart saves a favourite without playing the song', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    const onClick = vi.fn();
    const { user } = row({ onClick });
    await user.click(screen.getByRole('button', { name: 'Add to favourites' }));
    expect(screen.getByRole('button', { name: 'Remove from favourites' })).toBeInTheDocument();
    await waitFor(() => expect(rec.paths()).toEqual(['PUT /me/favourites/tracks/yt%3Areck']));
    rec.stop();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('WEB-MUSIC-009 shows download progress, then "On device" once saved locally', () => {
    dl.set('yt:reck', { status: 'downloading', totalBytes: 1000, receivedBytes: 420 });
    row();
    expect(screen.getByText('42%')).toBeInTheDocument();
    act(() => dl.set('yt:reck', null));
    expect(screen.getByText('Server')).toBeInTheDocument();
    renderWithProviders(<SongRow track={makeTrack({ id: 'local:x', source: 'local' })} index={1} />);
    expect(screen.getByText('On device')).toBeInTheDocument();
  });

  it('WEB-MUSIC-010 remove and add-to-playlist buttons act without playing the song', async () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    const onAdd = vi.fn();
    const { user, rerender } = row({ onClick, onRemove, onAdd });
    await user.click(screen.getByRole('button', { name: 'Remove Reckoner' }));
    await user.click(screen.getByRole('button', { name: 'Add Reckoner to playlist' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<SongRow track={track} index={3} onAdd={onAdd} added />);
    expect(screen.getByRole('button', { name: 'Reckoner added' })).toBeDisabled();
  });

  it('WEB-MUSIC-031 the table shows your play count, and the artist where a song has no album', () => {
    renderWithProviders(
      <>
        <SongTableHeader />
        <SongRow track={{ ...track, playCount: 1234 }} index={1} />
        <SongRow
          track={makeTrack({ id: 'yt:single', title: 'Single', artist: 'Arijit Singh', album: null })}
          index={2}
        />
      </>,
    );
    expect(screen.getByText('PLAYS')).toBeInTheDocument();
    const [withAlbum, withoutAlbum] = screen.getAllByRole('row');
    expect(within(withAlbum).getByLabelText('1234 plays')).toHaveTextContent('1,234');
    expect(within(withAlbum).getAllByText('In Rainbows').length).toBeGreaterThan(0);
    // No dash: the artist stands in for the missing album.
    expect(within(withoutAlbum).queryByText('—')).not.toBeInTheDocument();
    expect(within(withoutAlbum).getAllByText('Arijit Singh')).toHaveLength(2);
    expect(within(withoutAlbum).getByLabelText('0 plays')).toHaveTextContent('0');
  });
});

/** What a right-click hands to openTrackMenu. */
const rightClick = () =>
  ({
    preventDefault() {},
    stopPropagation() {},
    type: 'contextmenu',
    clientX: 1,
    clientY: 1,
  }) as unknown as React.MouseEvent;

describe('track menu', () => {
  const open = (
    opts: {
      tracks?: (typeof track)[];
      player?: ReturnType<typeof makePlayer>;
      route?: string;
      mode?: 'online' | 'offline';
    } = {},
  ) => {
    const utils = renderWithProviders(
      <>
        {(opts.tracks ?? [track]).map((t, i) => (
          <SongRow key={t.id} track={t} index={i + 1} />
        ))}
        <TrackMenu />
      </>,
      { player: opts.player, route: opts.route, mode: opts.mode },
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    return { ...utils, menu: () => screen.getByRole('menu') };
  };

  it('WEB-MUSIC-011 play next and add to queue go to the player and close the menu', async () => {
    const player = makePlayer();
    const { user, menu } = open({ player });
    await user.click(within(menu()).getByRole('button', { name: 'Play next' }));
    expect(player.playNext).toHaveBeenCalledWith(track);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByRole('row'), { clientX: 10, clientY: 10 });
    await user.click(within(menu()).getByRole('button', { name: 'Add to queue' }));
    expect(player.enqueue).toHaveBeenCalledWith([track]);
  });

  it('WEB-MUSIC-012 go to album and go to artist open those pages', async () => {
    const { user, menu, location } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Go to album' }));
    expect(location()).toBe('/album/yt:inr');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(within(menu()).getByRole('button', { name: 'Go to artist' }));
    expect(location()).toBe('/artist/yt:rh');
  });

  it('WEB-MUSIC-013 a signed-in user adds the song to one of their playlists', async () => {
    setSession('a', 'r', testUser);
    let added: unknown;
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(page([makePlaylist({ id: 'sonare:road', name: 'Road trip' })])),
      ),
      http.post(`${API}/me/playlists/:id/tracks`, async ({ request, params }) => {
        added = { id: params.id, body: await request.json() };
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user, menu } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Add to playlist…' }));
    await user.click(await within(menu()).findByRole('button', { name: 'Road trip' }));
    await waitFor(() =>
      expect(dl.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Added to Road trip', description: 'Reckoner' }),
      ),
    );
    expect(added).toEqual({ id: 'sonare:road', body: { trackIds: ['yt:reck'] } });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-014 "New playlist…" creates a synced playlist named by the user and adds the song', async () => {
    setSession('a', 'r', testUser);
    const calls: string[] = [];
    server.use(
      http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
      http.post(`${API}/me/playlists`, async ({ request }) => {
        calls.push(JSON.stringify(await request.json()));
        return HttpResponse.json(makePlaylist({ id: 'sonare:new', name: 'Late nights' }));
      }),
      http.post(`${API}/me/playlists/:id/tracks`, ({ params }) => {
        calls.push(`add ${params.id}`);
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user, menu } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Add to playlist…' }));
    await user.click(within(menu()).getByRole('button', { name: 'New playlist…' }));
    // The app's dialog opens with the song's title as the suggested name.
    expect(await screen.findByDisplayValue('Reckoner')).toBeInTheDocument();
    await answerPrompt(user, '  Late nights  ');
    await waitFor(() => expect(calls).toEqual(['{"name":"Late nights","kind":"synced"}', 'add sonare:new']));
  });

  it('WEB-MUSIC-015 cancelling the new-playlist prompt creates nothing', async () => {
    setSession('a', 'r', testUser);
    server.use(http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))));
    const rec = recordRequests();
    const { user, menu } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Add to playlist…' }));
    await user.click(within(menu()).getByRole('button', { name: 'New playlist…' }));
    await answerPrompt(user, '');
    rec.stop();
    expect(rec.paths().filter((p) => p.startsWith('POST'))).toEqual([]);
  });

  it('WEB-MUSIC-016 a guest choosing "Add to playlist" is asked to create an account', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const { user, menu } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Add to playlist…' }));
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to make playlists.', mode: 'signup' },
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-017 offers Download, Pause or Delete depending on the download state, and hides Download offline', async () => {
    const { user, menu, unmount } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Download' }));
    expect(dl.api.enqueue).toHaveBeenCalledWith([track]);

    act(() => dl.set('yt:reck', { status: 'downloading' }));
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(within(menu()).getByRole('button', { name: 'Pause download' }));
    expect(dl.api.pause).toHaveBeenCalledWith('yt:reck');

    act(() => dl.set('yt:reck', { status: 'paused' }));
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(within(menu()).getByRole('button', { name: 'Resume download' }));
    expect(dl.api.resume).toHaveBeenCalledWith('yt:reck');

    act(() => dl.set('yt:reck', { status: 'done' }));
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(within(menu()).getByRole('button', { name: 'Delete download' }));
    expect(dl.api.remove).toHaveBeenCalledWith('yt:reck');
    unmount();

    act(() => dl.set('yt:reck', null));
    open({ mode: 'offline' });
    expect(within(screen.getByRole('menu')).queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-018 for several songs, only list actions are offered', () => {
    const other = makeTrack({ albumId: 'yt:x', artistId: 'yt:y' });
    renderWithProviders(<TrackMenu />);
    act(() => openTrackMenu([track, other], rightClick()));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('button', { name: 'Add to queue' })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'Play next' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'Go to album' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-019 Escape and a click outside close the menu', () => {
    open();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-020 deleting a playlist from its own page asks first, deletes it and leaves the page', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    server.use(
      http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
      http.delete(`${API}/me/playlists/:id`, () => HttpResponse.json({ ok: true })),
    );
    const { user, location } = renderWithProviders(<TrackMenu />, { route: '/playlist/sonare:p9' });
    const e = rightClick();
    act(() => openPlaylistMenu({ id: 'sonare:p9', name: 'Gym' }, e));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('button', { name: 'Delete playlist' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete playlist?' })).toHaveTextContent(
      '"Gym" is deleted from your account. This can\'t be undone.',
    );
    await answerConfirm(user, false);
    expect(rec.paths().filter((p) => p.startsWith('DELETE'))).toEqual([]);

    act(() => openPlaylistMenu({ id: 'sonare:p9', name: 'Gym' }, e));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('button', { name: 'Delete playlist' }));
    await answerConfirm(user, true);
    await waitFor(() => expect(location()).toBe('/playlist'));
    rec.stop();
    expect(rec.paths()).toContain('DELETE /me/playlists/sonare%3Ap9');
    expect(dl.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Playlist deleted', description: 'Gym' }));
  });

  it('WEB-MUSIC-032 a guest who signs in from "Add to playlist" gets the playlist picker for that song', async () => {
    bindAccountGateNavigator(vi.fn());
    server.use(http.get(`${API}/me/playlists`, () => HttpResponse.json(page([makePlaylist({ name: 'Gym' })]))));
    const { user, menu } = open();
    await user.click(within(menu()).getByRole('button', { name: 'Add to playlist…' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    setSession('a', 'r', testUser);
    act(() => void takePendingAction()?.());
    const dialog = await screen.findByRole('dialog', { name: 'Add to playlist' });
    expect(dialog).toHaveTextContent('Reckoner');
    expect(await within(dialog).findByRole('button', { name: /Gym/ })).toBeInTheDocument();
  });
});

describe('download controls', () => {
  it('WEB-MUSIC-021 a song walks Download → progress (click pauses) → resume → downloaded (confirm deletes)', async () => {
    const { user } = renderWithProviders(<TrackDownloadButton track={track} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(dl.api.enqueue).toHaveBeenCalledWith([track]);
    expect(dl.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Added to downloads', description: 'Reckoner' }),
    );

    act(() => dl.set('yt:reck', { status: 'downloading', totalBytes: 200, receivedBytes: 80 }));
    await user.click(screen.getByRole('button', { name: 'Downloading 40% - pause' }));
    expect(dl.api.pause).toHaveBeenCalledWith('yt:reck');

    act(() => dl.set('yt:reck', { status: 'failed' }));
    await user.click(screen.getByRole('button', { name: 'Download failed - retry' }));
    expect(dl.api.resume).toHaveBeenCalledWith('yt:reck');

    act(() => dl.set('yt:reck', { status: 'done' }));
    await user.click(screen.getByRole('button', { name: 'Downloaded - delete download' }));
    expect(await answerConfirm(user, false)).toBe('Delete download?');
    expect(dl.api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Downloaded - delete download' }));
    await answerConfirm(user, true);
    await waitFor(() => expect(dl.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download deleted' })));
  });

  it('WEB-MUSIC-022 explains when a deleted download could only be removed from the list', async () => {
    dl.set('yt:reck', { status: 'done' });
    dl.api.remove.mockResolvedValueOnce({
      fileDeleted: false,
      reason: 'The file is no longer where it was downloaded',
    } as never);
    const { user } = renderWithProviders(<TrackDownloadButton track={track} />);
    await user.click(screen.getByRole('button', { name: 'Downloaded - delete download' }));
    await answerConfirm(user, true);
    await waitFor(() =>
      expect(dl.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Removed from downloads',
          description: 'The file is no longer where it was downloaded',
        }),
      ),
    );
  });

  it('WEB-MUSIC-023 nothing to download for local files, or offline without a download', () => {
    const { container } = renderWithProviders(<TrackDownloadButton track={makeTrack({ source: 'local' })} />);
    expect(container.querySelector('button')).toBeNull();
    renderWithProviders(<TrackDownloadButton track={track} />, { mode: 'offline' });
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('WEB-MUSIC-024 downloading an album queues its server songs and says how many', async () => {
    const tracks = [track, makeTrack({ id: 'yt:t2' }), makeTrack({ id: 'local:z', source: 'local' })];
    const { user } = renderWithProviders(<DownloadButton tracks={tracks} offline={false} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(dl.api.enqueue).toHaveBeenCalledWith([tracks[0], tracks[1]]);
    expect(dl.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Added to downloads', description: '2 songs' }),
    );
  });

  it('WEB-MUSIC-025 shows the remaining count, the running progress, and "Downloaded" when all are saved', async () => {
    const tracks = [makeTrack({ id: 'yt:1' }), makeTrack({ id: 'yt:2' }), makeTrack({ id: 'yt:3' })];
    dl.set('yt:1', { status: 'done' });
    const { user } = renderWithProviders(<DownloadButton tracks={tracks} offline={false} />);
    expect(screen.getByRole('button', { name: 'Download 2 more' })).toBeInTheDocument();

    act(() => dl.set('yt:2', { status: 'downloading' }));
    expect(screen.getByRole('link', { name: /Downloading 1\/3/ })).toHaveAttribute('href', '/downloads');

    act(() => {
      dl.set('yt:2', { status: 'done' });
      dl.set('yt:3', { status: 'done' });
    });
    dl.api.removeMany.mockResolvedValueOnce(1);
    await user.click(screen.getByRole('button', { name: 'Downloaded' }));
    expect(await answerConfirm(user, true)).toBe('Delete 3 downloaded songs?');
    expect(dl.api.removeMany).toHaveBeenCalledWith(['yt:1', 'yt:2', 'yt:3']);
    await waitFor(() => expect(dl.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Downloads removed' })));
  });

  it('WEB-MUSIC-026 hidden offline with nothing downloaded, and for lists of only local files', () => {
    const { container } = renderWithProviders(<DownloadButton tracks={[track]} offline />);
    expect(container.querySelector('button')).toBeNull();
    renderWithProviders(<DownloadButton tracks={[makeTrack({ source: 'local' })]} offline={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('waveform', () => {
  const rect = { left: 0, width: 400, top: 0, height: 40, right: 400, bottom: 40, x: 0, y: 0, toJSON: () => ({}) };

  it('WEB-MUSIC-027 marks played bars up to the playhead and reports the position', () => {
    render(<Waveform peaks={[1, 2, 3, 4]} barCount={10} positionRatio={0.35} durationMs={200_000} onSeek={() => {}} />);
    const w = screen.getByRole('slider', { name: 'Seek' });
    expect(w).toHaveAttribute('aria-valuenow', '70');
    expect(w).toHaveAttribute('aria-valuetext', '1:10');
    expect(w.querySelectorAll('i.on')).toHaveLength(3);
    expect(w.querySelectorAll('i.hd')).toHaveLength(1);
  });

  it('WEB-MUSIC-028 arrow keys jump 5 seconds, within the track', () => {
    const onSeek = vi.fn();
    const { rerender } = render(<Waveform positionRatio={0.5} durationMs={100_000} onSeek={onSeek} />);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
    rerender(<Waveform positionRatio={0.99} durationMs={100_000} onSeek={onSeek} />);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onSeek.mock.calls.map((c) => c[0])).toEqual([0.55, 0.45, 1]);
  });

  it('WEB-MUSIC-029 scrubbing previews the time and seeks once on release', () => {
    const onSeek = vi.fn();
    render(<Waveform durationMs={200_000} onSeek={onSeek} />);
    const w = screen.getByRole('slider');
    w.getBoundingClientRect = () => rect as DOMRect;
    fireEvent.pointerDown(w, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(w, { clientX: 200, pointerId: 1 });
    expect(screen.getByText('1:40')).toBeInTheDocument();
    expect(onSeek).not.toHaveBeenCalled();
    fireEvent.pointerUp(w, { clientX: 300, pointerId: 1 });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(0.75);
  });

  it('WEB-MUSIC-030 without a seek handler it is a picture, not a control', () => {
    const { container } = render(<Waveform peaks={[0.2, 0.9]} barCount={4} />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(container.querySelectorAll('i')).toHaveLength(4);
  });
});
