import React from 'react';
import { NativeModules } from 'react-native';
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
import { useSleepTimerStore } from '../src/store/sleepTimer';
import { useDevicePrefsStore } from '../src/store/devicePrefs';
import { alice, makeAlbum, makeArtist, makeDownload, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

/** Now Playing's design extras (M09), the sheets they open, Settings' rows and the Library tabs. */

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;
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
    isPlaying: true,
    positionMs: 0,
    durationMs: 240_000,
    error: null,
    playingFrom: null,
  });
  useDownloadsStore.setState({ items: {}, ready: true });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useTrackMenuStore.setState({ track: null });
  usePlayerSheets.setState({ open: null });
  useSleepTimerStore.setState({ timer: { kind: 'off' } });
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

  it('MOB-NPX-003 the sleep-timer button opens its sheet and shows when the timer is on', () => {
    const { getByLabelText, queryByLabelText } = render(<NowPlayingScreen />);
    fireEvent.press(getByLabelText('Sleep timer'));
    expect(usePlayerSheets.getState().open).toBe('sleep');
    expect(queryByLabelText('Sleep timer on')).toBeNull();
    act(() => useSleepTimerStore.setState({ timer: { kind: 'endOfTrack' } }));
    expect(getByLabelText('Sleep timer on')).toBeTruthy();
  });

  it("MOB-NPX-004 there is no audio output card or button: music plays on the phone's output", () => {
    const { queryByLabelText } = render(<NowPlayingScreen />);
    expect(queryByLabelText(/^Audio output/)).toBeNull();
  });
});

describe('player sheets', () => {
  const show = (name: 'sleep' | 'lyrics') => act(() => usePlayerSheets.getState().show(name));

  it('MOB-SHEET-002 the sleep sheet starts, switches and stops the timer', async () => {
    const { findByLabelText, getByLabelText } = render(<PlayerSheetsHost />);
    show('sleep');
    fireEvent.press(await findByLabelText('30 minutes'));
    expect(native.setSleepTimer).toHaveBeenLastCalledWith(30 * 60_000);
    expect(useSleepTimerStore.getState().timer).toMatchObject({ kind: 'minutes', minutes: 30 });

    show('sleep');
    expect((await findByLabelText('30 minutes')).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('End of track'));
    expect(native.setPauseAtEndOfTrack).toHaveBeenLastCalledWith(true);

    show('sleep');
    fireEvent.press(await findByLabelText('Off'));
    expect(useSleepTimerStore.getState().timer).toEqual({ kind: 'off' });
  });

  it('MOB-SHEET-003 the lyrics sheet sets the language', async () => {
    const { findByLabelText } = render(<PlayerSheetsHost />);
    show('lyrics');
    fireEvent.press(await findByLabelText('Punjabi (Gurmukhi)'));
    expect(useDevicePrefsStore.getState().lyricsScript).toBe('gurmukhi');
  });
});

describe('Settings rows', () => {
  it('MOB-SETX-001 sleep timer and lyrics language show their state and open their sheets; no audio output row', () => {
    useSleepTimerStore.setState({ timer: { kind: 'endOfTrack' } });
    useDevicePrefsStore.setState({ lyricsScript: 'latin' });
    const { getByLabelText, getByText, queryByLabelText } = render(<SettingsScreen />);
    expect(queryByLabelText('Audio output')).toBeNull();
    expect(getByText('At the end of this track')).toBeTruthy();
    expect(getByText('English / Romanised')).toBeTruthy();
    for (const [label, sheet] of [
      ['Sleep timer', 'sleep'],
      ['Lyrics language', 'lyrics'],
    ] as const) {
      fireEvent.press(getByLabelText(label));
      expect(usePlayerSheets.getState().open).toBe(sheet);
    }
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

  it('MOB-LIBX-003 Genres opens a search for the category in the Search tab', async () => {
    jest.spyOn(api, 'genres').mockResolvedValue([{ id: 'sufi', name: 'Sufi', query: 'sufi songs' }]);
    const { getByText, findByLabelText, getByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Genres'));
    // The built-in categories show until the server's list arrives.
    expect(getByLabelText('Browse Devotional')).toBeTruthy();
    fireEvent.press(await findByLabelText('Browse Sufi'));
    expect(nav.navigate).toHaveBeenCalledWith('Search', { screen: 'SearchRoot', params: { q: 'sufi songs' } });
  });

  it('MOB-LIBX-004 empty tabs say how things get there; offline they say to go online', async () => {
    jest.spyOn(api, 'libraryAlbums').mockResolvedValue(page([]) as never);
    jest.spyOn(api, 'libraryArtists').mockResolvedValue(page([]) as never);
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Albums'));
    expect(await findByText('Albums you save (the heart on an album) show up here.')).toBeTruthy();
    fireEvent.press(getByText('Artists'));
    expect(
      await findByText('Follow artists, like songs or add them to a playlist, and their artists show up here.'),
    ).toBeTruthy();
    act(() => useModeStore.setState({ mode: 'offline' }));
    await waitFor(() => expect(getByText('Your artists come from your account. Go online to see them.')).toBeTruthy());
  });

  it('MOB-LIBX-005 Favourites and Most played show those songs from the account and play them in order', async () => {
    const liked = [makeTrack({ title: 'Loved one' }), makeTrack({ title: 'Loved two' })];
    const top = [makeTrack({ title: 'On repeat' })];
    jest.spyOn(api, 'favourites').mockResolvedValue(page(liked) as never);
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
    const favourites = jest.spyOn(api, 'favourites');
    act(() => useModeStore.setState({ mode: 'offline' }));
    const { getByText, findByText, queryByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    expect(await findByText('Saved and liked')).toBeTruthy();
    expect(queryByText('Saved only')).toBeNull();
    expect(favourites).not.toHaveBeenCalled();
  });
});
