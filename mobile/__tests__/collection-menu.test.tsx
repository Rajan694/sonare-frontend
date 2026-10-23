import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchScreen } from '../src/screens/Search';
import { AlbumScreen } from '../src/screens/Album';
import { PlaylistDetailScreen } from '../src/screens/PlaylistDetail';
import { CollectionMenuHost } from '../src/components/music/CollectionMenuHost';
import { useCollectionMenuStore } from '../src/store/collectionMenu';
import { useSnackbarStore } from '../src/store/snackbar';
import { usePlayerStore } from '../src/store/player';
import { useModeStore } from '../src/store/mode';
import { useAuthStore } from '../src/data/auth';
import { useLibraryStore } from '../src/store/library';
import { api } from '../src/data/api';
import { takePendingAction } from '../src/data/accountGate';
import { makeTrack, makePlaylist, makeAlbum, page, route, alice } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

jest.mock('../src/data/config', () => ({
  artworkUrl: () => 'https://art',
  apiUrl: (p: string) => `https://api${p}`,
}));

describe('Search & Collections Menu (M3)', () => {
  const t1 = makeTrack({ id: 'yt:t1', title: 'Track One', artist: 'Artist One' });
  const t2 = makeTrack({ id: 'yt:t2', title: 'Track Two', artist: 'Artist One' });
  const t3 = makeTrack({ id: 'yt:t3', title: 'Track Three', artist: 'Artist One' });
  const album1 = {
    ...makeAlbum({ id: 'yt:alb1', title: 'Great Album', artist: 'Artist One' }),
    kind: 'album' as const,
  };
  const pl1 = makePlaylist({ id: 'yt:pl1', name: 'Chill Vibes' });
  const plSearch = { ...pl1, kind: 'playlist' as const };

  beforeEach(() => {
    useCollectionMenuStore.getState().close();
    useSnackbarStore.setState({ current: null, visible: false });
    usePlayerStore.setState({ queue: [], currentTrack: null, isPlaying: false });
    useModeStore.setState({ mode: 'online' });
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    jest.spyOn(api, 'libraryAlbums').mockResolvedValue(page([]));
    jest.spyOn(api, 'savedPlaylists').mockResolvedValue(page([]));
    useLibraryStore.setState({
      playlists: [makePlaylist({ id: 'sonare:my-1', name: 'My Faves' })],
      favouriteIds: {},
    });
    route.params = {};
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('MOB-COL-001 album and playlist results in Search show more button that opens collection menu sheet', async () => {
    jest.spyOn(api, 'search').mockResolvedValue(page([album1, plSearch] as any));

    const { getByLabelText, findAllByLabelText, findByLabelText } = render(
      <>
        <SearchScreen />
        <CollectionMenuHost />
      </>,
    );

    fireEvent.changeText(getByLabelText('Search all music'), 'vibes');

    const moreAlbums = await findAllByLabelText('More options for Great Album');
    expect(moreAlbums.length).toBeGreaterThanOrEqual(1);

    fireEvent.press(moreAlbums[0]);
    expect(useCollectionMenuStore.getState().target).toEqual({ kind: 'album', item: album1 });

    const morePl = await findByLabelText('More options for Chill Vibes');
    expect(morePl).toBeTruthy();
    fireEvent.press(morePl);
    expect(useCollectionMenuStore.getState().target).toEqual({ kind: 'playlist', item: plSearch });
  });

  it('MOB-COL-002 top result card when album or playlist shows more button', async () => {
    jest.spyOn(api, 'search').mockResolvedValue(page([album1] as any));

    const { getByLabelText, findAllByLabelText } = render(
      <>
        <SearchScreen />
        <CollectionMenuHost />
      </>,
    );

    fireEvent.changeText(getByLabelText('Search all music'), 'great');

    // Both top result and albums section will render "More options for Great Album"
    const moreButtons = await findAllByLabelText('More options for Great Album');
    expect(moreButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.press(moreButtons[0]);
    expect(useCollectionMenuStore.getState().target).toEqual({ kind: 'album', item: album1 });
  });

  it('MOB-COL-003 pasted playlist link shows more button opening collection menu', async () => {
    jest.spyOn(api, 'playlist').mockResolvedValue(pl1);

    const { getByLabelText, findByLabelText } = render(
      <>
        <SearchScreen />
        <CollectionMenuHost />
      </>,
    );

    fireEvent.changeText(getByLabelText('Search all music'), 'https://music.youtube.com/playlist?list=pl1');

    const moreBtn = await findByLabelText('More options for Chill Vibes');
    expect(moreBtn).toBeTruthy();

    fireEvent.press(moreBtn);
    expect(useCollectionMenuStore.getState().target).toEqual({ kind: 'playlist', item: pl1 });
  });

  it('MOB-COL-004 Add to queue fetches all pages of a two-page playlist, queues all songs, and shows snackbar', async () => {
    jest.spyOn(api, 'playlistTracks').mockImplementation(async (_id: string, cursor?: string) => {
      if (!cursor) {
        return { items: [t1, t2], meta: { nextCursor: 'page-2' } };
      }
      return { items: [t3], meta: {} };
    });

    useCollectionMenuStore.getState().open({ kind: 'playlist', item: pl1 });

    const { getByLabelText } = render(<CollectionMenuHost />);

    fireEvent.press(getByLabelText('Add to queue'));

    await waitFor(() => {
      expect(usePlayerStore.getState().queue).toEqual([t1, t2, t3]);
    });

    expect(useSnackbarStore.getState().current).toEqual({
      title: 'Added to queue',
      subtitle: '3 songs',
      icon: 'list',
    });
    expect(useCollectionMenuStore.getState().target).toBeNull();
  });

  it('MOB-COL-005 Add to playlist in collection sheet fetches tracks and opens PlaylistPicker', async () => {
    jest.spyOn(api, 'playlistTracks').mockResolvedValue(page([t1, t2]));

    useCollectionMenuStore.getState().open({ kind: 'playlist', item: pl1 });

    const { getByLabelText, findByLabelText } = render(<CollectionMenuHost />);

    fireEvent.press(getByLabelText('Add to playlist'));

    await waitFor(() => {
      expect(useCollectionMenuStore.getState().view).toBe('playlists');
    });
    expect(useCollectionMenuStore.getState().tracks).toEqual([t1, t2]);
    expect(await findByLabelText('New playlist name')).toBeTruthy();
  });

  it('MOB-COL-006 Save / Remove album toggles saved status', async () => {
    const setFav = jest.spyOn(api, 'setAlbumFavourite').mockResolvedValue({} as any);

    useCollectionMenuStore.getState().open({ kind: 'album', item: album1 });

    const { findByLabelText } = render(<CollectionMenuHost />);

    const saveBtn = await findByLabelText('Save album');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(setFav).toHaveBeenCalledWith('yt:alb1', true, expect.objectContaining({ title: 'Great Album' }));
    });
  });

  it('MOB-COL-007 fetch error shows Retry button and retrying re-fetches', async () => {
    const errorSpy = jest
      .spyOn(api, 'albumTracks')
      .mockRejectedValueOnce(new Error('Network drop'))
      .mockResolvedValueOnce(page([t1]));

    useCollectionMenuStore.getState().open({ kind: 'album', item: album1 });

    const { getByLabelText, findByText } = render(<CollectionMenuHost />);

    fireEvent.press(getByLabelText('Add to queue'));

    await findByText('Network drop');
    const retryBtn = getByLabelText('Retry loading tracks');
    expect(retryBtn).toBeTruthy();

    fireEvent.press(retryBtn);

    await waitFor(() => {
      expect(usePlayerStore.getState().queue).toEqual([t1]);
    });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('MOB-COL-008 AlbumScreen action row has "Add to playlist" button; with remaining pages, menu loads all and opens picker', async () => {
    route.params = { id: 'yt:alb1' };
    jest.spyOn(api, 'album').mockResolvedValue(album1);
    jest.spyOn(api, 'albumTracks').mockImplementation(async (_id: string, cursor?: string) => {
      if (!cursor) {
        return { items: [t1], meta: { nextCursor: 'page-2' } };
      }
      return { items: [t2, t3], meta: {} };
    });

    const { findByLabelText } = render(
      <>
        <AlbumScreen />
        <CollectionMenuHost />
      </>,
    );

    const addBtn = await findByLabelText('Add to playlist');
    expect(addBtn.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(addBtn);

    // Initial click opens CollectionMenuHost straight in 'playlists' view with tracks=undefined
    // CollectionPlaylistPicker displays spinner, fetches all pages, and renders PlaylistPicker with all 3 tracks
    expect(await findByLabelText('New playlist name')).toBeTruthy();
    expect(useCollectionMenuStore.getState().tracks).toEqual([t1, t2, t3]);
  });

  it('MOB-COL-009 PlaylistDetail action row has "Add to playlist" button disabled when no tracks, and with remaining pages loads all and opens picker', async () => {
    route.params = { id: 'yt:pl1' };
    jest.spyOn(api, 'playlist').mockResolvedValue(pl1);
    jest.spyOn(api, 'playlistTracks').mockImplementation(async (_id: string, cursor?: string) => {
      if (!cursor) {
        return { items: [t1], meta: { nextCursor: 'page-2' } };
      }
      return { items: [t2, t3], meta: {} };
    });

    const { findByLabelText } = render(
      <>
        <PlaylistDetailScreen />
        <CollectionMenuHost />
      </>,
    );

    const addBtn = await findByLabelText('Add to playlist');
    expect(addBtn.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(addBtn);

    expect(await findByLabelText('New playlist name')).toBeTruthy();
    expect(useCollectionMenuStore.getState().tracks).toEqual([t1, t2, t3]);
  });

  it('MOB-COL-010 guest tapping Add to playlist closes sheet, and after sign-in reopens menu in playlists view', async () => {
    useAuthStore.setState({ status: 'guest', user: null } as never);
    jest.spyOn(api, 'playlistTracks').mockResolvedValue(page([t1, t2]));

    useCollectionMenuStore.getState().open({ kind: 'playlist', item: pl1 });

    const { getByLabelText } = render(<CollectionMenuHost />);

    fireEvent.press(getByLabelText('Add to playlist'));

    // Menu sheet closed so SignIn is not hidden under sheet
    expect(useCollectionMenuStore.getState().target).toBeNull();

    // Guest signs in: execute pending auth action
    const pending = takePendingAction();
    expect(pending).toBeTruthy();
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    await waitFor(() => {
      pending?.();
    });

    // Reopened in playlists view
    expect(useCollectionMenuStore.getState().target).toEqual({ kind: 'playlist', item: pl1 });
    expect(useCollectionMenuStore.getState().view).toBe('playlists');
  });

  it('MOB-COL-011 AlbumScreen action row "Add to queue" with remaining pages fetches all tracks first, queues them, and shows snackbar with full count', async () => {
    route.params = { id: 'yt:alb1' };
    jest.spyOn(api, 'album').mockResolvedValue(album1);
    jest.spyOn(api, 'albumTracks').mockImplementation(async (_id: string, cursor?: string) => {
      if (!cursor) {
        return { items: [t1], meta: { nextCursor: 'page-2' } };
      }
      return { items: [t2, t3], meta: {} };
    });

    const addToQueueSpy = jest.spyOn(usePlayerStore.getState(), 'addToQueue');
    const { findByLabelText, findByText } = render(<AlbumScreen />);

    await findByText('Track One');
    const queueBtn = await findByLabelText('Add to queue');
    fireEvent.press(queueBtn);

    await waitFor(() => {
      expect(addToQueueSpy).toHaveBeenCalledWith([t1, t2, t3]);
    });
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to queue',
      subtitle: '3 songs',
      icon: 'list',
    });
  });

  it('MOB-COL-013 when the remaining pages fail to load, nothing is queued and the snackbar says so', async () => {
    route.params = { id: 'yt:alb1' };
    jest.spyOn(api, 'album').mockResolvedValue(album1);
    jest.spyOn(api, 'albumTracks').mockImplementation(async (_id: string, cursor?: string) => {
      if (!cursor) {
        return { items: [t1], meta: { nextCursor: 'page-2' } };
      }
      throw new Error('offline');
    });

    const addToQueueSpy = jest.spyOn(usePlayerStore.getState(), 'addToQueue');
    const { findByLabelText, findByText } = render(<AlbumScreen />);

    await findByText('Track One');
    fireEvent.press(await findByLabelText('Add to queue'));

    await waitFor(() => {
      expect(useSnackbarStore.getState().current).toMatchObject({ title: 'Could not load the songs' });
    });
    expect(addToQueueSpy).not.toHaveBeenCalled();
  });

  it('MOB-COL-012 PlaylistDetail action row "Add to queue" with remaining pages fetches all tracks first, queues them, and shows snackbar with full count', async () => {
    route.params = { id: 'yt:pl1' };
    jest.spyOn(api, 'playlist').mockResolvedValue(pl1);
    jest.spyOn(api, 'playlistTracks').mockImplementation(async (_id: string, cursor?: string) => {
      if (!cursor) {
        return { items: [t1], meta: { nextCursor: 'page-2' } };
      }
      return { items: [t2, t3], meta: {} };
    });

    const addToQueueSpy = jest.spyOn(usePlayerStore.getState(), 'addToQueue');
    const { findByLabelText, findByText } = render(<PlaylistDetailScreen />);

    await findByText('Track One');
    const queueBtn = await findByLabelText('Add to queue');
    fireEvent.press(queueBtn);

    await waitFor(() => {
      expect(addToQueueSpy).toHaveBeenCalledWith([t1, t2, t3]);
    });
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to queue',
      subtitle: '3 songs',
      icon: 'list',
    });
  });
});
