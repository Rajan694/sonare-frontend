import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, NativeModules, PermissionsAndroid } from 'react-native';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { FoldersScreen } from '../src/screens/Folders';
import { usePhoneTracks, useLocalMusicStore } from '../src/store/localMusic';
import { useDownloadsStore } from '../src/store/downloads';
import { offerMusicAccess, resetMusicAccessOffers } from '../src/lib/musicAccess';
import type { DeviceSong } from '../src/native/SonareLibrary';
import { makeDownload, makeTrack } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const native = NativeModules.SonareLibrary as { scan: jest.Mock };
const permissions = PermissionsAndroid as unknown as { check: jest.Mock; request: jest.Mock };
const alert = Alert.alert as jest.Mock;

const song = (over: Partial<DeviceSong>): DeviceSong => ({
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

/** The handler of the Alert button with that label, from the last Alert shown. */
const pressAlertButton = (label: string) => {
  const buttons = alert.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === label)!.onPress?.();
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useLocalMusicStore.setState({
    permission: 'denied',
    songs: [],
    hidden: [],
    scanning: false,
    scannedAt: null,
    error: null,
  });
  useDownloadsStore.setState({ items: {}, ready: true });
  native.scan.mockReset().mockResolvedValue([]);
  permissions.check.mockReset().mockResolvedValue(false);
  permissions.request.mockReset().mockResolvedValue('denied');
  alert.mockClear();
  resetMusicAccessOffers();
});

describe('Music folders screen', () => {
  it('MOB-FOLD-002 without the permission it explains and asks; allowed, it lists the folders and hides one', async () => {
    native.scan.mockResolvedValue([
      song({ mediaId: '1', folder: 'Music', fileName: 'a.mp3', size: 1_000_000 }),
      song({ mediaId: '2', folder: 'Music', fileName: 'b.mp3', size: 1_000_000 }),
      song({ mediaId: '3', folder: 'Download/Mixes', fileName: 'c.mp3' }),
    ]);
    permissions.request.mockResolvedValue('granted');
    const { getByText, findByText, getByLabelText } = render(<FoldersScreen />);
    expect(getByText('See the music on this phone')).toBeTruthy();
    fireEvent.press(getByText('Allow access'));

    expect(await findByText('Mixes')).toBeTruthy();
    expect(getByText(/^Music · 2 songs/)).toBeTruthy();
    fireEvent(getByLabelText('Show Mixes'), 'valueChange', false);
    expect(useLocalMusicStore.getState().hidden).toEqual(['Download/Mixes']);
  });

  it('MOB-FOLD-003 when Android will not ask again, the button opens the app settings', () => {
    useLocalMusicStore.setState({ permission: 'blocked' });
    const { getByText } = render(<FoldersScreen />);
    fireEvent.press(getByText('Open settings'));
    expect(Linking.openSettings).toHaveBeenCalled();
    expect(permissions.request).not.toHaveBeenCalled();
  });
});

describe('songs on the phone', () => {
  it('MOB-FOLD-004 Offline Mode lists the downloads, then the songs of shown folders', () => {
    const downloaded = makeTrack({ id: 'yt:dl1', title: 'Downloaded' });
    useDownloadsStore.setState({ items: { [downloaded.id]: makeDownload(downloaded) } });
    useLocalMusicStore.setState({
      permission: 'granted',
      songs: [
        song({ mediaId: '1', folder: 'Music', fileName: 'kept.mp3', title: 'Kept' }),
        song({ mediaId: '2', folder: 'Hidden', fileName: 'gone.mp3', title: 'Gone' }),
      ],
      hidden: ['Hidden'],
    });
    const { result } = renderHook(() => usePhoneTracks());
    expect(result.current.map((t) => t.title)).toEqual(['Downloaded', 'Kept']);
    expect(result.current[1]).toMatchObject({ source: 'local' });
  });

  it('MOB-FOLD-005 the offline player offers the permission once; blocked opens settings', async () => {
    offerMusicAccess();
    expect(alert).toHaveBeenCalledTimes(1);
    permissions.request.mockResolvedValue('granted');
    await act(async () => pressAlertButton('Allow'));
    await waitFor(() => expect(useLocalMusicStore.getState().permission).toBe('granted'));
    offerMusicAccess();
    expect(alert).toHaveBeenCalledTimes(1);

    resetMusicAccessOffers();
    useLocalMusicStore.setState({ permission: 'blocked' });
    offerMusicAccess();
    expect(alert).toHaveBeenCalledTimes(2);
    pressAlertButton('Open settings');
    expect(Linking.openSettings).toHaveBeenCalled();
  });
});
