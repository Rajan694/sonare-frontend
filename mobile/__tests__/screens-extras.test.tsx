import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NowPlayingScreen } from '../src/screens/NowPlaying';
import { SettingsScreen } from '../src/screens/Settings';
import { LibraryScreen } from '../src/screens/Library';
import { PlayerSheetsHost, usePlayerSheets } from '../src/components/music/PlayerSheets';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { navigationRef } from '../src/data/accountGate';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useTrackMenuStore } from '../src/store/trackMenu';
import { useDevicePrefsStore } from '../src/store/devicePrefs';
import { alice, makeAlbum, makeArtist, makeDownload, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

/** Now Playing's design extras (M09), the sheets they open, Settings' rows and the Library tabs. */

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const guest = () => useAuthStore.setState({ status: 'guest', user: null } as never);

const song = makeTrack({ title: 'Nude', artist: 'Radiohead', album: 'In Rainbows' });

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  guest();
  useModeStore.setState({ mode: 'online' });
  usePlayerStore.setState({
    currentTrack: song,
    queue: [song],
    index: 0,
    isPlaying: true,
    positionMs: 0,
    durationMs: 240_000,
    error: null,
    playingFrom: null,
    shuffle: false,
    repeat: 'off',
  });
  useDownloadsStore.setState({ items: {}, ready: true });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useTrackMenuStore.setState({ track: null });
  usePlayerSheets.setState({ open: null });
  useDevicePrefsStore.setState({ lyricsScript: 'original' });
  jest.spyOn(api, 'peaks').mockResolvedValue({ peaks: [1, 2, 3] } as never);
});

describe('Now Playing extras', () => {
  it('MOB-NPX-001 the header says where the queue is playing from, else the song’s album', () => {
    usePlayerStore.setState({ playingFrom: { kind: 'Playlist', name: 'Gym' } });
    const first = render(<NowPlayingScreen />);
    expect(first.getByText('PLAYING FROM Playlist')).toBeTruthy();
    expect(first.getByText('Gym')).toBeTruthy();
    first.unmount();

    usePlayerStore.setState({ playingFrom: null });
    const second = render(<NowPlayingScreen />);
    expect(second.getByText('PLAYING FROM Album')).toBeTruthy();
    expect(second.getByText('In Rainbows')).toBeTruthy();
    second.unmount();

    usePlayerStore.setState({ currentTrack: { ...song, album: null } });
    expect(render(<NowPlayingScreen />).queryByText(/PLAYING FROM/)).toBeNull();
  });

  it('MOB-NPX-002 + opens the playlist picker; a guest is asked to sign up first', () => {
    const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    const { getByLabelText } = render(<NowPlayingScreen />);
    fireEvent.press(getByLabelText('Add to playlist'));
    expect(navigate).toHaveBeenCalledWith('SignIn', { reason: 'Create a free account to make playlists.' });
    expect(useTrackMenuStore.getState().track).toBeNull();

    signIn();
    fireEvent.press(getByLabelText('Add to playlist'));
    expect(useTrackMenuStore.getState()).toMatchObject({ track: song, view: 'playlists' });
  });

  it("MOB-NPX-004 there is no audio output card or button: music plays on the phone's output", () => {
    const { queryByLabelText } = render(<NowPlayingScreen />);
    expect(queryByLabelText(/^Audio output/)).toBeNull();
  });

  it('MOB-NPX-005 a song whose artist id the Artist screen can open shows a link; otherwise plain text', () => {
    const linked = render(<NowPlayingScreen />);
    expect(linked.getByText('Radiohead').props.accessibilityRole).toBe('link');
    linked.unmount();

    for (const artistId of ['', 'local:x']) {
      usePlayerStore.setState({ currentTrack: makeTrack({ artist: 'Unknown', artistId }) });
      const plain = render(<NowPlayingScreen />);
      expect(plain.getByText('Unknown').props.accessibilityRole).toBeUndefined();
      fireEvent.press(plain.getByText('Unknown'));
      expect(nav.goBack).not.toHaveBeenCalled();
      plain.unmount();
    }
  });

  it('MOB-NPX-006 the repeat button names its mode and shows repeat-one for a single song', () => {
    const { getByLabelText, UNSAFE_root } = render(<NowPlayingScreen />);
    const oneIcons = () => UNSAFE_root.findAll((n) => n.props?.name === 'repeat-one');
    expect(getByLabelText('Repeat off')).toBeTruthy();
    expect(oneIcons()).toHaveLength(0);
    fireEvent.press(getByLabelText('Repeat off'));
    expect(getByLabelText('Repeat all')).toBeTruthy();
    fireEvent.press(getByLabelText('Repeat all'));
    expect(getByLabelText('Repeat one')).toBeTruthy();
    expect(oneIcons()).toHaveLength(1);
    fireEvent.press(getByLabelText('Repeat one'));
    expect(getByLabelText('Repeat off')).toBeTruthy();
    expect(oneIcons()).toHaveLength(0);
  });
});

describe('player sheets', () => {
  const show = (name: 'lyrics') => act(() => usePlayerSheets.getState().show(name));

  it('MOB-SHEET-003 the lyrics sheet sets the language', async () => {
    const { findByLabelText } = render(<PlayerSheetsHost />);
    show('lyrics');
    fireEvent.press(await findByLabelText('Punjabi (Gurmukhi)'));
    expect(useDevicePrefsStore.getState().lyricsScript).toBe('gurmukhi');
  });
});

describe('Settings rows', () => {
  it('MOB-SETX-001 lyrics language shows its state and opens its sheet; no audio output or sleep timer row', () => {
    useDevicePrefsStore.setState({ lyricsScript: 'latin' });
    const { getByLabelText, getByText, queryByLabelText } = render(<SettingsScreen />);
    expect(queryByLabelText('Audio output')).toBeNull();
    expect(queryByLabelText('Sleep timer')).toBeNull();
    expect(getByText('English / Romanised')).toBeTruthy();
    fireEvent.press(getByLabelText('Lyrics language'));
    expect(usePlayerSheets.getState().open).toBe('lyrics');
  });

  it('MOB-SETX-002 there is no server address setting', () => {
    const { queryByLabelText, queryByText } = render(<SettingsScreen />);
    expect(queryByLabelText('Server address')).toBeNull();
    expect(queryByText('Server')).toBeNull();
  });
});

describe('Library tabs', () => {
  beforeEach(() => {
    signIn();
    jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
  });

  it('MOB-LIBX-001 Albums shows the saved albums and opens one', async () => {
    jest
      .spyOn(api, 'libraryAlbums')
      .mockResolvedValue(page([makeAlbum({ id: 'yt:okc', title: 'OK Computer', artist: 'Radiohead' })]) as never);
    const { getByText, findByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Albums'));
    fireEvent.press(await findByLabelText('OK Computer by Radiohead'));
    expect(nav.navigate).toHaveBeenCalledWith('Album', { id: 'yt:okc' });
  });

  it('MOB-LIBX-002 Artists shows followed artists and the artists of your songs, with counts', async () => {
    jest
      .spyOn(api, 'libraryArtists')
      .mockResolvedValue(
        page([
          makeArtist({ id: 'yt:rh', name: 'Radiohead', following: true }),
          { ...makeArtist({ id: 'yt:dil', name: 'Diljit Dosanjh', following: false }), songCount: 3 },
        ]) as never,
      );
    const { getByText, findByLabelText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Artists'));
    expect(await findByText('Following')).toBeTruthy();
    expect(await findByText('3 songs')).toBeTruthy();
    fireEvent.press(await findByLabelText('Diljit Dosanjh'));
    expect(nav.navigate).toHaveBeenCalledWith('Artist', { id: 'yt:dil' });
  });

  it('MOB-LIBX-003 there is no Genres tab in the Library (Genres are in Search → Browse)', () => {
    // Genres tab was removed from Library; Search keeps Browse categories and its Genres chip.
    const { queryByText } = render(<LibraryScreen />);
    expect(queryByText('Genres')).toBeNull();
  });

  it('MOB-LIBX-004 empty online tabs say how things get there; offline Albums/Artists group phone songs', async () => {
    jest.spyOn(api, 'libraryAlbums').mockResolvedValue(page([]) as never);
    jest.spyOn(api, 'libraryArtists').mockResolvedValue(page([]) as never);
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Albums'));
    expect(await findByText('Albums you save (the heart on an album) show up here.')).toBeTruthy();
    fireEvent.press(getByText('Artists'));
    expect(
      await findByText('Follow artists, like songs or add them to a playlist, and their artists show up here.'),
    ).toBeTruthy();
    // Offline with no phone songs → empty message (no phone songs grouped).
    act(() => useModeStore.setState({ mode: 'offline' }));
    await waitFor(() => expect(getByText('No music on this phone yet. Songs you download show up here.')).toBeTruthy());
  });

  it('MOB-LIBX-005 Favourites and Most played show those songs from the account and play them in order', async () => {
    const likedSongs = [makeTrack({ title: 'Loved one' }), makeTrack({ title: 'Loved two' })];
    const top = [makeTrack({ title: 'On repeat' })];
    // Favourites tab now uses libraryTracks with filter=liked.
    jest.spyOn(api, 'libraryTracks').mockImplementation(async (opts: any) => {
      if (opts?.filter === 'liked') return page(likedSongs) as never;
      return page([]) as never;
    });
    const mostPlayed = jest.spyOn(api, 'mostPlayed').mockResolvedValue(page(top) as never);
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    expect(await findByText('Loved two')).toBeTruthy();
    fireEvent.press(getByText('Play all'));
    expect(usePlayerStore.getState().queue.map((t) => t.title)).toEqual(['Loved one', 'Loved two']);
    fireEvent.press(getByText('Most played'));
    expect(await findByText('On repeat')).toBeTruthy();
    expect(mostPlayed).toHaveBeenCalledWith(50);
  });

  it('MOB-LIBX-006 offline, Favourites shows the liked songs downloaded to this phone, fetching nothing', async () => {
    const saved = makeTrack({ title: 'Saved and liked' });
    const other = makeTrack({ title: 'Saved only' });
    useLibraryStore.setState({ favouriteIds: { [saved.id]: true } });
    useDownloadsStore.setState({ items: { [saved.id]: makeDownload(saved), [other.id]: makeDownload(other) } });
    const libraryTracks = jest.spyOn(api, 'libraryTracks');
    act(() => useModeStore.setState({ mode: 'offline' }));
    const { getByText, findByText, queryByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    expect(await findByText('Saved and liked')).toBeTruthy();
    expect(queryByText('Saved only')).toBeNull();
    // Offline: no API call for liked songs.
    expect(libraryTracks).not.toHaveBeenCalled();
  });

  it('MOB-LIBX-007 Shuffle turns shuffle mode on and starts the whole list shuffled', async () => {
    const likedSongs = [makeTrack({ title: 'One' }), makeTrack({ title: 'Two' }), makeTrack({ title: 'Three' })];
    // Favourites tab uses libraryTracks with filter=liked.
    jest.spyOn(api, 'libraryTracks').mockImplementation(async (opts: any) => {
      if (opts?.filter === 'liked') return page(likedSongs) as never;
      return page([]) as never;
    });
    usePlayerStore.setState({ shuffle: false });
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    await findByText('One');
    fireEvent.press(getByText('Shuffle'));
    const state = usePlayerStore.getState();
    expect(state.shuffle).toBe(true);
    expect(state.currentTrack?.title).toBe(state.queue[0].title);
    expect(state.queue.map((t) => t.title).sort()).toEqual(['One', 'Three', 'Two']);
  });
});
