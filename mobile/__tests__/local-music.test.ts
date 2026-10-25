import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid } from 'react-native';
import {
  deviceTracks,
  deviceUriFor,
  mediaIdFor,
  musicFolders,
  tracksInFolder,
  useLocalMusicStore,
} from '../src/store/localMusic';
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

  it('MOB-LOCAL-003 a download names its file with the safe title; older files with an id are recognised', () => {
    const name = downloadName({ title: 'Never: Gonna/Give' });
    expect(name).toBe('Never_ Gonna_Give');
    expect(idInFileName('Rick Astley - Never_ Gonna_Give [dQw4w9WgXcQ].mka')).toBe('yt:dQw4w9WgXcQ');
    expect(idInFileName(`${name}.mka`)).toBeNull();
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

  it('MOB-LOCAL-007 a title-only download in Music/Sonare matching a done download is not a phone song, but an unmatched one is', async () => {
    permissions.check.mockResolvedValue(true);
    useDownloadsStore.setState({
      items: {
        'yt:matching_1': {
          id: 'yt:matching_1',
          title: 'Matching Song',
          artist: 'Artist One',
          artistId: '',
          album: null,
          albumId: null,
          durationMs: null,
          status: 'done',
          quality: 'high',
          format: 'opus',
          totalBytes: 1000,
          receivedBytes: 1000,
          uri: 'content://media/external/audio/media/10',
          fileName: 'Matching Song.mka',
          addedAt: 1,
        },
      },
    });

    native.scan.mockResolvedValue([
      song({
        mediaId: '10',
        folder: 'Music/Sonare',
        fileName: 'Matching Song.mka',
        title: 'Matching Song',
        uri: 'content://media/external/audio/media/10',
      }),
      song({
        mediaId: '11',
        folder: 'Music/Sonare',
        fileName: 'Unmatched Song.mka',
        title: 'Unmatched Song',
        uri: 'content://media/external/audio/media/11',
      }),
    ]);

    await useLocalMusicStore.getState().hydrate();

    const titles = deviceTracks(useLocalMusicStore.getState()).map((t) => t.title);
    expect(titles).toContain('Unmatched Song');
    expect(titles).not.toContain('Matching Song');
  });

  it('MOB-LOCAL-008 an old [id] file is still adopted on scan, while title-only files without an id are not', async () => {
    permissions.check.mockResolvedValue(true);
    native.scan.mockResolvedValue([
      song({
        mediaId: '20',
        folder: 'Music/Sonare',
        fileName: 'Old Artist - Old Title [oldVideo123].opus',
        title: 'Old Title',
        artist: 'Old Artist',
        uri: 'content://20',
      }),
      song({
        mediaId: '21',
        folder: 'Music/Sonare',
        fileName: 'Just A Title.opus',
        title: 'Just A Title',
        artist: 'Some Artist',
        uri: 'content://21',
      }),
    ]);

    await useLocalMusicStore.getState().hydrate();

    expect(useDownloadsStore.getState().items['yt:oldVideo123']).toMatchObject({
      status: 'done',
      title: 'Old Title',
      artist: 'Old Artist',
      uri: 'content://20',
    });
    // The title-only file has no id to adopt it under: only the old one became a download.
    expect(Object.keys(useDownloadsStore.getState().items)).toEqual(['yt:oldVideo123']);
  });

  it('MOB-LOCAL-009 a file with the same name as a default download in another folder stays a phone song', async () => {
    permissions.check.mockResolvedValue(true);
    useDownloadsStore.setState({
      items: {
        'yt:dl_default': {
          id: 'yt:dl_default',
          title: 'Duplicate Name',
          artist: 'Artist',
          artistId: '',
          album: null,
          albumId: null,
          durationMs: null,
          status: 'done',
          quality: 'high',
          format: 'm4a',
          totalBytes: 1000,
          receivedBytes: 1000,
          uri: 'content://media/external/audio/media/100',
          fileName: 'Duplicate Name.m4a',
          addedAt: 1,
        },
      },
    });

    native.scan.mockResolvedValue([
      // Same fileName, but in Music/Other and different uri -> stays a phone song
      song({
        mediaId: '101',
        folder: 'Music/Other',
        fileName: 'Duplicate Name.m4a',
        title: 'Duplicate Name (Other)',
        uri: 'content://media/external/audio/media/101',
      }),
      // Same fileName in Music/Sonare -> recognized as own download, excluded
      song({
        mediaId: '100',
        folder: 'Music/Sonare',
        fileName: 'Duplicate Name.m4a',
        title: 'Duplicate Name',
        uri: 'content://media/external/audio/media/100',
      }),
    ]);

    await useLocalMusicStore.getState().hydrate();

    const tracks = deviceTracks(useLocalMusicStore.getState());
    expect(tracks.map((t) => t.title)).toEqual(['Duplicate Name (Other)']);
    expect(deviceUriFor(tracks[0].id)).toBe('content://media/external/audio/media/101');
  });

  it('MOB-LOCAL-010 a folder lists only its own songs, with Sonare downloads as their catalogue songs', () => {
    const downloads = {
      'yt:dl': {
        id: 'yt:dl',
        title: 'Downloaded Song',
        artist: 'Server Artist',
        artistId: '',
        album: null,
        albumId: null,
        durationMs: null,
        status: 'done' as const,
        quality: 'high' as const,
        format: 'opus' as const,
        totalBytes: 2000,
        receivedBytes: 2000,
        uri: 'content://media/external/audio/media/301',
        fileName: 'Downloaded Song.opus',
        addedAt: 1,
      },
    };
    const songs = [
      song({
        mediaId: '300',
        folder: 'Music',
        fileName: 'a.mp3',
        title: 'Phone Song',
        uri: 'content://media/external/audio/media/300',
      }),
      song({
        mediaId: '301',
        folder: 'Music',
        fileName: 'Downloaded Song.opus',
        title: 'Downloaded Song',
        uri: 'content://media/external/audio/media/301',
      }),
      song({
        mediaId: '302',
        folder: 'SomeMusic',
        fileName: 'b.mp3',
        title: 'Other Folder',
        uri: 'content://media/external/audio/media/302',
      }),
      song({
        mediaId: '303',
        folder: 'Download/Music',
        fileName: 'c.mp3',
        title: 'Nested',
        uri: 'content://media/external/audio/media/303',
      }),
    ];
    const tracks = tracksInFolder('Music', songs, downloads);
    expect(tracks.map((t) => t.title)).toEqual(['Phone Song', 'Downloaded Song']);
    expect(tracks[1].id).toBe('yt:dl');
    expect(tracks[1].artist).toBe('Server Artist');
  });

  it('MOB-LOCAL-011 mediaIdFor returns MediaStore row ID for local tracks only', async () => {
    permissions.check.mockResolvedValue(true);
    native.scan.mockResolvedValue([
      song({
        mediaId: '999',
        folder: 'Music',
        fileName: 'Test Track.mp3',
        title: 'Test Track',
        uri: 'content://media/external/audio/media/999',
      }),
    ]);
    await useLocalMusicStore.getState().hydrate();
    const [localTrack] = deviceTracks(useLocalMusicStore.getState());
    expect(mediaIdFor(localTrack.id)).toBe('999');
    expect(mediaIdFor('yt:server_track')).toBeNull();
  });
});
