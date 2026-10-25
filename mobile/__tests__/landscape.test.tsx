import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { fireEvent, render, renderHook } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGrid } from '../src/hooks/useGrid';
import { LibraryScreen } from '../src/screens/Library';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useLocalMusicStore } from '../src/store/localMusic';
import { alice, makeTrack, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const setWindow = (width: number, height: number) =>
  (useWindowDimensions as jest.Mock).mockReturnValue({ width, height, scale: 2, fontScale: 1 });

/** The FlatLists rendered, with the props the screen gave them. */
const lists = (view: ReturnType<typeof render>) => view.UNSAFE_getAllByType(FlatList as never).map((l) => l.props);

beforeEach(() => {
  jest.restoreAllMocks();
  route.params = {};
  useAuthStore.setState({ status: 'signedIn', user: alice } as never);
  useModeStore.setState({ mode: 'online' });
  usePlayerStore.setState({ currentTrack: null, queue: [], isPlaying: false, shuffle: false });
  useDownloadsStore.setState({ items: {} });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useLocalMusicStore.setState({ songs: [], hidden: [] });
});

afterEach(() => setWindow(412, 915));

describe('phones turned sideways', () => {
  it('MOB-LAND-001 useGrid keeps 2 album / 3 artist columns on phones and fits more sideways', () => {
    const grid = (width: number, height: number, minCell: number, gap: number) => {
      setWindow(width, height);
      return renderHook(() => useGrid(minCell, gap)).result.current;
    };
    for (const [w, h] of [
      [360, 800],
      [390, 844],
    ]) {
      expect(grid(w, h, 150, 12).columns).toBe(2);
      expect(grid(w, h, 96, 8).columns).toBe(3);
    }
    const albums = grid(844, 390, 150, 12);
    const artists = grid(844, 390, 96, 8);
    expect([albums.columns, artists.columns]).toEqual([5, 7]);
    // The cells and the gaps between them fill the width inside the 24 px of padding.
    expect(albums.cell.width * 5 + 12 * 4).toBeCloseTo(844 - 24);
    expect(artists.cell.width * 7 + 8 * 6).toBeCloseTo(844 - 24);
  });

  it('MOB-LAND-006 the grid leaves out the camera cutout the screen pads by, so no card is cut off', () => {
    // The shared inset mock: a 48 px cutout on the left of a phone turned sideways.
    const insets = useSafeAreaInsets() as { left: number; right: number };
    insets.left = 48;
    try {
      setWindow(844, 390);
      const albums = renderHook(() => useGrid(150, 12)).result.current;
      expect(albums.columns).toBe(4);
      expect(albums.cell.width * 4 + 12 * 3).toBeCloseTo(844 - 48 - 24);
    } finally {
      insets.left = 0;
    }
  });

  it('MOB-LAND-002 the Songs grid gets 5 columns sideways while the list view stays one column', async () => {
    setWindow(844, 390);
    jest
      .spyOn(api, 'libraryTracks')
      .mockResolvedValue(page([makeTrack({ title: 'A' }), makeTrack({ title: 'B' })]) as never);
    const view = render(<LibraryScreen />);
    await view.findByText('A');
    expect(lists(view).some((l) => l.numColumns === 1)).toBe(true);
    expect(lists(view).some((l) => l.numColumns === 5)).toBe(false);

    fireEvent.press(view.getByLabelText('Grid view'));
    expect(lists(view).some((l) => l.numColumns === 5)).toBe(true);
  });

  it('MOB-LAND-003 the offline Albums grid follows the window width', () => {
    useModeStore.setState({ mode: 'offline' });
    const songs = ['X', 'Y', 'Z'].map((album, i) => ({
      mediaId: String(i),
      uri: `content://media/${i}`,
      title: `Song ${i}`,
      artist: 'Artist',
      album,
      durationMs: 1000,
      folder: 'Music',
      fileName: `${i}.mp3`,
      size: 1,
      modifiedAt: i,
    }));
    useLocalMusicStore.setState({ songs, hidden: [] });
    setWindow(844, 390);
    const wide = render(<LibraryScreen />);
    fireEvent.press(wide.getByText('Albums'));
    expect(lists(wide).map((l) => l.numColumns)).toContain(5);
    wide.unmount();

    setWindow(390, 844);
    const narrow = render(<LibraryScreen />);
    fireEvent.press(narrow.getByText('Albums'));
    expect(lists(narrow).map((l) => l.numColumns)).toContain(2);
  });
});
