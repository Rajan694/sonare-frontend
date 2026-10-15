import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlaylistsScreen } from '../src/screens/Playlists';
import { PlaylistDetailScreen } from '../src/screens/PlaylistDetail';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useLibraryStore } from '../src/store/library';
import { localUriFor, useDownloadsStore } from '../src/store/downloads';
import { deviceTrack, useLocalMusicStore } from '../src/store/localMusic';
import { useOfflinePlaylistsStore } from '../src/store/offlinePlaylists';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import type { DeviceSong } from '../src/native/SonareLibrary';
import * as NetInfo from '@react-native-community/netinfo';
import { alice, makeDownload, makePlaylist, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const signOut = () => useAuthStore.setState({ status: 'guest', user: null } as never);

/** Stub an api method for this test. */
const stub = <K extends keyof typeof api>(name: K, impl: (...args: any[]) => any) =>
  jest.spyOn(api, name).mockImplementation(impl as never);

const saved = () => useOfflinePlaylistsStore.getState();
const stored = async () => JSON.parse((await AsyncStorage.getItem('sonare.offlinePlaylists')) ?? 'null');

/** Start the app for this test: hydrate the store, sign in, and let the library hand over its lists. */
const start = async (playlists: ReturnType<typeof makePlaylist>[] = []) => {
  await act(async () => {
    await saved().hydrate();
  });
  signIn();
  if (playlists.length) {
    await act(async () => {
      useLibraryStore.setState({ playlists });
    });
  }
};

const song = (over: Partial<DeviceSong> = {}): DeviceSong => ({
  mediaId: '1',
  uri: 'content://media/external/audio/media/1',
  title: 'A song',
  artist: 'Someone',
  album: null,
  durationMs: 200_000,
  folder: 'Music',
  fileName: 'a.mp3',
  size: 4_000_000,
  modifiedAt: 1_000,
  ...over,
});

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  useModeStore.setState({ mode: 'online' });
  signOut();
  saved().reset();
  useLibraryStore.setState({ favouriteIds: {}, playlists: [], followingArtistIds: {} } as never);
  useDownloadsStore.setState({ items: {} });
  useLocalMusicStore.setState({ songs: [], hidden: [], scannedAt: null });
  usePlayerStore.setState({ currentTrack: null, queue: [], index: 0, isPlaying: false });
  (NetInfo.useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });
});

describe('Offline playlists store', () => {
  it('MOB-OFPL-001 keeps the playlist list and its songs on the phone, and reads them back', async () => {
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 2, updatedAt: 5 });
    const one = makeTrack({ title: 'One' });
    const two = makeTrack({ title: 'Two' });
    stub('myPlaylistTracks', async () => page([one, two]));

    await start([gym]);
    await waitFor(() => expect(saved().tracks['sonare:gym']).toHaveLength(2));

    expect(saved().userId).toBe('u-alice');
    expect(saved().playlists.map((p) => p.name)).toEqual(['Gym']);
    // It is really in storage, keyed to this user.
    expect(await stored()).toMatchObject({ userId: 'u-alice' });

    // A fresh start by the same user reads it back.
    useOfflinePlaylistsStore.setState({ userId: null, playlists: [], tracks: {} });
    await act(async () => {
      await saved().hydrate();
    });
    expect(saved().playlists.map((p) => p.name)).toEqual(['Gym']);
    expect(saved().tracks['sonare:gym'].map((t) => t.id)).toEqual([one.id, two.id]);
  });

  it('MOB-OFPL-002 signed out, or another user, sees nothing', async () => {
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', updatedAt: 5 });
    stub('myPlaylistTracks', async () => page([makeTrack()]));
    await start([gym]);
    await waitFor(() => expect(saved().playlists).toHaveLength(1));

    signOut();
    expect(saved().playlists).toEqual([]);
    expect(saved().tracks).toEqual({});

    useAuthStore.setState({ status: 'signedIn', user: { ...alice, id: 'u-bob' } } as never);
    expect(saved().userId).toBe('u-bob');
    expect(saved().playlists).toEqual([]);
    expect(saved().tracks).toEqual({});
  });

  it('MOB-OFPL-003 reads a playlist again when its updatedAt moved, one at a time', async () => {
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', updatedAt: 5 });
    const run = makePlaylist({ id: 'sonare:run', name: 'Run', updatedAt: 9 });
    const seen: string[] = [];
    let release = () => {};
    const tracks = stub('myPlaylistTracks', async (id: string) => {
      seen.push(id);
      if (id === 'sonare:gym') await new Promise<void>((resolve) => (release = resolve));
      return page([makeTrack()]);
    });

    await start([gym, run]);
    await waitFor(() => expect(seen).toEqual(['sonare:gym']));
    // The second playlist waits for the first: one at a time.
    expect(seen).toEqual(['sonare:gym']);
    await act(async () => release());
    await waitFor(() => expect(seen).toEqual(['sonare:gym', 'sonare:run']));

    // The same lists again, with the same updatedAt: nothing is read again.
    await act(async () => {
      useLibraryStore.setState({ playlists: [{ ...gym }, { ...run }] });
    });
    await waitFor(() => expect(saved().playlists).toHaveLength(2));
    expect(tracks).toHaveBeenCalledTimes(2);

    // Gym changed on the server: only Gym is read again.
    await act(async () => {
      useLibraryStore.setState({ playlists: [{ ...gym, updatedAt: 6 }, run] });
    });
    await waitFor(() => expect(tracks).toHaveBeenCalledTimes(3));
    expect(tracks).toHaveBeenLastCalledWith('sonare:gym');
  });

  it('MOB-OFPL-004 a playlist that left the list takes its saved songs with it', async () => {
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', updatedAt: 5 });
    const run = makePlaylist({ id: 'sonare:run', name: 'Run', updatedAt: 9 });
    stub('myPlaylistTracks', async () => page([makeTrack()]));

    await start([gym, run]);
    await waitFor(() => expect(Object.keys(saved().tracks).sort()).toEqual(['sonare:gym', 'sonare:run']));

    await act(async () => {
      useLibraryStore.setState({ playlists: [gym] });
    });
    expect(Object.keys(saved().tracks)).toEqual(['sonare:gym']);
    expect((await stored()).tracks['sonare:run']).toBeUndefined();
  });

  it('MOB-OFPL-005 keeps the songs an own playlist screen just loaded', async () => {
    const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 1, updatedAt: 5 });
    const one = makeTrack({ title: 'One' });
    stub('myPlaylist', async () => gym);
    stub('myPlaylistTracks', async () => page([one]));
    await start([gym]);

    route.params = { id: 'sonare:gym' };
    const { findByText } = render(<PlaylistDetailScreen />);
    await findByText('One');

    await waitFor(() => expect(saved().tracks['sonare:gym']?.map((t) => t.id)).toEqual([one.id]));
  });
});

describe('Offline playlists on screen', () => {
  const gym = makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 12, updatedAt: 5 });
  const run = makePlaylist({ id: 'sonare:run', name: 'Run', trackCount: 3, updatedAt: 9 });
  const downloaded = makeTrack({ title: 'On the phone' });
  const streamed = makeTrack({ title: 'Needs the internet' });

  /** Save both playlists, then go offline. */
  const goOffline = async (gymSongs = [downloaded, streamed]) => {
    stub('myPlaylistTracks', async (id: string) =>
      id === 'sonare:gym' ? page(gymSongs) : page([makeTrack({ title: 'Run song' })]),
    );
    await start([gym, run]);
    await waitFor(() => expect(saved().tracks['sonare:gym']).toHaveLength(gymSongs.length));
    useModeStore.setState({ mode: 'offline' });
  };

  it('MOB-OFPL-006 the playlists screen lists the saved playlists with what plays on the phone', async () => {
    await goOffline();
    useDownloadsStore.setState({ items: { [downloaded.id]: makeDownload(downloaded) } });

    const { getByText, getAllByText, getByLabelText, queryByLabelText } = render(<PlaylistsScreen />);

    expect(getByText('1 of 12 songs on this phone')).toBeTruthy();
    // A playlist with nothing on the phone still shows, dimmed.
    expect(getByText('No songs on this phone')).toBeTruthy();
    expect(getByLabelText('Run').props.className).toContain('opacity-60');
    expect(getByLabelText('Gym').props.className).not.toContain('opacity-60');
    // Offline there is nothing to create, rename or delete.
    expect(queryByLabelText('New playlist')).toBeNull();
    expect(queryByLabelText('Options for Gym')).toBeNull();
    expect(getAllByText('Gym').length).toBe(1);
    fireEvent.press(getByLabelText('Gym'));
    expect(nav.navigate).toHaveBeenCalledWith('Playlist', { id: 'sonare:gym' });
  });

  it('MOB-OFPL-007 an own playlist shows only what plays, and says how many need the internet', async () => {
    const alsoStreamed = makeTrack({ title: 'Also needs the internet' });
    await goOffline([downloaded, streamed, alsoStreamed]);
    useDownloadsStore.setState({ items: { [downloaded.id]: makeDownload(downloaded) } });
    route.params = { id: 'sonare:gym' };

    const { findByText, getByText, queryByText } = render(<PlaylistDetailScreen />);

    expect(await findByText('Gym')).toBeTruthy();
    expect(getByText('On the phone')).toBeTruthy();
    expect(queryByText('Needs the internet')).toBeNull();
    expect(queryByText('Also needs the internet')).toBeNull();
    expect(getByText('2 songs need the internet')).toBeTruthy();
    // The header counts what plays here, like its duration, not the 12 the playlist has.
    expect(getByText(/^1 song( ·|$)/)).toBeTruthy();
  });

  it('MOB-OFPL-012 one missing song reads "1 song needs the internet"', async () => {
    await goOffline();
    useDownloadsStore.setState({ items: { [downloaded.id]: makeDownload(downloaded) } });
    route.params = { id: 'sonare:gym' };

    const { findByText } = render(<PlaylistDetailScreen />);
    expect(await findByText('1 song needs the internet')).toBeTruthy();
  });

  it('MOB-OFPL-008 offline an own playlist has no drag handles, remove or Add songs', async () => {
    await goOffline();
    useDownloadsStore.setState({ items: { [downloaded.id]: makeDownload(downloaded) } });
    route.params = { id: 'sonare:gym' };

    const { findByText, queryByLabelText } = render(<PlaylistDetailScreen />);
    await findByText('On the phone');

    expect(queryByLabelText('Reorder On the phone')).toBeNull();
    expect(queryByLabelText('Add songs')).toBeNull();
    expect(queryByLabelText('Playlist options')).toBeNull();
  });

  it('MOB-OFPL-009 playing offline uses the downloaded copy, and the queue skips the rest', async () => {
    await goOffline();
    useDownloadsStore.setState({ items: { [downloaded.id]: makeDownload(downloaded) } });
    route.params = { id: 'sonare:gym' };

    const { findByLabelText } = render(<PlaylistDetailScreen />);
    fireEvent.press(await findByLabelText(`On the phone by ${downloaded.artist}`));

    const player = usePlayerStore.getState();
    expect(player.currentTrack?.id).toBe(downloaded.id);
    expect(player.queue.map((t) => t.id)).toEqual([downloaded.id]);
    // The player finds the file on the phone for this id, so nothing is streamed.
    expect(localUriFor(downloaded.id)).toBe('content://media/' + downloaded.id);
  });

  it('MOB-OFPL-010 a song in a music folder counts and plays too', async () => {
    const onPhone = deviceTrack(song({ fileName: 'b.mp3', title: 'Folder song' }));
    stub('myPlaylistTracks', async () => page([{ ...onPhone, entryId: 'row-1' }]));
    await start([makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 1, updatedAt: 5 })]);
    await waitFor(() => expect(saved().tracks['sonare:gym']).toHaveLength(1));
    useLocalMusicStore.setState({ songs: [song({ fileName: 'b.mp3', title: 'Folder song' })] });
    useModeStore.setState({ mode: 'offline' });

    const { findByText, getByText } = render(<PlaylistsScreen />);
    expect(await findByText('1 of 1 songs on this phone')).toBeTruthy();

    route.params = { id: 'sonare:gym' };
    const detail = render(<PlaylistDetailScreen />);
    fireEvent.press(await detail.findByLabelText('Folder song by Someone'));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(onPhone.id);
    expect(getByText('Gym')).toBeTruthy();
  });

  it('MOB-OFPL-011 an own playlist with nothing on the phone says so', async () => {
    stub('myPlaylistTracks', async () => page([makeTrack({ title: 'Somewhere else' })]));
    await start([makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 1, updatedAt: 5 })]);
    await waitFor(() => expect(saved().tracks['sonare:gym']).toHaveLength(1));
    useModeStore.setState({ mode: 'offline' });
    route.params = { id: 'sonare:gym' };

    const { findByText, queryByText } = render(<PlaylistDetailScreen />);
    expect(await findByText("None of this playlist's songs are on this phone.")).toBeTruthy();
    expect(queryByText('1 song needs the internet')).toBeNull();
  });
});
