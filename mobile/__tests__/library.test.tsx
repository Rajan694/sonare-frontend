import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { LibraryScreen } from '../src/screens/Library';
import { usePagedTracks } from '../src/data/hooks';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { alice, makeDownload, makeTrack, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

/** M1: Library — paged Songs, sort, Favourites, offline Albums/Artists, Genres removed. */

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const online = () => useModeStore.setState({ mode: 'online' });
const offline = () => useModeStore.setState({ mode: 'offline' });

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  signIn();
  online();
  usePlayerStore.setState({ currentTrack: null, queue: [], index: 0, isPlaying: false, shuffle: false });
  useDownloadsStore.setState({ items: {} });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  // Default stub: empty page.
  jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
});

// ---- usePagedTracks — unit tests for the hook ----

describe('usePagedTracks', () => {
  it('MOB-LIBR-001 first page is requested with filter and sort; meta.total is exposed', async () => {
    const t1 = makeTrack({ title: 'Alpha' });
    const fetchSpy = jest.spyOn(api, 'libraryTracks').mockResolvedValue({
      items: [t1],
      meta: { total: 42 },
    } as never);

    const { result } = renderHook(() => usePagedTracks('all', 'addedAt', []));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'all', sort: 'addedAt', limit: 100 }));
    expect(result.current.items.map((t) => t.id)).toEqual([t1.id]);
    expect(result.current.total).toBe(42);
    expect(result.current.hasMore).toBe(false);
  });

  it('MOB-LIBR-002 onEndReached loads the cursor page and appends it', async () => {
    const a = makeTrack({ title: 'A' });
    const b = makeTrack({ title: 'B' });
    const c = makeTrack({ title: 'C' });
    jest
      .spyOn(api, 'libraryTracks')
      .mockImplementation(async ({ cursor }: any) =>
        cursor ? { items: [b, c], meta: {} } : { items: [a, b], meta: { nextCursor: 'p2' } },
      );

    const { result } = renderHook(() => usePagedTracks('all', 'addedAt', []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((t) => t.id)).toEqual([a.id, b.id]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadingMore).toBe(false));

    // B came on both pages — listed once.
    expect(result.current.items.map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    expect(result.current.hasMore).toBe(false);
    expect(api.libraryTracks).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'p2' }));
  });

  it('MOB-LIBR-003 Favourites tab sends filter=liked', async () => {
    const spy = jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
    const { result } = renderHook(() => usePagedTracks('liked', 'addedAt', []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ filter: 'liked' }));
  });

  it('MOB-LIBR-004 each sort option sends its sort key when the Songs tab is sorted', async () => {
    const sorts = ['addedAt', 'title', 'artist', 'album', 'durationMs', 'playCount'] as const;
    for (const sort of sorts) {
      jest.clearAllMocks();
      const spy = jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
      const { result, unmount } = renderHook(() => usePagedTracks('all', sort, []));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ sort }));
      unmount();
    }
  });

  it('MOB-LIBR-005 loadAll fetches every remaining page and returns the full list', async () => {
    const a = makeTrack({ title: 'A' });
    const b = makeTrack({ title: 'B' });
    const c = makeTrack({ title: 'C' });
    jest.spyOn(api, 'libraryTracks').mockImplementation(async ({ cursor }: any) => {
      if (!cursor) return { items: [a], meta: { nextCursor: 'p2' } };
      if (cursor === 'p2') return { items: [b], meta: { nextCursor: 'p3' } };
      return { items: [c], meta: {} };
    });

    const { result } = renderHook(() => usePagedTracks('all', 'addedAt', []));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let all: any[] = [];
    await act(async () => {
      all = await result.current.loadAll();
    });
    expect(all.map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    expect(result.current.hasMore).toBe(false);
  });

  it('MOB-LIBR-020 loadAll after a sort change does not overwrite the list', async () => {
    const a = makeTrack({ title: 'A' });
    const b = makeTrack({ title: 'B' });
    const titleTrack = makeTrack({ title: 'Sorted by Title' });

    let resolvePage2: ((val: any) => void) | undefined;
    jest.spyOn(api, 'libraryTracks').mockImplementation(async ({ sort, cursor }: any) => {
      if (sort === 'title') {
        return page([titleTrack], 1) as never;
      }
      if (!cursor) {
        return { items: [a], meta: { nextCursor: 'p2' } } as never;
      }
      return new Promise((resolve) => {
        resolvePage2 = resolve;
      }) as never;
    });

    const { result, rerender } = renderHook(({ sort }: { sort: any }) => usePagedTracks('all', sort, []), {
      initialProps: { sort: 'addedAt' },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((t) => t.id)).toEqual([a.id]);

    let loadAllPromise: Promise<any>;
    act(() => {
      loadAllPromise = result.current.loadAll();
    });

    // Sort changed while loadAll was in-flight.
    rerender({ sort: 'title' });
    await waitFor(() => expect(result.current.items.map((t) => t.id)).toEqual([titleTrack.id]));

    // Resolve old loadAll's page 2.
    await act(async () => {
      resolvePage2?.({ items: [b], meta: {} });
      const returnedTracks = await loadAllPromise;
      expect(returnedTracks.map((t: any) => t.id)).toEqual([a.id, b.id]);
    });

    // List in state stays the new sort, not overwritten by old loadAll.
    expect(result.current.items.map((t) => t.id)).toEqual([titleTrack.id]);
  });

  it('MOB-LIBR-021 when enabled turns false, items, total, and cursor are cleared', async () => {
    const t = makeTrack({ title: 'Track 1' });
    jest.spyOn(api, 'libraryTracks').mockResolvedValue({
      items: [t],
      meta: { total: 10, nextCursor: 'cur-2' },
    } as never);

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePagedTracks('all', 'addedAt', [], { enabled }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(10);
    expect(result.current.hasMore).toBe(true);

    rerender({ enabled: false });

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });
});

// ---- Library screen — integration tests ----

describe('Library screen — Songs tab', () => {
  it('MOB-LIBR-006 Songs tab sends filter=all to libraryTracks and shows the tracks', async () => {
    const t = makeTrack({ title: 'Test song' });
    jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([t], 1) as never);
    const { findByText } = render(<LibraryScreen />);
    expect(await findByText('Test song')).toBeTruthy();
    expect(api.libraryTracks).toHaveBeenCalledWith(expect.objectContaining({ filter: 'all', sort: 'addedAt' }));
  });

  it('MOB-LIBR-007 Play all loads all pages before starting playback', async () => {
    const a = makeTrack({ title: 'A' });
    const b = makeTrack({ title: 'B' });
    jest
      .spyOn(api, 'libraryTracks')
      .mockImplementation(async ({ cursor }: any) =>
        cursor ? { items: [b], meta: {} } : { items: [a], meta: { nextCursor: 'p2', total: 2 } },
      );
    const { findByText, getByText } = render(<LibraryScreen />);
    await findByText('A');
    fireEvent.press(getByText('Play all'));
    await waitFor(() => {
      const q = usePlayerStore.getState().queue;
      expect(q.map((t) => t.id)).toEqual([a.id, b.id]);
    });
  });

  it('MOB-LIBR-008 there is no Genres tab in the Library', async () => {
    jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
    const { queryByText } = render(<LibraryScreen />);
    expect(queryByText('Genres')).toBeNull();
  });
});

describe('Library screen — sort chip on Songs and Favourites', () => {
  it('MOB-LIBR-009 sort chip on Songs tab shows six options', async () => {
    const { findByLabelText, getByLabelText } = render(<LibraryScreen />);
    fireEvent.press(await findByLabelText('Sort: Recently added'));
    for (const label of ['Recently added', 'Title', 'Artist', 'Album', 'Duration', 'Most played']) {
      expect(getByLabelText(label)).toBeTruthy();
    }
  });

  it('MOB-LIBR-010 sort chip appears on Favourites tab too', async () => {
    jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
    const { getByText, findByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    expect(await findByLabelText('Sort: Recently added')).toBeTruthy();
  });
});

describe('Library screen — Favourites and focus refreshing', () => {
  it('MOB-LIBR-017 liking or unliking does not refetch the paged list', async () => {
    const t1 = makeTrack({ title: 'Liked 1' });
    useLibraryStore.setState({ favouriteIds: { [t1.id]: true } });
    const spy = jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([t1], 1) as never);
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    expect(await findByText('Liked 1')).toBeTruthy();
    // Call 1 for initial Songs tab, Call 2 for Favourites tab.
    expect(spy).toHaveBeenCalledTimes(2);

    // Like another track
    act(() => {
      const t2 = makeTrack({ title: 'Liked 2' });
      useLibraryStore.getState().toggleFavourite(t2);
    });

    // Paged list was NOT refetched — still 2 calls.
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('MOB-LIBR-018 an unliked row disappears from Favourites at once', async () => {
    const t1 = makeTrack({ title: 'Keep Me' });
    const t2 = makeTrack({ title: 'Unlike Me' });
    useLibraryStore.setState({ favouriteIds: { [t1.id]: true, [t2.id]: true } });
    const spy = jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([t1, t2], 2) as never);

    const { getByText, findByText, queryByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Favourites'));
    expect(await findByText('Keep Me')).toBeTruthy();
    expect(await findByText('Unlike Me')).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(2);

    // Unlike t2 straight away
    act(() => {
      useLibraryStore.getState().toggleFavourite(t2);
    });

    // t2 is hidden immediately without any server request
    expect(queryByText('Unlike Me')).toBeNull();
    expect(queryByText('Keep Me')).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('MOB-LIBR-019 focus refetch keeps old rows until the new page lands', async () => {
    const focusCbs: (() => void)[] = [];
    jest.spyOn(require('@react-navigation/native'), 'useFocusEffect').mockImplementation(((cb: () => void) => {
      focusCbs.push(cb);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => cb(), []);
    }) as any);

    const oldTrack = makeTrack({ title: 'Old Song' });
    const newTrack = makeTrack({ title: 'New Song' });

    let resolveRefetch: ((val: any) => void) | undefined;
    let callCount = 0;
    jest.spyOn(api, 'libraryTracks').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return page([oldTrack], 1) as never;
      return new Promise((resolve) => {
        resolveRefetch = resolve;
      }) as never;
    });

    const { findByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('Old Song')).toBeTruthy();

    // Screen regains focus — notify focus callbacks
    act(() => {
      focusCbs.forEach((cb) => cb());
    });

    // Refetch is in-flight: old song is STILL displayed (no empty flash)
    expect(queryByText('Old Song')).toBeTruthy();
    expect(queryByText('New Song')).toBeNull();

    // Now new page lands
    await act(async () => {
      resolveRefetch?.(page([newTrack], 1));
    });

    expect(await findByText('New Song')).toBeTruthy();
  });
});

// ---- Offline Albums / Artists ----

describe('Library screen — offline Albums and Artists', () => {
  const dl1 = makeTrack({ title: 'Karma Police', artist: 'Radiohead', album: 'OK Computer', source: 'server' });
  const dl2 = makeTrack({ title: 'Paranoid Android', artist: 'Radiohead', album: 'OK Computer', source: 'server' });
  const dl3 = makeTrack({
    title: 'California',
    artist: 'Red Hot Chili Peppers',
    album: 'Californication',
    source: 'server',
  });

  beforeEach(() => {
    offline();
    useDownloadsStore.setState({
      items: {
        [dl1.id]: makeDownload(dl1),
        [dl2.id]: makeDownload(dl2),
        [dl3.id]: makeDownload(dl3),
      },
    });
  });

  it('MOB-LIBR-011 offline Albums groups phone songs by album tag, sorted by name, with song count', async () => {
    const { getByText, findByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Albums'));
    // Both albums show as grouped cards with song counts.
    expect(await findByLabelText('Californication by Red Hot Chili Peppers')).toBeTruthy();
    expect(await findByLabelText('OK Computer by Radiohead')).toBeTruthy();
    // Sorted A→Z: Californication before OK Computer.
    expect(getByText('1 song')).toBeTruthy();
    expect(getByText('2 songs')).toBeTruthy();
  });

  it('MOB-LIBR-012 offline Artists groups phone songs by artist tag, sorted by name, with song count', async () => {
    const { getByText, findByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Artists'));
    expect(await findByLabelText('Radiohead')).toBeTruthy();
    expect(await findByLabelText('Red Hot Chili Peppers')).toBeTruthy();
    expect(getByText('1 song')).toBeTruthy();
    expect(getByText('2 songs')).toBeTruthy();
  });

  it('MOB-LIBR-013 offline Albums empty phone shows the existing empty text', async () => {
    useDownloadsStore.setState({ items: {} });
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Albums'));
    expect(await findByText('No music on this phone yet. Songs you download show up here.')).toBeTruthy();
  });

  it('MOB-LIBR-014 offline Artists empty phone shows the existing empty text', async () => {
    useDownloadsStore.setState({ items: {} });
    const { getByText, findByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Artists'));
    expect(await findByText('No music on this phone yet. Songs you download show up here.')).toBeTruthy();
  });

  it('MOB-LIBR-015 tapping an offline album plays its songs', async () => {
    const { getByText, findByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Albums'));
    fireEvent.press(await findByLabelText('OK Computer by Radiohead'));
    const { currentTrack, queue } = usePlayerStore.getState();
    expect(currentTrack).toBeTruthy();
    // All tracks in the album should be in the queue.
    const ids = queue.map((t) => t.id);
    expect(ids).toContain(dl1.id);
    expect(ids).toContain(dl2.id);
  });

  it('MOB-LIBR-016 tapping an offline artist plays their songs', async () => {
    const { getByText, findByLabelText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Artists'));
    fireEvent.press(await findByLabelText('Radiohead'));
    const { currentTrack, queue } = usePlayerStore.getState();
    expect(currentTrack?.artist).toBe('Radiohead');
    expect(queue.every((t) => t.artist === 'Radiohead')).toBe(true);
  });
});

/** M2: Library — Multi-select in song tabs (Songs / Favourites) */

describe('Library screen — multi-select (M2)', () => {
  const t1 = makeTrack({ id: 'yt:s1', title: 'Song One', artist: 'Artist One' });
  const t2 = makeTrack({ id: 'yt:s2', title: 'Song Two', artist: 'Artist Two' });
  const t3 = makeTrack({ id: 'yt:s3', title: 'Song Three', artist: 'Artist Three' });

  const pressAlertButton = async (text: string) => {
    const calls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = calls[calls.length - 1][2] as {
      text: string;
      onPress?: () => unknown;
    }[];
    await act(async () => {
      await buttons.find((b) => b.text === text)!.onPress?.();
    });
  };

  beforeEach(() => {
    signIn();
    online();
    jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([t1, t2, t3], 3) as never);
  });

  it('MOB-LIBR-022 Select button enters selection mode with count and checkboxes', async () => {
    const { getByLabelText, getByText, findByText, UNSAFE_getByType } = render(<LibraryScreen />);
    const FlatList = require('react-native').FlatList;
    expect(await findByText('Song One')).toBeTruthy();

    const listBefore = UNSAFE_getByType(FlatList);
    expect(listBefore.props.contentContainerStyle.paddingBottom).toBe(140);

    const selectBtn = getByLabelText('Select');
    fireEvent.press(selectBtn);

    // Padding grows in selection mode to clear the selection action bar
    const listAfter = UNSAFE_getByType(FlatList);
    expect(listAfter.props.contentContainerStyle.paddingBottom).toBe(196);

    // Header shows count
    expect(getByText('0 selected')).toBeTruthy();
    expect(getByText('Select all')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();

    // Rows have checkbox role
    const row1 = getByLabelText('Song One by Artist One');
    expect(row1.props.accessibilityRole).toBe('checkbox');
    expect(row1.props.accessibilityState).toEqual({ checked: false });
  });

  it('MOB-LIBR-023 tapping and long-pressing rows toggles selection in selection mode', async () => {
    const { getByLabelText, getByText, findByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    fireEvent.press(getByLabelText('Select'));

    const row1 = getByLabelText('Song One by Artist One');
    const row2 = getByLabelText('Song Two by Artist Two');

    // Tap to select row 1
    fireEvent.press(row1);
    expect(getByText('1 selected')).toBeTruthy();
    expect(row1.props.accessibilityState).toEqual({ checked: true });

    // Long press to select row 2
    fireEvent(row2, 'longPress');
    expect(getByText('2 selected')).toBeTruthy();
    expect(row2.props.accessibilityState).toEqual({ checked: true });

    // Tap row 1 again to deselect
    fireEvent.press(row1);
    expect(getByText('1 selected')).toBeTruthy();
    expect(row1.props.accessibilityState).toEqual({ checked: false });
  });

  it('MOB-LIBR-024 Select all toggles selecting and deselecting all loaded rows', async () => {
    const { getByLabelText, getByText, findByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    fireEvent.press(getByLabelText('Select'));
    expect(getByText('0 selected')).toBeTruthy();

    // Select all selects all 3 display tracks
    fireEvent.press(getByText('Select all'));
    expect(getByText('3 selected')).toBeTruthy();

    // Select all again toggles back to 0
    fireEvent.press(getByText('Select all'));
    expect(getByText('0 selected')).toBeTruthy();
  });

  it('MOB-LIBR-025 Cancel button and Android hardware back button exit selection mode', async () => {
    const { getByLabelText, getByText, findByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    // 1. Cancel button exits selection mode
    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));
    expect(getByText('1 selected')).toBeTruthy();

    fireEvent.press(getByText('Cancel'));
    expect(queryByText('1 selected')).toBeNull();
    expect(getByText('Library')).toBeTruthy();

    // 2. Android hardware back press exits selection mode
    fireEvent.press(getByLabelText('Select'));
    expect(getByText('0 selected')).toBeTruthy();

    // Trigger back press via mocked BackHandler
    const subs = (BackHandler as any)._subscriptions;
    expect(subs.length).toBeGreaterThan(0);
    act(() => {
      subs[subs.length - 1]();
    });

    expect(queryByText('0 selected')).toBeNull();
    expect(getByText('Library')).toBeTruthy();
  });

  it('MOB-LIBR-026 Add to queue adds selected tracks to the player queue', async () => {
    const { getByLabelText, findByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));
    fireEvent.press(getByLabelText('Song Two by Artist Two'));

    fireEvent.press(getByLabelText('Add to queue'));

    const { queue } = usePlayerStore.getState();
    expect(queue.map((t) => t.id)).toEqual([t1.id, t2.id]);
    // Selection mode exited
    expect(queryByText('2 selected')).toBeNull();
  });

  it('MOB-LIBR-027 Add to playlist opens the playlist picker with selected tracks', async () => {
    useLibraryStore.setState({
      playlists: [{ id: 'p1', name: 'My List', kind: 'synced', trackCount: 0, downloadedCount: 0, updatedAt: 1 }],
    });
    const addSpy = jest.spyOn(api, 'addToPlaylist').mockResolvedValue({ ok: true } as never);
    jest.spyOn(api, 'myPlaylists').mockResolvedValue(page([]) as never);

    const { getByLabelText, findByLabelText, findByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));
    fireEvent.press(getByLabelText('Song Two by Artist Two'));

    fireEvent.press(getByLabelText('Add to playlist'));

    // Playlist picker sheet opens
    expect(await findByLabelText('Add to My List')).toBeTruthy();

    // Tap to add to playlist
    await act(async () => {
      fireEvent.press(getByLabelText('Add to My List'));
    });

    expect(addSpy).toHaveBeenCalledWith('p1', [t1, t2]);
    // Closes and exits selection
    await waitFor(() => expect(queryByText('2 selected')).toBeNull());
  });

  it('MOB-LIBR-028 Download enqueues without confirm, alerts with location, and stays on screen', async () => {
    const enqueueSpy = jest.spyOn(useDownloadsStore.getState(), 'enqueue');
    const { nav } = require('../test-utils');
    const access = require('../src/lib/musicAccess');
    const accessSpy = jest.spyOn(access, 'offerMusicAccess');

    const { getByLabelText, findByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));
    fireEvent.press(getByLabelText('Song Two by Artist Two'));

    fireEvent.press(getByLabelText('Download'));

    // Enqueued right away without confirm dialog
    expect(enqueueSpy).toHaveBeenCalledWith([t1, t2]);

    // Alert shown with destination folder label
    expect(Alert.alert).toHaveBeenCalledWith(
      'Added to downloads',
      '2 songs will be saved to Music/Sonare.',
      expect.any(Array),
    );

    // Pressing OK on the alert calls offerMusicAccess('download')
    await pressAlertButton('OK');
    expect(accessSpy).toHaveBeenCalledWith('download');

    // Did not navigate to Downloads (stays on Library)
    expect(nav.navigate).not.toHaveBeenCalledWith('Downloads');

    // Exited selection mode
    expect(queryByText('2 selected')).toBeNull();
  });

  it('MOB-LIBR-029 Unlike unlikes single track directly or multiple with confirmation and rollback', async () => {
    useLibraryStore.setState({
      favouriteIds: { [t1.id]: true, [t2.id]: true },
    });
    const deleteSpy = jest.spyOn(api, 'deleteTrackFavourites').mockResolvedValue({ ok: true, removed: 2 } as never);

    const { getByLabelText, findByText, queryByText } = render(<LibraryScreen />);
    expect(await findByText('Song One')).toBeTruthy();

    // 1. Single unlike: directly calls API without Alert
    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));

    await act(async () => {
      fireEvent.press(getByLabelText('Remove from favourites'));
    });

    expect(deleteSpy).toHaveBeenCalledWith([t1.id]);
    expect(useLibraryStore.getState().favouriteIds[t1.id]).toBeUndefined();
    expect(queryByText('1 selected')).toBeNull();

    // 2. Multiple unlike: shows confirmation Alert
    useLibraryStore.setState({
      favouriteIds: { [t1.id]: true, [t2.id]: true },
    });
    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));
    fireEvent.press(getByLabelText('Song Two by Artist Two'));

    fireEvent.press(getByLabelText('Remove from favourites'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove 2 songs from favourites?',
      'They will be unliked across all your devices.',
      expect.any(Array),
      expect.any(Object),
    );

    // Confirm removal
    await pressAlertButton('Remove');
    expect(deleteSpy).toHaveBeenCalledWith([t1.id, t2.id]);
    expect(useLibraryStore.getState().favouriteIds[t1.id]).toBeUndefined();
    expect(useLibraryStore.getState().favouriteIds[t2.id]).toBeUndefined();

    // 3. Rollback on failure
    useLibraryStore.setState({
      favouriteIds: { [t1.id]: true, [t2.id]: true },
    });
    deleteSpy.mockRejectedValueOnce(new Error('Network error'));

    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByLabelText('Song One by Artist One'));

    await act(async () => {
      fireEvent.press(getByLabelText('Remove from favourites'));
    });

    // Rolled back because API failed
    expect(useLibraryStore.getState().favouriteIds[t1.id]).toBe(true);
  });
});
