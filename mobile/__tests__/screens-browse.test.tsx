import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/Home';
import { SearchScreen } from '../src/screens/Search';
import { LibraryScreen } from '../src/screens/Library';
import { PlaylistsScreen } from '../src/screens/Playlists';
import { PlaylistDetailScreen } from '../src/screens/PlaylistDetail';
import { AlbumScreen } from '../src/screens/Album';
import { ArtistScreen } from '../src/screens/Artist';
import { api, ApiError } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { navigationRef } from '../src/data/accountGate';
import { alice, makeAlbum, makeArtist, makeDownload, makePlaylist, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const guest = () => useAuthStore.setState({ status: 'guest', user: null } as never);

/** Stub an api method for this test. */
function stub<K extends keyof typeof api>(name: K, impl: (...args: any[]) => any) {
  return jest.spyOn(api, name).mockImplementation(impl as never);
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  useModeStore.setState({ mode: 'online' });
  guest();
  usePlayerStore.setState({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
    shuffle: false,
  });
  useDownloadsStore.setState({ items: {} });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  stub('trending', async () => page([]));
});

describe('Home', () => {
  const recent = [makeTrack({ title: 'Recent A' }), makeTrack({ title: 'Recent B' })];

  it('MOB-HOME-001 a signed-in user is welcomed by first name and can pick up their last song', async () => {
    signIn();
    stub('recentlyPlayed', async () =>
      page([recent[0], makeTrack({ id: 'local:x', source: 'local', title: 'Other phone' }), recent[1], recent[0]]),
    );
    stub('favourites', async () => page([]));
    const playTrack = jest.spyOn(usePlayerStore.getState(), 'playTrack');
    const { findByLabelText, getByText, queryByText } = render(<HomeScreen />);
    expect(getByText('Welcome back, Alice')).toBeTruthy();
    fireEvent.press(await findByLabelText('Continue listening to Recent A'));
    // Only this account's server songs, without repeats, make up the queue.
    expect(playTrack).toHaveBeenCalledWith(recent[0], recent);
    expect(queryByText('Other phone')).toBeNull();
  });

  it('MOB-HOME-002 with a song loaded, the continue card pauses and resumes it', async () => {
    signIn();
    const now = makeTrack({ title: 'Now playing' });
    usePlayerStore.setState({
      currentTrack: now,
      isPlaying: true,
      positionMs: 65_000,
      durationMs: 200_000,
    });
    stub('recentlyPlayed', async () => page([]));
    stub('favourites', async () => page([]));
    const { getByLabelText, getByText } = render(<HomeScreen />);
    expect(getByText('1:05')).toBeTruthy();
    fireEvent.press(getByLabelText('Continue listening to Now playing'));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('MOB-HOME-003 a guest is invited to sign in and no account data is requested', async () => {
    const recentSpy = stub('recentlyPlayed', async () => page([]));
    const favSpy = stub('favourites', async () => page([]));
    const { getByText, getByLabelText } = render(<HomeScreen />);
    expect(getByText('Welcome to Sonare')).toBeTruthy();
    expect(getByText("You're listening as a guest")).toBeTruthy();
    fireEvent.press(getByLabelText('Sign in'));
    expect(nav.navigate).toHaveBeenCalledWith('SignIn', { mode: 'signin' });
    expect(recentSpy).not.toHaveBeenCalled();
    expect(favSpy).not.toHaveBeenCalled();
  });

  it('MOB-HOME-004 trending plays within the chart; when the music service is down it says so and retries', async () => {
    const chart = [makeTrack({ title: 'Hit One' }), makeTrack({ title: 'Hit Two' })];
    let down = true;
    stub('trending', async () => {
      if (down)
        throw Object.assign(new ApiError('down', 502), {
          code: 'UPSTREAM_UNAVAILABLE',
        });
      return page(chart);
    });
    const { findByText, getByText, findByLabelText } = render(<HomeScreen />);
    expect(await findByText("Sonare's music service isn't responding. Try again in a moment.")).toBeTruthy();
    down = false;
    fireEvent.press(getByText('Try again'));
    fireEvent.press(await findByLabelText('Hit Two by ' + chart[1].artist));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(chart[1].id);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(chart.map((t) => t.id));
  });

  it('MOB-HOME-005 choosing Offline asks first; the header opens search and settings', () => {
    const { getByLabelText } = render(<HomeScreen />);
    fireEvent.press(getByLabelText('Offline'));
    expect(nav.navigate).toHaveBeenCalledWith('ModeSwitch', {
      targetMode: 'offline',
    });
    expect(useModeStore.getState().mode).toBe('online');
    fireEvent.press(getByLabelText('Search'));
    fireEvent.press(getByLabelText('Settings'));
    expect(nav.navigate).toHaveBeenCalledWith('Search');
    expect(nav.navigate).toHaveBeenCalledWith('Settings');
  });

  it('MOB-HOME-006 offline, it lists the downloaded songs and asks the server for nothing', () => {
    useModeStore.setState({ mode: 'offline' });
    const song = makeTrack({ title: 'Saved song' });
    useDownloadsStore.setState({
      items: {
        [song.id]: makeDownload(song),
        gone: makeDownload(makeTrack({ id: 'gone', title: 'Moved away' }), {
          missing: true,
        }),
        half: makeDownload(makeTrack({ id: 'half', title: 'Half done' }), {
          status: 'downloading',
        }),
      },
    });
    const trending = jest.spyOn(api, 'trending');
    const { getByText, queryByText, getByLabelText } = render(<HomeScreen />);
    expect(getByText("You're offline")).toBeTruthy();
    expect(getByText('1 downloaded song on this phone')).toBeTruthy();
    expect(queryByText('Moved away')).toBeNull();
    expect(queryByText('Half done')).toBeNull();
    fireEvent.press(getByLabelText(`Saved song by ${song.artist}`));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(song.id);
    fireEvent.press(getByLabelText('Music folders'));
    expect(nav.navigate).toHaveBeenCalledWith('Folders');
    expect(trending).not.toHaveBeenCalled();
  });
});

describe('Search', () => {
  it('MOB-SEARCH-001 typing searches once the user pauses, and shows a top result and songs', async () => {
    const song = makeTrack({
      title: 'Paranoid Android',
      artist: 'Radiohead',
      album: 'OK Computer',
    });
    const search = stub('search', async () => page([{ ...song, kind: 'track' }]));
    const { getByLabelText, findByText, getByText, getAllByText } = render(<SearchScreen />);
    expect(getByText('Search for songs, albums, artists and playlists.')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Search all music'), 'para');
    fireEvent.changeText(getByLabelText('Search all music'), '  paranoid ');
    expect(await findByText(/· 1 results/)).toBeTruthy();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('paranoid', 'all');
    // Shown as the top result and again in the song list.
    expect(getByText('Top result')).toBeTruthy();
    expect(getAllByText('Radiohead · OK Computer')).toHaveLength(2);
  });

  it('MOB-SEARCH-002 tapping a song plays it with the other results queued', async () => {
    const a = makeTrack({ title: 'Song A' });
    const b = makeTrack({ title: 'Song B' });
    stub('search', async () =>
      page([
        { ...a, kind: 'track' },
        { ...b, kind: 'track' },
      ]),
    );
    const { getByLabelText, findByLabelText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText('Search all music'), 'song');
    fireEvent.press(await findByLabelText(`Song B by ${b.artist}`));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(b.id);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([a.id, b.id]);
  });

  it('MOB-SEARCH-003 album and artist results open their pages; filters change the search type', async () => {
    const album = makeAlbum({ id: 'yt:okc', title: 'OK Computer' });
    const artist = makeArtist({
      id: 'yt:rh',
      name: 'Radiohead',
      albumCount: 9,
    });
    const search = stub('search', async () =>
      page([
        { ...album, kind: 'album' },
        { ...artist, kind: 'artist' },
      ]),
    );
    const { getByLabelText, findByText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText('Search all music'), 'radiohead');
    fireEvent.press(await findByText('OK Computer'));
    expect(nav.navigate).toHaveBeenCalledWith('Album', { id: 'yt:okc' });
    fireEvent.press(getByLabelText('Radiohead'));
    expect(nav.navigate).toHaveBeenCalledWith('Artist', { id: 'yt:rh' });
    fireEvent.press(getByText('Albums'));
    await waitFor(() => expect(search).toHaveBeenLastCalledWith('radiohead', 'albums'));
  });

  it('MOB-SEARCH-006 the Genres chip searches everything instead of sending a type the server rejects', async () => {
    const search = stub('search', async () => page([]));
    const { getByLabelText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText('Search all music'), 'lofi');
    await waitFor(() => expect(search).toHaveBeenLastCalledWith('lofi', 'all'));
    fireEvent.press(getByText('Genres'));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(search).toHaveBeenLastCalledWith('lofi', 'all');
  });

  it('MOB-SEARCH-004 no results says so; a failed search can be retried', async () => {
    let fail = true;
    stub('search', async () => {
      if (fail) throw new Error('Network request failed');
      return page([]);
    });
    const { getByLabelText, findByText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText('Search all music'), 'zzqx');
    expect(await findByText('Try again')).toBeTruthy();
    fail = false;
    fireEvent.press(getByText('Try again'));
    expect(await findByText('No results for "zzqx"')).toBeTruthy();
  });

  it('MOB-SEARCH-005 offline, the server is never searched and it offers to go online', async () => {
    useModeStore.setState({ mode: 'offline' });
    const search = jest.spyOn(api, 'search');
    const { getByLabelText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText('Search music on this device'), 'anything');
    await new Promise((r) => setTimeout(r, 400));
    expect(search).not.toHaveBeenCalled();
    expect(getByText('Not on this device')).toBeTruthy();
    fireEvent.press(getByText('Go online'));
    expect(useModeStore.getState().mode).toBe('online');
  });
});

describe('Library', () => {
  const mine = [
    makeTrack({ title: 'Mine 1' }),
    makeTrack({ title: 'Mine 2' }),
    makeTrack({ id: 'local:z', title: 'Phone file', source: 'local' }),
  ];

  it('MOB-LIB-S-001 a guest is invited to create an account instead of seeing a library', () => {
    const lib = jest.spyOn(api, 'libraryTracks');
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Your library lives in your account')).toBeTruthy();
    fireEvent.press(getByText('Create account'));
    expect(nav.navigate).toHaveBeenCalledWith('SignIn', { mode: 'signup' });
    expect(lib).not.toHaveBeenCalled();
  });

  it('MOB-LIB-S-002 lists the saved server songs; Play all plays them in order', async () => {
    signIn();
    stub('libraryTracks', async () => page(mine, 2));
    const { findByText, getByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('2 songs')).toBeTruthy();
    expect(queryByText('Phone file')).toBeNull();
    fireEvent.press(getByText('Play all'));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(mine[0].id);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([mine[0].id, mine[1].id]);
  });

  it('MOB-LIB-S-003 the sort chip cycles recently added → most played → A-Z and refetches', async () => {
    signIn();
    const lib = stub('libraryTracks', async () => page(mine));
    const { findByText, getByText } = render(<LibraryScreen />);
    fireEvent.press(await findByText('Recently added'));
    fireEvent.press(await findByText('Most played'));
    expect(getByText('A-Z')).toBeTruthy();
    await waitFor(() => expect(lib.mock.calls.map((c) => c[0])).toEqual(['addedAt', 'playCount', 'title']));
  });

  it('MOB-LIB-S-004 "only on this phone" keeps just the downloaded songs', async () => {
    signIn();
    stub('libraryTracks', async () => page(mine));
    useDownloadsStore.setState({
      items: { [mine[1].id]: makeDownload(mine[1]) },
    });
    const { findByLabelText, getByLabelText, queryByLabelText } = render(<LibraryScreen />);
    await findByLabelText(`Mine 1 by ${mine[0].artist}`);
    fireEvent.press(getByLabelText('Show only songs on this phone'));
    expect(queryByLabelText(`Mine 1 by ${mine[0].artist}`)).toBeNull();
    expect(getByLabelText(`Mine 2 by ${mine[1].artist}`)).toBeTruthy();
    fireEvent.press(getByLabelText('Show all songs'));
    expect(getByLabelText(`Mine 1 by ${mine[0].artist}`)).toBeTruthy();
  });

  it('MOB-LIB-S-005 the Folders tab opens the folders screen; Downloads opens downloads', async () => {
    signIn();
    stub('libraryTracks', async () => page([]));
    const { getByText, getByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Folders'));
    fireEvent.press(getByLabelText('Downloads'));
    expect(nav.navigate).toHaveBeenCalledWith('Folders');
    expect(nav.navigate).toHaveBeenCalledWith('Downloads');
  });
});

describe('Playlists', () => {
  it('MOB-PLS-001 a guest is asked to sign up before creating a playlist', () => {
    const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    const { getByText, getByLabelText } = render(<PlaylistsScreen />);
    expect(getByText('Make playlists with an account')).toBeTruthy();
    fireEvent.press(getByLabelText('New playlist'));
    expect(navigate).toHaveBeenCalledWith('SignIn', {
      reason: 'Create a free account to make playlists.',
    });
  });

  it("MOB-PLS-002 lists the user's playlists with their kind; tapping one opens it", async () => {
    signIn();
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', kind: 'synced' });
    jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockImplementation(async () => {
      useLibraryStore.setState({
        playlists: [gym, makePlaylist({ name: 'Chart', kind: 'online' })],
      });
    });
    const { findByLabelText, getByText } = render(<PlaylistsScreen />);
    fireEvent.press(await findByLabelText('Gym'));
    expect(nav.navigate).toHaveBeenCalledWith('Playlist', { id: 'sonare:gym' });
    expect(getByText('Synced')).toBeTruthy();
    expect(getByText('Online')).toBeTruthy();
  });

  it('MOB-PLS-003 creating a playlist names it and opens it', async () => {
    signIn();
    jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();
    const create = jest
      .spyOn(useLibraryStore.getState(), 'createPlaylist')
      .mockResolvedValue(makePlaylist({ id: 'sonare:new' }));
    const { getByLabelText, findByLabelText } = render(<PlaylistsScreen />);
    fireEvent.press(getByLabelText('New playlist'));
    fireEvent.changeText(await findByLabelText('Playlist name'), '  Road trip ');
    await act(async () => {
      fireEvent(getByLabelText('Playlist name'), 'submitEditing', {
        nativeEvent: { text: '  Road trip ' },
      });
    });
    expect(create).toHaveBeenCalledWith('Road trip');
    expect(nav.navigate).toHaveBeenCalledWith('Playlist', { id: 'sonare:new' });
  });

  it("MOB-PLS-004 deleting from a playlist's options asks first", async () => {
    signIn();
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym' });
    useLibraryStore.setState({ playlists: [gym] });
    jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();
    const del = jest.spyOn(useLibraryStore.getState(), 'deletePlaylist').mockResolvedValue();
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText, findByLabelText } = render(<PlaylistsScreen />);
    fireEvent.press(getByLabelText('Options for Gym'));
    fireEvent.press(await findByLabelText('Delete playlist'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Delete playlist?',
        '"Gym" will be removed from all your devices.',
        expect.any(Array),
        expect.anything(),
      ),
    );
    expect(del).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as {
      text: string;
      onPress?: () => void;
    }[];
    await act(async () => buttons.find((b) => b.text === 'Delete')!.onPress!());
    expect(del).toHaveBeenCalledWith('sonare:gym');
  });

  it('MOB-PLS-005 offline, playlists wait for Online Mode', () => {
    useModeStore.setState({ mode: 'offline' });
    signIn();
    useLibraryStore.setState({ playlists: [makePlaylist({ name: 'Gym' })] });
    const { getByText, queryByLabelText } = render(<PlaylistsScreen />);
    expect(getByText('Playlists sync from the Sonare server — switch back to Online.')).toBeTruthy();
    expect(queryByLabelText('Gym')).toBeNull();
  });
});

describe('Playlist, album and artist pages', () => {
  const songs = [makeTrack({ title: 'One', durationMs: 120_000 }), makeTrack({ title: 'Two', durationMs: 180_000 })];

  it("MOB-PL-001 the user's own playlist shows its length and plays from the start", async () => {
    signIn();
    route.params = { id: 'sonare:gym' };
    stub('myPlaylist', async () => makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 2 }));
    stub('myPlaylistTracks', async () => page(songs));
    const { findByText, getByText, getByLabelText } = render(<PlaylistDetailScreen />);
    expect(await findByText('Gym')).toBeTruthy();
    expect(getByText('Made by you')).toBeTruthy();
    expect(getByText(/2 songs · 5 min/)).toBeTruthy();
    fireEvent.press(getByLabelText('Play playlist'));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(songs[0].id);
    // Playing now: the same button pauses.
    usePlayerStore.setState({ isPlaying: true });
    fireEvent.press(getByLabelText('Play playlist'));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('MOB-PL-002 a public playlist has no owner options', async () => {
    route.params = { id: 'yt:PL1' };
    stub('playlist', async () => makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online' }));
    stub('playlistTracks', async () => page(songs));
    const { findByText, queryByLabelText, getByText } = render(<PlaylistDetailScreen />);
    expect(await findByText('Hits')).toBeTruthy();
    expect(getByText('Online playlist')).toBeTruthy();
    expect(queryByLabelText('Playlist options')).toBeNull();
  });

  it('MOB-PL-003 deleting the playlist from its options leaves the page once it is gone', async () => {
    signIn();
    route.params = { id: 'sonare:gym' };
    stub('myPlaylist', async () => makePlaylist({ id: 'sonare:gym', name: 'Gym' }));
    stub('myPlaylistTracks', async () => page([]));
    jest.spyOn(useLibraryStore.getState(), 'deletePlaylist').mockResolvedValue();
    const alert = jest.spyOn(Alert, 'alert');
    const { findByLabelText, getByLabelText, findByText } = render(<PlaylistDetailScreen />);
    expect(await findByText(/This playlist is empty/)).toBeTruthy();
    fireEvent.press(await findByLabelText('Playlist options'));
    fireEvent.press(getByLabelText('Delete playlist'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    const buttons = alert.mock.calls[0][2] as {
      text: string;
      onPress?: () => void;
    }[];
    await act(async () => buttons.find((b) => b.text === 'Delete')!.onPress!());
    await waitFor(() => expect(nav.goBack).toHaveBeenCalled());
  });

  // BUG: the heart on the playlist and album pages is wired to `onPress={() => {}}`, so it
  // looks like a favourite button but saves nothing. Remove `.failing` once it is hooked up.
  test.failing('MOB-PL-004 the favourite button on a playlist saves it', async () => {
    signIn();
    route.params = { id: 'yt:PL1' };
    stub('playlist', async () => makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online' }));
    stub('playlistTracks', async () => page(songs));
    const anyCall = jest.fn();
    for (const k of Object.keys(api) as (keyof typeof api)[])
      if (!['playlist', 'playlistTracks'].includes(k)) jest.spyOn(api, k).mockImplementation(anyCall as never);
    const { findByLabelText } = render(<PlaylistDetailScreen />);
    fireEvent.press(await findByLabelText('Favourite playlist'));
    expect(anyCall).toHaveBeenCalled();
  });

  it('MOB-ALB-001 an album shows its artist link and year, and shuffle plays it all', async () => {
    route.params = { id: 'yt:inr' };
    stub('album', async () =>
      makeAlbum({
        id: 'yt:inr',
        title: 'In Rainbows',
        artist: 'Radiohead',
        artistId: 'yt:rh',
        year: 2007,
        trackCount: 2,
      }),
    );
    stub('albumTracks', async () => page(songs));
    const { findByText, getByText, getByLabelText } = render(<AlbumScreen />);
    expect(await findByText('In Rainbows')).toBeTruthy();
    fireEvent.press(getByText('Radiohead'));
    expect(nav.navigate).toHaveBeenCalledWith('Artist', { id: 'yt:rh' });
    expect(getByText(/2007/)).toBeTruthy();
    await findByText('One');
    fireEvent.press(getByLabelText('Shuffle'));
    expect(usePlayerStore.getState().shuffle).toBe(true);
    expect(
      usePlayerStore
        .getState()
        .queue.map((t) => t.id)
        .sort(),
    ).toEqual(songs.map((t) => t.id).sort());
  });

  it('MOB-ALB-002 "Add to queue" appends the whole album', async () => {
    route.params = { id: 'yt:inr' };
    stub('album', async () => makeAlbum({ id: 'yt:inr' }));
    stub('albumTracks', async () => page(songs));
    const now = makeTrack({ title: 'Already playing' });
    usePlayerStore.setState({ currentTrack: now, queue: [now] });
    const { findByText, getByLabelText } = render(<AlbumScreen />);
    await findByText('One');
    fireEvent.press(getByLabelText('Add to queue'));
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([now.id, ...songs.map((t) => t.id)]);
  });

  it('MOB-ALB-003 the favourite button on an album saves it', async () => {
    signIn();
    route.params = { id: 'yt:inr' };
    stub('album', async () => makeAlbum({ id: 'yt:inr' }));
    stub('albumTracks', async () => page(songs));
    const anyCall = jest.fn();
    for (const k of Object.keys(api) as (keyof typeof api)[])
      if (!['album', 'albumTracks'].includes(k)) jest.spyOn(api, k).mockImplementation(anyCall as never);
    const { findByLabelText } = render(<AlbumScreen />);
    fireEvent.press(await findByLabelText('Favourite album'));
    expect(anyCall).toHaveBeenCalled();
  });

  it('MOB-ART-001 an artist shows listeners and albums; album tiles open the album', async () => {
    route.params = { id: 'yt:rh' };
    stub('artist', async () =>
      makeArtist({
        id: 'yt:rh',
        name: 'Radiohead',
        monthlyListeners: 1_234_567,
      } as never),
    );
    stub('artistTopTracks', async () => page(songs));
    stub('artistAlbums', async () => page([makeAlbum({ id: 'yt:kida', title: 'Kid A', year: 2000 })]));
    const { findByText, findByLabelText } = render(<ArtistScreen />);
    expect(await findByText('Radiohead')).toBeTruthy();
    expect(await findByText(/1,234,567/)).toBeTruthy();
    fireEvent.press(await findByLabelText('Kid A'));
    expect(nav.push).toHaveBeenCalledWith('Album', { id: 'yt:kida' });
  });

  it('MOB-ART-002 following saves to the account; a failure turns it back', async () => {
    signIn();
    route.params = { id: 'yt:rh' };
    stub('artist', async () => makeArtist({ id: 'yt:rh', name: 'Portishead', following: false }));
    stub('artistTopTracks', async () => page([]));
    stub('artistAlbums', async () => page([]));
    const follow = stub('setFollowing', async () => ({ ok: true }));
    const { findByText, getByLabelText } = render(<ArtistScreen />);
    await findByText('Portishead');
    await act(async () => fireEvent.press(getByLabelText('Follow')));
    expect(follow).toHaveBeenCalledWith('yt:rh', true);
    expect(getByLabelText('Unfollow')).toBeTruthy();
    follow.mockRejectedValueOnce(new Error('offline'));
    await act(async () => fireEvent.press(getByLabelText('Unfollow')));
    expect(getByLabelText('Unfollow')).toBeTruthy();
  });

  it('MOB-ART-003 an artist with no songs says so', async () => {
    route.params = { id: 'yt:rh' };
    stub('artist', async () => makeArtist({ id: 'yt:rh' }));
    stub('artistTopTracks', async () => page([]));
    stub('artistAlbums', async () => page([]));
    const { findByText } = render(<ArtistScreen />);
    expect(await findByText('No songs found for this artist.')).toBeTruthy();
  });
});
