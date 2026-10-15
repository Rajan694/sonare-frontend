import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { SearchScreen } from '../src/screens/Search';
import { AlbumScreen } from '../src/screens/Album';
import { PlaylistDetailScreen } from '../src/screens/PlaylistDetail';
import { usePagedList } from '../src/hooks/usePagedList';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useRecentSearchesStore } from '../src/store/recentSearches';
import * as NetInfo from '@react-native-community/netinfo';
import { makeAlbum, makeDownload, makePlaylist, makeTrack, page, route } from '../test-utils';
import type { Page, Track } from '../src/data/types';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

/** Stub an api method for this test. */
const stub = <K extends keyof typeof api>(name: K, impl: (...args: any[]) => any) =>
  jest.spyOn(api, name).mockImplementation(impl as never);

const searchCalls = (search: { mock: { calls: any[][] } }) => search.mock.calls;

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  useModeStore.setState({ mode: 'online' });
  useAuthStore.setState({ status: 'guest', user: null } as never);
  usePlayerStore.setState({ currentTrack: null, queue: [], index: 0, isPlaying: false, shuffle: false });
  useDownloadsStore.setState({ items: {} });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [], followingArtistIds: {} } as never);
  useRecentSearchesStore.setState({ searches: [] });
  (NetInfo.useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });
  stub('genres', async () => []);
  stub('suggestions', async () => []);
});

describe('usePagedList', () => {
  it('MOB-PAGE-001 loads the first page, then loadMore appends the next and drops ids already listed', async () => {
    const a = makeTrack({ title: 'Alpha' });
    const b = makeTrack({ title: 'Beta' });
    const c = makeTrack({ title: 'Gamma' });
    const fetchPage = jest.fn(async (cursor?: string): Promise<Page<Track>> =>
      cursor ? { items: [b, c], meta: {} } : { items: [a, b], meta: { nextCursor: 'c2' } },
    );
    const { result } = renderHook(() => usePagedList<Track>(fetchPage, []));

    await waitFor(() => expect(result.current.loading).toBe(false));
    // The first page is asked for with no cursor.
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage.mock.calls[0]).toEqual([]);
    expect(result.current.items.map((t) => t.id)).toEqual([a.id, b.id]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadingMore).toBe(false));

    expect(fetchPage).toHaveBeenLastCalledWith('c2');
    // Beta came again on the second page: it is listed once.
    expect(result.current.items.map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    // The last page carried no cursor, so there is nothing more to ask for.
    expect(result.current.hasMore).toBe(false);
  });

  it('MOB-PAGE-002 a reply for older deps is dropped', async () => {
    const old = makeTrack({ title: 'Old' });
    const fresh = makeTrack({ title: 'Fresh' });
    let resolveOld: (value: Page<Track>) => void = () => {};
    const slow = new Promise<Page<Track>>((resolve) => {
      resolveOld = resolve;
    });
    const first = jest.fn(() => slow);
    const second = jest.fn(async () => page([fresh]));
    const { result, rerender } = renderHook(
      ({ fetchPage, dep }: { fetchPage: (cursor?: string) => Promise<Page<Track>>; dep: string }) =>
        usePagedList<Track>(fetchPage, [dep]),
      { initialProps: { fetchPage: first, dep: 'one' } },
    );

    rerender({ fetchPage: second, dep: 'two' });
    await waitFor(() => expect(second).toHaveBeenCalled());
    await waitFor(() => expect(result.current.items.map((t) => t.id)).toEqual([fresh.id]));

    await act(async () => resolveOld(page([old])));
    // The slow answer belongs to the query that was replaced.
    expect(result.current.items.map((t) => t.id)).toEqual([fresh.id]);
    expect(result.current.loading).toBe(false);
  });

  it('MOB-PAGE-003 a failed loadMore is reported, keeps the songs loaded, and can be retried', async () => {
    const a = makeTrack({ title: 'Alpha' });
    const b = makeTrack({ title: 'Beta' });
    let fail = true;
    const fetchPage = jest.fn(async (cursor?: string): Promise<Page<Track>> => {
      if (!cursor) return { items: [a], meta: { nextCursor: 'c2' } };
      if (fail) throw new Error('Network request failed');
      return page([b]);
    });
    const { result } = renderHook(() => usePagedList<Track>(fetchPage, []));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadMoreError?.message).toBe('Network request failed'));
    expect(result.current.items.map((t) => t.id)).toEqual([a.id]);
    expect(result.current.hasMore).toBe(true);

    fail = false;
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items.map((t) => t.id)).toEqual([a.id, b.id]));
    expect(result.current.loadMoreError).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });
});

describe('Search paging', () => {
  const searchField = 'Search all music';

  it('MOB-PAGE-004 a chip list shows Load more and appends the next page', async () => {
    const a = makeTrack({ title: 'Alpha' });
    const b = makeTrack({ title: 'Beta' });
    const search = stub('search', async (_q: string, _type: string, cursor?: string) =>
      cursor ? page([{ ...b, kind: 'track' }]) : { items: [{ ...a, kind: 'track' }], meta: { nextCursor: 'c2' } },
    );
    const { getByLabelText, getAllByText, queryByText, findByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText(searchField), 'song');
    expect(await findByText('Top result')).toBeTruthy();
    // All keeps its short sections: nothing to ask for more.
    expect(queryByText('Load more')).toBeNull();

    fireEvent.press(getByLabelText('Songs'));
    fireEvent.press(await findByText('Load more'));

    expect(await findByText('Beta')).toBeTruthy();
    expect(search).toHaveBeenLastCalledWith('song', 'songs', 'c2');
    // That page was the last one.
    await waitFor(() => expect(queryByText('Load more')).toBeNull());
    expect(getAllByText('Alpha').length).toBeGreaterThan(0);
  });

  it('MOB-PAGE-005 the All view keeps five songs and no Load more', async () => {
    const tracks = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'].map((title) => makeTrack({ title }));
    stub('search', async () => ({ items: tracks.map((t) => ({ ...t, kind: 'track' })), meta: { nextCursor: 'c2' } }));
    const { getByLabelText, getByText, queryByText, findByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText(searchField), 'six');

    expect(await findByText(/· 6 results/)).toBeTruthy();
    expect(getByText('Echo')).toBeTruthy();
    // The sixth song of the page is not drawn, and there is no button to ask for more.
    expect(queryByText('Foxtrot')).toBeNull();
    expect(queryByText('Load more')).toBeNull();
  });

  it('MOB-PAGE-006 a new query starts again from page 1', async () => {
    const a = makeTrack({ title: 'Alpha' });
    const b = makeTrack({ title: 'Beta' });
    const search = stub('search', async (_q: string, _type: string, cursor?: string) =>
      cursor ? page([{ ...b, kind: 'track' }]) : { items: [{ ...a, kind: 'track' }], meta: { nextCursor: 'c2' } },
    );
    const { getByLabelText, getAllByText, queryByText, findByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText(searchField), 'first');
    fireEvent.press(getByLabelText('Songs'));
    fireEvent.press(await findByText('Load more'));
    expect(await findByText('Beta')).toBeTruthy();

    fireEvent.changeText(getByLabelText(searchField), 'second');

    await waitFor(() => expect(search).toHaveBeenLastCalledWith('second', 'songs', undefined));
    await waitFor(() => expect(queryByText('Beta')).toBeNull());
    expect(getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(searchCalls(search).filter((c) => c[0] === 'second').length).toBe(1);
  });

  it('MOB-PAGE-007 a failed Load more says so, and Try again loads the page', async () => {
    const a = makeTrack({ title: 'Alpha' });
    const b = makeTrack({ title: 'Beta' });
    let fail = true;
    stub('search', async (_q: string, _type: string, cursor?: string) => {
      if (!cursor) return { items: [{ ...a, kind: 'track' }], meta: { nextCursor: 'c2' } };
      if (fail) throw new Error('Network request failed');
      return page([{ ...b, kind: 'track' }]);
    });
    const { getByLabelText, getAllByText, findByText } = render(<SearchScreen />);
    fireEvent.changeText(getByLabelText(searchField), 'song');
    fireEvent.press(getByLabelText('Songs'));
    fireEvent.press(await findByText('Load more'));

    expect(await findByText("Couldn't load more · Try again")).toBeTruthy();
    // The songs already loaded stay.
    expect(getAllByText('Alpha').length).toBeGreaterThan(0);

    fail = false;
    fireEvent.press(getByLabelText("Couldn't load more · Try again"));
    expect(await findByText('Beta')).toBeTruthy();
  });

  it('MOB-PAGE-010 offline search has no Load more and never asks the server', async () => {
    useModeStore.setState({ mode: 'offline' });
    const song = makeTrack({ title: 'Paranoid Android', artist: 'Radiohead' });
    useDownloadsStore.setState({ items: { [song.id]: makeDownload(song) } });
    const search = jest.spyOn(api, 'search');
    const { getByLabelText, findByLabelText, queryByText } = render(<SearchScreen />);

    fireEvent.changeText(getByLabelText('Search music on this device'), 'paranoid');
    expect(await findByLabelText('Paranoid Android by Radiohead')).toBeTruthy();
    expect(queryByText('Load more')).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });
});

describe('Album and playlist paging', () => {
  it('MOB-PAGE-008 the album list loads the next page, and Play uses every loaded song', async () => {
    route.params = { id: 'yt:inr' };
    const one = makeTrack({ title: 'One' });
    const two = makeTrack({ title: 'Two' });
    const three = makeTrack({ title: 'Three' });
    stub('album', async () => makeAlbum({ id: 'yt:inr', title: 'In Rainbows', trackCount: 3 }));
    const albumTracks = stub('albumTracks', async (_id: string, cursor?: string) =>
      cursor ? page([three]) : { items: [one, two], meta: { nextCursor: 'c2' } },
    );
    const { findByText, getByLabelText, queryByText } = render(<AlbumScreen />);

    await findByText('One');
    expect(queryByText('Three')).toBeNull();
    fireEvent.press(getByLabelText('Load more'));
    expect(await findByText('Three')).toBeTruthy();
    expect(albumTracks).toHaveBeenLastCalledWith('yt:inr', 'c2');

    fireEvent.press(getByLabelText('Play album'));
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([one.id, two.id, three.id]);
  });

  it('MOB-PAGE-009 a YouTube playlist loads the next page under the songs', async () => {
    route.params = { id: 'yt:pl1' };
    const one = makeTrack({ title: 'One' });
    const two = makeTrack({ title: 'Two' });
    stub('playlist', async () => makePlaylist({ id: 'yt:pl1', name: 'Mix' }));
    const playlistTracks = stub('playlistTracks', async (_id: string, cursor?: string) =>
      cursor ? page([two]) : { items: [one], meta: { nextCursor: 'c2' } },
    );
    const { findByText, getByLabelText, queryByText } = render(<PlaylistDetailScreen />);

    await findByText('One');
    expect(queryByText('Two')).toBeNull();
    fireEvent.press(getByLabelText('Load more'));
    expect(await findByText('Two')).toBeTruthy();
    expect(playlistTracks).toHaveBeenCalledWith('yt:pl1', undefined);
    expect(playlistTracks).toHaveBeenLastCalledWith('yt:pl1', 'c2');
  });

  it('MOB-PAGE-011 a YouTube playlist that fails to load says why, and Try again loads it', async () => {
    route.params = { id: 'yt:pl1' };
    stub('playlist', async () => makePlaylist({ id: 'yt:pl1', name: 'Mix' }));
    let fail = true;
    stub('playlistTracks', async () => {
      if (fail) throw new Error('Network request failed');
      return page([makeTrack({ title: 'One' })]);
    });
    const { findByText, getByText } = render(<PlaylistDetailScreen />);

    expect(await findByText("Can't reach the Sonare server.")).toBeTruthy();
    fail = false;
    fireEvent.press(getByText('Try again'));
    expect(await findByText('One')).toBeTruthy();
  });

  it('MOB-PAGE-012 a YouTube playlist shows a spinner while its first page is on the way', async () => {
    route.params = { id: 'yt:pl1' };
    stub('playlist', async () => makePlaylist({ id: 'yt:pl1', name: 'Mix' }));
    let release = () => {};
    stub(
      'playlistTracks',
      () =>
        new Promise((resolve) => {
          release = () => resolve(page([makeTrack({ title: 'One' })]));
        }),
    );
    const { findByText, queryByText } = render(<PlaylistDetailScreen />);

    // Nothing loaded yet, so it is loading, not empty.
    expect(queryByText('No playable songs in this playlist.')).toBeNull();
    await act(async () => release());
    expect(await findByText('One')).toBeTruthy();
  });
});
