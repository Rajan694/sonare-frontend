import React from 'react';
import { NativeModules } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { NowPlayingScreen } from '../src/screens/NowPlaying';
import { QueueScreen } from '../src/screens/Queue';
import { usePlayerStore } from '../src/store/player';
import { useModeStore } from '../src/store/mode';
import { useDeviceArtStore } from '../src/store/deviceArt';
import { useLocalMusicStore, deviceTrack } from '../src/store/localMusic';
import { makeTrack } from '../test-utils';
import type { DeviceSong } from '../src/native/SonareLibrary';
import { act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const native = NativeModules.SonareLibrary as {
  artworkFor: jest.Mock;
};

const makeDeviceSong = (mediaId: string): DeviceSong => ({
  mediaId,
  uri: `content://media/external/audio/media/${mediaId}`,
  title: `Track ${mediaId}`,
  artist: 'Artist',
  album: 'Album',
  durationMs: 180_000,
  folder: 'Music',
  fileName: `song_${mediaId}.mp3`,
  size: 3_000_000,
  modifiedAt: 1_000,
});

describe('queue history and up next', () => {
  beforeEach(() => {
    useDeviceArtStore.getState().clear();
    native.artworkFor.mockReset().mockResolvedValue({});
    useModeStore.setState({ mode: 'online' });
  });

  it('MOB-QH-001 up next shows 10 of a 15-entry queue and the right ones', () => {
    const queue = Array.from({ length: 15 }, (_, i) =>
      makeTrack({ id: `track-${i}`, title: `Song ${i}`, artist: `Artist ${i}` }),
    );
    usePlayerStore.setState({
      currentTrack: queue[0],
      queue,
      index: 0,
      isPlaying: true,
      positionMs: 0,
      durationMs: 180_000,
    });

    const { getByText, queryByText } = render(<NowPlayingScreen />);

    expect(getByText('Up next')).toBeTruthy();
    for (let i = 1; i <= 10; i++) {
      expect(getByText(`Song ${i}`)).toBeTruthy();
    }
    for (let i = 11; i < 15; i++) {
      expect(queryByText(`Song ${i}`)).toBeNull();
    }
  });

  it('MOB-QH-002 up next shows 3 when only 3 follow', () => {
    const queue = Array.from({ length: 4 }, (_, i) =>
      makeTrack({ id: `track-${i}`, title: `Track ${i}`, artist: `Artist ${i}` }),
    );
    usePlayerStore.setState({
      currentTrack: queue[0],
      queue,
      index: 0,
      isPlaying: true,
      positionMs: 0,
      durationMs: 180_000,
    });

    const { getByText, queryByText } = render(<NowPlayingScreen />);

    expect(getByText('Track 1')).toBeTruthy();
    expect(getByText('Track 2')).toBeTruthy();
    expect(getByText('Track 3')).toBeTruthy();
    expect(queryByText('Track 4')).toBeNull();
  });

  it('MOB-QH-003 Queue screen shows exactly the 2 before the current one in order', () => {
    const queue = Array.from({ length: 5 }, (_, i) =>
      makeTrack({ id: `track-${i}`, title: `History ${i}`, artist: `Artist ${i}` }),
    );
    usePlayerStore.setState({
      currentTrack: queue[3],
      queue,
      index: 3,
      isPlaying: true,
      positionMs: 0,
      durationMs: 180_000,
    });

    const { getByText, queryByText } = render(<QueueScreen />);

    expect(getByText('Played')).toBeTruthy();
    expect(getByText('History 1')).toBeTruthy();
    expect(getByText('History 2')).toBeTruthy();
    expect(queryByText('History 0')).toBeNull();
  });

  it('MOB-QH-004 Queue screen shows 1 played song at index 1 and none at index 0', () => {
    const queue = Array.from({ length: 4 }, (_, i) =>
      makeTrack({ id: `track-${i}`, title: `Song ${i}`, artist: `Artist ${i}` }),
    );

    // At index 1: exactly 1 played song (Song 0)
    usePlayerStore.setState({
      currentTrack: queue[1],
      queue,
      index: 1,
      isPlaying: true,
      positionMs: 0,
      durationMs: 180_000,
    });
    const { getByText, queryByText, rerender } = render(<QueueScreen />);
    expect(getByText('Played')).toBeTruthy();
    expect(getByText('Song 0')).toBeTruthy();
    expect(queryByText('Song 2')).toBeTruthy(); // in upcoming

    // At index 0: no played songs, label hidden
    act(() => {
      usePlayerStore.setState({
        currentTrack: queue[0],
        queue,
        index: 0,
      });
    });
    rerender(<QueueScreen />);
    expect(queryByText('Played')).toBeNull();
  });

  it('MOB-QH-005 tapping a played row plays that queue index', () => {
    const queue = Array.from({ length: 4 }, (_, i) =>
      makeTrack({ id: `track-${i}`, title: `Entry ${i}`, artist: `Artist ${i}` }),
    );
    usePlayerStore.setState({
      currentTrack: queue[2],
      queue,
      index: 2,
      isPlaying: true,
      positionMs: 0,
      durationMs: 180_000,
    });

    const { getByLabelText } = render(<QueueScreen />);
    const playedItem = getByLabelText(`Entry 0 by Artist 0`);
    fireEvent.press(playedItem);

    expect(usePlayerStore.getState().index).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe('track-0');
  });

  it('MOB-QH-006 up-next rows use device cover for a local: song', async () => {
    jest.useFakeTimers();
    try {
      const devSong = makeDeviceSong('88');
      useLocalMusicStore.setState({ songs: [devSong] });
      const localTrack = deviceTrack(devSong);
      const current = makeTrack({ id: 'srv:1', title: 'Current Song' });
      const queue = [current, localTrack];

      native.artworkFor.mockResolvedValue({ '88': 'file:///covers/88.jpg' });

      usePlayerStore.setState({
        currentTrack: current,
        queue,
        index: 0,
        isPlaying: true,
        positionMs: 0,
        durationMs: 180_000,
      });

      const { getByLabelText } = render(<NowPlayingScreen />);
      const upNextBtn = getByLabelText(`Play ${localTrack.title} by ${localTrack.artist}`);
      expect(upNextBtn).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const artwork = upNextBtn.findByProps({ size: 40 });
      expect(artwork.props.uri).toBe('file:///covers/88.jpg');
      expect(native.artworkFor).toHaveBeenCalledWith(['88']);
    } finally {
      jest.useRealTimers();
    }
  });
});
