import React from 'react';
import { NativeModules } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NowPlayingScreen } from '../src/screens/NowPlaying';
import { SettingsScreen } from '../src/screens/Settings';
import { LibraryScreen } from '../src/screens/Library';
import { PlayerSheetsHost, usePlayerSheets } from '../src/components/music/PlayerSheets';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { apiOrigin, setServerOrigin } from '../src/data/config';
import { navigationRef } from '../src/data/accountGate';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useTrackMenuStore } from '../src/store/trackMenu';
import { useOutputStore } from '../src/store/output';
import { useSleepTimerStore } from '../src/store/sleepTimer';
import { useDevicePrefsStore } from '../src/store/devicePrefs';
import { alice, makeAlbum, makeArtist, makeDownload, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

/** Now Playing's design extras (M09), the sheets they open, Settings' rows and the Library tabs. */

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;
const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const guest = () => useAuthStore.setState({ status: 'guest', user: null } as never);

const song = makeTrack({ title: 'Nude', artist: 'Radiohead', album: 'In Rainbows' });
const speaker = { id: 2, type: 'speaker' as const, name: 'Phone speaker' };
const buds = { id: 7, type: 'bluetooth' as const, name: 'Galaxy Buds' };

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
  useOutputStore.setState({ current: speaker, devices: [speaker, buds], preferredId: -1 });
  useSleepTimerStore.setState({ timer: { kind: 'off' } });
  useDevicePrefsStore.setState({ lyricsScript: 'original' });
  native.getOutputDevices.mockResolvedValue([speaker, buds]);
  native.getOutputDevice.mockResolvedValue(speaker);
  await setServerOrigin(null);
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

  it('MOB-NPX-003 the output and sleep-timer buttons open their sheets; the timer button shows when it is on', () => {
    const { getByLabelText, queryByLabelText } = render(<NowPlayingScreen />);
    fireEvent.press(getByLabelText('Audio output'));
    expect(usePlayerSheets.getState().open).toBe('output');
    fireEvent.press(getByLabelText('Sleep timer'));
    expect(usePlayerSheets.getState().open).toBe('sleep');
    expect(queryByLabelText('Sleep timer on')).toBeNull();
    act(() => useSleepTimerStore.setState({ timer: { kind: 'endOfTrack' } }));
    expect(getByLabelText('Sleep timer on')).toBeTruthy();
  });

  it('MOB-NPX-004 the output card names the device, and whether a song plays without the network', () => {
    const first = render(<NowPlayingScreen />);
    expect(first.getByLabelText('Audio output: Phone speaker')).toBeTruthy();
    expect(first.getByText('Streaming to this phone')).toBeTruthy();
    first.unmount();

    useDownloadsStore.setState({ items: { [song.id]: makeDownload(song) } });
    const second = render(<NowPlayingScreen />);
    expect(second.getByText('Playing locally · no network used')).toBeTruthy();
    act(() => useOutputStore.setState({ current: buds }));
    expect(second.getByLabelText('Audio output: Galaxy Buds')).toBeTruthy();
    expect(second.getByText('Bluetooth')).toBeTruthy();
    fireEvent.press(second.getByLabelText('Audio output: Galaxy Buds'));
    expect(usePlayerSheets.getState().open).toBe('output');
  });
});

describe('player sheets', () => {
  const show = (name: 'output' | 'sleep' | 'lyrics' | 'server') => act(() => usePlayerSheets.getState().show(name));

  it('MOB-SHEET-001 the output sheet lists Automatic and every device; picking one keeps music there', async () => {
    const { getByLabelText, findByLabelText } = render(<PlayerSheetsHost />);
    show('output');
    expect(await findByLabelText('Automatic, Now: Phone speaker')).toBeTruthy();
    expect(getByLabelText('Automatic, Now: Phone speaker').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Galaxy Buds, Bluetooth'));
    expect(native.setOutputDevice).toHaveBeenLastCalledWith(7);
    expect(usePlayerSheets.getState().open).toBeNull();
    expect(native.getOutputDevices).toHaveBeenCalled();

    show('output');
    expect((await findByLabelText('Galaxy Buds, Bluetooth')).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Automatic, Now: Phone speaker'));
    expect(native.setOutputDevice).toHaveBeenLastCalledWith(-1);
  });

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

  it('MOB-SHEET-004 the server sheet saves a LAN address, rejects nonsense, and can go back to the default', async () => {
    const { findByLabelText, getByText, findByText } = render(<PlayerSheetsHost />);
    show('server');
    const field = await findByLabelText('Server address');
    expect(getByText('Use default')).toBeTruthy();

    fireEvent.changeText(field, 'not an address');
    fireEvent.press(getByText('Save'));
    expect(await findByText('Enter an address like 192.168.1.20:3010')).toBeTruthy();
    expect(apiOrigin()).toBe('http://localhost:3010');

    fireEvent.changeText(field, '192.168.1.20:3010');
    await act(async () => fireEvent(field, 'submitEditing', { nativeEvent: { text: '192.168.1.20:3010' } }));
    expect(apiOrigin()).toBe('http://192.168.1.20:3010');
    expect(usePlayerSheets.getState().open).toBeNull();

    show('server');
    expect((await findByLabelText('Server address')).props.value).toBe('http://192.168.1.20:3010');
    await act(async () => fireEvent.press(getByText('Use default')));
    expect(apiOrigin()).toBe('http://localhost:3010');
  });
});

describe('Settings rows', () => {
  it('MOB-SETX-001 audio output, sleep timer, lyrics language and server address show their state and open their sheets', () => {
    useSleepTimerStore.setState({ timer: { kind: 'endOfTrack' } });
    useDevicePrefsStore.setState({ lyricsScript: 'latin' });
    useOutputStore.setState({ current: buds });
    const { getByLabelText, getByText } = render(<SettingsScreen />);
    expect(getByText('Galaxy Buds')).toBeTruthy();
    expect(getByText('At the end of this track')).toBeTruthy();
    expect(getByText('English / Romanised')).toBeTruthy();
    expect(getByText('Default · http://localhost:3010')).toBeTruthy();
    for (const [label, sheet] of [
      ['Audio output', 'output'],
      ['Sleep timer', 'sleep'],
      ['Lyrics language', 'lyrics'],
      ['Server address', 'server'],
    ] as const) {
      fireEvent.press(getByLabelText(label));
      expect(usePlayerSheets.getState().open).toBe(sheet);
    }
  });

  it('MOB-SETX-002 a custom server address is shown on its row', async () => {
    await setServerOrigin('http://192.168.1.20:3010');
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('http://192.168.1.20:3010')).toBeTruthy();
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
});
