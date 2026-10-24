import React from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { render } from '@testing-library/react-native';
import { NowPlayingScreen } from '../src/screens/NowPlaying';
import { Artwork } from '../src/components/music/Artwork';
import { Sheet } from '../src/components/ui/Sheet';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { makeTrack, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const setWindow = (width: number, height: number) =>
  (useWindowDimensions as jest.Mock).mockReturnValue({ width, height, scale: 2, fontScale: 1 });

const song = makeTrack({ title: 'Nude', artist: 'Radiohead', album: 'In Rainbows' });

beforeEach(() => {
  jest.restoreAllMocks();
  route.params = {};
  useAuthStore.setState({ status: 'guest', user: null } as never);
  useModeStore.setState({ mode: 'online' });
  usePlayerStore.setState({
    currentTrack: song,
    queue: [song],
    index: 0,
    isPlaying: true,
    positionMs: 0,
    durationMs: 200_000,
  });
  useDownloadsStore.setState({ items: {}, ready: true });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  jest.spyOn(api, 'peaks').mockResolvedValue({ peaks: [1, 2, 3] } as never);
  jest.spyOn(api, 'lyrics').mockResolvedValue({ synced: false, lines: [], offsetMs: 0 } as never);
});

afterEach(() => setWindow(412, 915));

/** The size the Now Playing cover is drawn at (the big one, not the Up next rows). */
const coverSize = (view: ReturnType<typeof render>) =>
  Math.max(...view.UNSAFE_getAllByType(Artwork).map((a) => a.props.size as number));

describe('the player turned sideways', () => {
  it('MOB-LAND-004 Now Playing puts a smaller cover beside the controls when the phone is sideways', () => {
    setWindow(844, 390);
    const wide = render(<NowPlayingScreen />);
    // The largest design size under min(390 - 140, 844 * 0.4) = 250.
    expect(coverSize(wide)).toBe(240);
    expect(wide.getByText('Nude')).toBeTruthy();
    expect(wide.getByLabelText('Pause')).toBeTruthy();
    wide.unmount();

    setWindow(390, 844);
    expect(coverSize(render(<NowPlayingScreen />))).toBe(314);
  });

  it('MOB-LAND-005 a sheet is never taller than 90% of the window, also after turning the phone', () => {
    const panelMaxHeight = (view: ReturnType<typeof render>) => {
      // Walk up from the content to the panel that carries the height limit.
      for (let node = view.getByText('Sheet body').parent; node; node = node.parent) {
        const style = [node.props.style].flat(3).find((s) => s && typeof s === 'object' && 'maxHeight' in s);
        if (style) return style.maxHeight;
      }
      return undefined;
    };
    setWindow(844, 390);
    const sideways = render(
      <Sheet visible onClose={() => {}}>
        <Text>Sheet body</Text>
      </Sheet>,
    );
    expect(panelMaxHeight(sideways)).toBeCloseTo(351);
    sideways.unmount();

    setWindow(390, 844);
    const upright = render(
      <Sheet visible onClose={() => {}}>
        <Text>Sheet body</Text>
      </Sheet>,
    );
    expect(panelMaxHeight(upright)).toBeCloseTo(759.6);
  });
});
