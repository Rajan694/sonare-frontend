import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlaylistDetailScreen } from '../src/screens/PlaylistDetail';
import { SearchScreen } from '../src/screens/Search';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useTrackMenuStore } from '../src/store/trackMenu';
import type { Track } from '../src/data/types';
import * as NetInfo from '@react-native-community/netinfo';
import { alice, makePlaylist, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);

/** Stub an api method for this test. */
const stub = <K extends keyof typeof api>(name: K, impl: (...args: any[]) => any) =>
  jest.spyOn(api, name).mockImplementation(impl as never);

// The same song can sit in a playlist twice, so every row carries its own entryId.
const own = [
  makeTrack({ title: 'One', entryId: 'row-1' }),
  makeTrack({ title: 'Two', entryId: 'row-2' }),
  makeTrack({ title: 'Three', entryId: 'row-3' }),
];

/** Open an own playlist with these songs, with the library refresh kept off the network. */
const openOwn = (tracks: Track[] = own) => {
  route.params = { id: 'sonare:gym' };
  stub('myPlaylist', async () => makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: tracks.length }));
  stub('myPlaylistTracks', async () => page(tracks));
  jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();
};

/** The reorder handles, in the order they are on screen. */
const reorderLabels = (getAllByLabelText: (r: RegExp) => any[]) =>
  getAllByLabelText(/^Reorder /).map((n) => n.props.accessibilityLabel);

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  useModeStore.setState({ mode: 'online' });
  signIn();
  usePlayerStore.setState({
    currentTrack: null,
    queue: [],
    index: 0,
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
    shuffle: false,
  });
  useDownloadsStore.setState({ items: {} });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useTrackMenuStore.setState({ track: null, view: 'menu', extraAction: undefined });
  (NetInfo.useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });
  stub('suggestions', async () => []);
  stub('genres', async () => []);
});

describe('Own playlists', () => {
  it('MOB-OPL-001 removing a song sends its row id and hides it at once', async () => {
    openOwn();
    const remove = stub('removeFromPlaylist', async () => ({ ok: true }));
    const screen = render(<PlaylistDetailScreen />);

    await waitFor(() => expect(screen.getByLabelText('Reorder One')).toBeTruthy());
    fireEvent(screen.getByLabelText(`One by ${own[0].artist}`), 'longPress');
    await act(async () => useTrackMenuStore.getState().extraAction?.onPress());

    expect(remove).toHaveBeenCalledWith('sonare:gym', { entryId: 'row-1', index: 0 });
    expect(screen.queryByLabelText(`One by ${own[0].artist}`)).toBeNull();
    expect(screen.getByLabelText(`Two by ${own[1].artist}`)).toBeTruthy();
  });

  it('MOB-OPL-002 a failed remove puts the song back and says why', async () => {
    openOwn();
    stub('removeFromPlaylist', async () => {
      throw new Error('Server is busy');
    });
    const alert = jest.spyOn(Alert, 'alert');
    const screen = render(<PlaylistDetailScreen />);

    await waitFor(() => expect(screen.getByLabelText('Reorder One')).toBeTruthy());
    fireEvent(screen.getByLabelText(`One by ${own[0].artist}`), 'longPress');
    await act(async () => useTrackMenuStore.getState().extraAction?.onPress());

    expect(alert).toHaveBeenCalledWith("Couldn't remove the song", 'Server is busy');
    expect(screen.getByLabelText(`One by ${own[0].artist}`)).toBeTruthy();
  });

  it('MOB-OPL-003 moving a row with the increment action sends its new position', async () => {
    openOwn();
    const reorder = stub('reorderPlaylist', async () => ({ ok: true }));
    const { getByLabelText, getAllByLabelText } = render(<PlaylistDetailScreen />);

    await waitFor(() => expect(getByLabelText('Reorder One')).toBeTruthy());
    await act(async () => {
      fireEvent(getByLabelText('Reorder One'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });

    expect(reorder).toHaveBeenCalledWith('sonare:gym', { entryId: 'row-1', to: 1 });
    expect(reorderLabels(getAllByLabelText)).toEqual(['Reorder Two', 'Reorder One', 'Reorder Three']);
  });

  it('MOB-OPL-004 a failed move restores the order and says why', async () => {
    openOwn();
    stub('reorderPlaylist', async () => {
      throw new Error('Server is busy');
    });
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText, getAllByLabelText } = render(<PlaylistDetailScreen />);

    await waitFor(() => expect(getByLabelText('Reorder One')).toBeTruthy());
    await act(async () => {
      fireEvent(getByLabelText('Reorder One'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });

    expect(alert).toHaveBeenCalledWith("Couldn't move the song", 'Server is busy');
    expect(reorderLabels(getAllByLabelText)).toEqual(['Reorder One', 'Reorder Two', 'Reorder Three']);
  });

  it('MOB-OPL-005 a YouTube playlist has no drag handles and no Add songs button', async () => {
    route.params = { id: 'yt:PL1' };
    stub('playlist', async () => makePlaylist({ id: 'yt:PL1', name: 'Hits', kind: 'online' }));
    stub('playlistTracks', async () => page([makeTrack({ title: 'One' }), makeTrack({ title: 'Two' })]));
    const { findByText, queryByLabelText } = render(<PlaylistDetailScreen />);

    expect(await findByText('Hits')).toBeTruthy();
    expect(queryByLabelText('Reorder One')).toBeNull();
    expect(queryByLabelText('Add songs')).toBeNull();
  });

  it('MOB-OPL-006 Add songs opens Search in add mode for this playlist', async () => {
    openOwn([makeTrack({ title: 'One', entryId: 'row-1' })]);
    const { findByLabelText } = render(<PlaylistDetailScreen />);

    fireEvent.press(await findByLabelText('Add songs'));

    expect(nav.navigate).toHaveBeenCalledWith('Search', {
      screen: 'SearchRoot',
      params: { addTo: 'sonare:gym', addToName: 'Gym' },
    });
  });

  it('MOB-OPL-007 Search in add mode adds a song and counts it', async () => {
    const song = makeTrack({ title: 'Paranoid Android', artist: 'Radiohead' });
    route.params = { addTo: 'sonare:gym', addToName: 'Gym' };
    stub('search', async () => page([{ ...song, kind: 'track' }]));
    const add = stub('addToPlaylist', async () => ({ ok: true }));
    jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();
    const { getByLabelText, getByText, findAllByLabelText, findByText } = render(<SearchScreen />);

    expect(getByText('Adding to Gym')).toBeTruthy();
    expect(getByText('Search for songs and press + to add them')).toBeTruthy();

    fireEvent.changeText(getByLabelText('Search all music'), 'paranoid');
    fireEvent.press((await findAllByLabelText(`Add ${song.title} to playlist`))[0]);

    await waitFor(() => expect(add).toHaveBeenCalledWith('sonare:gym', [expect.objectContaining({ id: song.id })]));
    expect(await findByText('1 added — search for more')).toBeTruthy();
    expect((await findAllByLabelText(`${song.title} added`)).length).toBeGreaterThan(0);
    expect(getByLabelText('Search all music').props.value).toBe('paranoid');
  });

  it('MOB-OPL-008 a failed add turns the button back and says why', async () => {
    const song = makeTrack({ title: 'Paranoid Android', artist: 'Radiohead' });
    route.params = { addTo: 'sonare:gym', addToName: 'Gym' };
    stub('search', async () => page([{ ...song, kind: 'track' }]));
    stub('addToPlaylist', async () => {
      throw new Error('Server is busy');
    });
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText, findAllByLabelText } = render(<SearchScreen />);

    fireEvent.changeText(getByLabelText('Search all music'), 'paranoid');
    const buttons = await findAllByLabelText(`Add ${song.title} to playlist`);
    fireEvent.press(buttons[0]);

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Couldn't add the song", 'Server is busy'));
    expect(await findAllByLabelText(`Add ${song.title} to playlist`)).toHaveLength(buttons.length);
  });

  it('MOB-OPL-009 Done leaves add mode, clearing the params and the count, and opens the playlist', async () => {
    const song = makeTrack({ title: 'Paranoid Android', artist: 'Radiohead' });
    route.params = { addTo: 'sonare:gym', addToName: 'Gym' };
    stub('search', async () => page([{ ...song, kind: 'track' }]));
    stub('addToPlaylist', async () => ({ ok: true }));
    jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();
    const { getByLabelText, getByText, findAllByLabelText, findByText, queryByText } = render(<SearchScreen />);

    fireEvent.changeText(getByLabelText('Search all music'), 'paranoid');
    fireEvent.press((await findAllByLabelText(`Add ${song.title} to playlist`))[0]);
    expect(await findByText('1 added — search for more')).toBeTruthy();

    fireEvent.press(getByText('Done'));

    expect(nav.setParams).toHaveBeenCalledWith({ addTo: undefined, addToName: undefined });
    expect(nav.navigate).toHaveBeenCalledWith('Playlist', { id: 'sonare:gym' });
    expect(queryByText('Adding to Gym')).toBeNull();
  });
});
