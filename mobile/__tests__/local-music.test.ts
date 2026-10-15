import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid } from 'react-native';
import { deviceTracks, deviceUriFor, musicFolders, useLocalMusicStore } from '../src/store/localMusic';
import { downloadName, idInFileName, useDownloadsStore } from '../src/store/downloads';
import type { DeviceSong } from '../src/native/SonareLibrary';

const native = NativeModules.SonareLibrary as { scan: jest.Mock };
const permissions = PermissionsAndroid as unknown as { check: jest.Mock; request: jest.Mock };

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

beforeEach(async () => {
  await AsyncStorage.clear();
  useLocalMusicStore.setState({
    permission: 'unknown',
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
});

describe('music on the phone', () => {
  it('MOB-LOCAL-001 without the music permission nothing is read; allowing it scans', async () => {
    await useLocalMusicStore.getState().hydrate();
    expect(native.scan).not.toHaveBeenCalled();
    expect(useLocalMusicStore.getState().permission).toBe('denied');

    native.scan.mockResolvedValue([song({})]);
    permissions.request.mockResolvedValue('granted');
    await expect(useLocalMusicStore.getState().requestAccess()).resolves.toBe('granted');
    expect(useLocalMusicStore.getState().songs).toHaveLength(1);

    permissions.request.mockResolvedValue('never_ask_again');
    await expect(useLocalMusicStore.getState().requestAccess()).resolves.toBe('blocked');
  });

  it('MOB-LOCAL-002 songs are grouped by folder, and a hidden folder leaves the list and stays hidden', async () => {
    permissions.check.mockResolvedValue(true);
    native.scan.mockResolvedValue([
      song({ mediaId: '1', folder: 'Music', fileName: 'a.mp3', modifiedAt: 1 }),
      song({ mediaId: '2', folder: 'Music', fileName: 'b.mp3', modifiedAt: 3 }),
      song({ mediaId: '3', folder: 'Download/Mixes', fileName: 'c.mp3', modifiedAt: 2 }),
    ]);
    await useLocalMusicStore.getState().hydrate();
    const state = useLocalMusicStore.getState();
    expect(musicFolders(state).map((f) => [f.path, f.name, f.songCount])).toEqual([
      ['Download/Mixes', 'Mixes', 1],
      ['Music', 'Music', 2],
    ]);
    expect(deviceTracks(state).map((t) => t.addedAt)).toEqual([3, 2, 1]);
    expect(deviceTracks(state)[0]).toMatchObject({ source: 'local', artistId: '' });

    useLocalMusicStore.getState().setHidden('Music', true);
    expect(deviceTracks(useLocalMusicStore.getState())).toHaveLength(1);
    expect(JSON.parse((await AsyncStorage.getItem('sonare.hiddenFolders'))!)).toEqual(['Music']);
  });

  it('MOB-LOCAL-003 a download names its file with the song id, so it can be found again', () => {
    const name = downloadName({ id: 'yt:dQw4w9WgXcQ', artist: 'Rick Astley', title: 'Never: Gonna/Give' });
    expect(name).toBe('Rick Astley - Never_ Gonna_Give [dQw4w9WgXcQ]');
    expect(idInFileName(`${name}.mka`)).toBe('yt:dQw4w9WgXcQ');
    expect(idInFileName('Some other song.mp3')).toBeNull();
  });

  it('MOB-LOCAL-004 downloads the list lost (a reinstall) come back from Music/Sonare, shown once', async () => {
    permissions.check.mockResolvedValue(true);
    native.scan.mockResolvedValue([
      song({
        mediaId: '9',
        folder: 'Music/Sonare',
        fileName: 'X - Y [dQw4w9WgXcQ].mka',
        title: 'Y',
        artist: 'X',
        uri: 'content://9',
      }),
      song({ mediaId: '8', folder: 'Music', fileName: 'mine.mp3' }),
    ]);
    await useLocalMusicStore.getState().hydrate();
    expect(useDownloadsStore.getState().items['yt:dQw4w9WgXcQ']).toMatchObject({
      status: 'done',
      title: 'Y',
      artist: 'X',
      uri: 'content://9',
      format: 'opus',
    });
    // It shows as the download, not a second time as a phone song.
    expect(deviceTracks(useLocalMusicStore.getState()).map((t) => t.title)).toEqual(['A song']);
  });

  it('MOB-LOCAL-006 an untagged download found again takes its artist and title from its file name', async () => {
    permissions.check.mockResolvedValue(true);
    native.scan.mockResolvedValue([
      song({
        mediaId: '7',
        folder: 'Music/Sonare',
        fileName: 'Radiohead - Karma Police [1uYWYWPc9HU].webm',
        // What Android shows for a file without tags.
        title: 'Radiohead - Karma Police [1uYWYWPc9HU]',
        artist: null,
      }),
    ]);
    await useLocalMusicStore.getState().hydrate();
    expect(useDownloadsStore.getState().items['yt:1uYWYWPc9HU']).toMatchObject({
      title: 'Karma Police',
      artist: 'Radiohead',
    });
  });

  it('MOB-LOCAL-005 a song on the phone plays from its content uri', async () => {
    permissions.check.mockResolvedValue(true);
    native.scan.mockResolvedValue([song({ uri: 'content://media/external/audio/media/42' })]);
    await useLocalMusicStore.getState().hydrate();
    const [track] = deviceTracks(useLocalMusicStore.getState());
    expect(deviceUriFor(track.id)).toBe('content://media/external/audio/media/42');
    expect(deviceUriFor('yt:abc')).toBeNull();
  });
});
