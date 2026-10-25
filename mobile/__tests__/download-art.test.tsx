import { act, renderHook } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import { useDeviceArtStore, useDeviceArt, useTrackArtwork } from '../src/store/deviceArt';
import { useLocalMusicStore, mediaIdFor, tracksInFolder } from '../src/store/localMusic';
import { useDownloadsStore, type DownloadItem } from '../src/store/downloads';
import type { DeviceSong } from '../src/native/SonareLibrary';
import type { Track } from '../src/data/types';

const native = NativeModules.SonareLibrary as {
  artworkFor: jest.Mock;
};

const makeDeviceSong = (mediaId: string, uri: string, fileName: string): DeviceSong => ({
  mediaId,
  uri,
  title: 'Local Title',
  artist: 'Local Artist',
  album: 'Local Album',
  durationMs: 180_000,
  folder: 'Music/Sonare',
  fileName,
  size: 3_000_000,
  modifiedAt: 1_000,
});

const makeDownloadItem = (override: Partial<DownloadItem> = {}): DownloadItem => ({
  id: 'yt:song1',
  title: 'Song 1',
  artist: 'Artist 1',
  artistId: 'art1',
  album: 'Album 1',
  albumId: null,
  durationMs: 180_000,
  thumbnail: 'https://images.sonare.test/song1.jpg',
  status: 'done',
  quality: 'high',
  format: 'opus',
  totalBytes: 3_000_000,
  receivedBytes: 3_000_000,
  uri: 'content://media/external/audio/media/101',
  fileName: 'Song 1.opus',
  addedAt: 1_000,
  ...override,
});

describe('downloaded songs cover art', () => {
  beforeEach(() => {
    useDeviceArtStore.getState().clear();
    native.artworkFor.mockReset().mockResolvedValue({});
    useLocalMusicStore.setState({ songs: [] });
    useDownloadsStore.setState({ items: {} });
  });

  it('MOB-DLART-001 a done download matched by uri gets its device cover', async () => {
    jest.useFakeTimers();
    try {
      const download = makeDownloadItem({
        id: 'yt:match_uri',
        uri: 'content://media/external/audio/media/101',
        fileName: 'diff_name.opus',
      });
      const song = makeDeviceSong('101', 'content://media/external/audio/media/101', 'other_name.opus');

      useDownloadsStore.setState({ items: { [download.id]: download } });
      useLocalMusicStore.setState({ songs: [song] });

      expect(mediaIdFor('yt:match_uri')).toBe('101');

      native.artworkFor.mockResolvedValue({ '101': 'file:///covers/101.jpg' });

      const track: Track = {
        id: 'yt:match_uri',
        title: download.title,
        artist: download.artist,
        artistId: download.artistId,
        albumId: null,
        album: download.album,
        durationMs: 180_000,
        source: 'server',
        thumbnail: download.thumbnail,
        playCount: 0,
        favourite: false,
        addedAt: 1_000,
      };

      const { result, rerender } = renderHook(({ t }: { t: Track }) => useTrackArtwork(t, 64), {
        initialProps: { t: track },
      });
      // First render returns network thumbnail while loading
      expect(result.current).toBe('https://images.sonare.test/song1.jpg');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      rerender({ t: track });
      expect(result.current).toBe('file:///covers/101.jpg');
    } finally {
      jest.useRealTimers();
    }
  });

  it('MOB-DLART-002 matched by file name when the uri differs', async () => {
    jest.useFakeTimers();
    try {
      const download = makeDownloadItem({
        id: 'yt:match_filename',
        uri: 'content://media/external/audio/media/999',
        fileName: 'Artist - Track.opus',
      });
      const song = makeDeviceSong('202', 'content://media/external/audio/media/202', 'Artist - Track.opus');

      useDownloadsStore.setState({ items: { [download.id]: download } });
      useLocalMusicStore.setState({ songs: [song] });

      expect(mediaIdFor('yt:match_filename')).toBe('202');

      native.artworkFor.mockResolvedValue({ '202': 'file:///covers/202.jpg' });

      const track: Track = {
        id: 'yt:match_filename',
        title: download.title,
        artist: download.artist,
        artistId: download.artistId,
        albumId: null,
        album: download.album,
        durationMs: 180_000,
        source: 'server',
        thumbnail: download.thumbnail,
        playCount: 0,
        favourite: false,
        addedAt: 1_000,
      };

      const { result, rerender } = renderHook(({ t }: { t: Track }) => useTrackArtwork(t, 64), {
        initialProps: { t: track },
      });
      expect(result.current).toBe('https://images.sonare.test/song1.jpg');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      rerender({ t: track });
      expect(result.current).toBe('file:///covers/202.jpg');
    } finally {
      jest.useRealTimers();
    }
  });

  it('MOB-DLART-003 a missing or unfinished download keeps the network url', async () => {
    jest.useFakeTimers();
    try {
      const unfinished = makeDownloadItem({
        id: 'yt:unfinished',
        status: 'downloading',
        uri: 'content://media/external/audio/media/301',
        fileName: 'Unfinished.opus',
      });
      const missing = makeDownloadItem({
        id: 'yt:missing',
        status: 'done',
        missing: true,
        uri: 'content://media/external/audio/media/302',
        fileName: 'Missing.opus',
      });
      const song1 = makeDeviceSong('301', 'content://media/external/audio/media/301', 'Unfinished.opus');
      const song2 = makeDeviceSong('302', 'content://media/external/audio/media/302', 'Missing.opus');

      useDownloadsStore.setState({ items: { [unfinished.id]: unfinished, [missing.id]: missing } });
      useLocalMusicStore.setState({ songs: [song1, song2] });

      expect(mediaIdFor('yt:unfinished')).toBeNull();
      expect(mediaIdFor('yt:missing')).toBeNull();

      const trackUnfinished: Track = {
        id: 'yt:unfinished',
        title: unfinished.title,
        artist: unfinished.artist,
        artistId: '',
        albumId: null,
        album: null,
        durationMs: null,
        source: 'server',
        thumbnail: 'https://images.sonare.test/unfinished.jpg',
        playCount: 0,
        favourite: false,
        addedAt: 1_000,
      };

      const { result: unfResult } = renderHook(() => useTrackArtwork(trackUnfinished, 64));
      expect(unfResult.current).toBe('https://images.sonare.test/unfinished.jpg');

      const trackMissing: Track = {
        id: 'yt:missing',
        title: missing.title,
        artist: missing.artist,
        artistId: '',
        albumId: null,
        album: null,
        durationMs: null,
        source: 'server',
        thumbnail: 'https://images.sonare.test/missing.jpg',
        playCount: 0,
        favourite: false,
        addedAt: 1_000,
      };

      const { result: missResult } = renderHook(() => useTrackArtwork(trackMissing, 64));
      expect(missResult.current).toBe('https://images.sonare.test/missing.jpg');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(native.artworkFor).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('MOB-DLART-004 a matched file with no embedded cover (artworkFor -> null) keeps the network url', async () => {
    jest.useFakeTimers();
    try {
      const download = makeDownloadItem({
        id: 'yt:no_art',
        uri: 'content://media/external/audio/media/401',
        fileName: 'NoArt.opus',
      });
      const song = makeDeviceSong('401', 'content://media/external/audio/media/401', 'NoArt.opus');

      useDownloadsStore.setState({ items: { [download.id]: download } });
      useLocalMusicStore.setState({ songs: [song] });

      expect(mediaIdFor('yt:no_art')).toBe('401');

      native.artworkFor.mockResolvedValue({ '401': null });

      const track: Track = {
        id: 'yt:no_art',
        title: download.title,
        artist: download.artist,
        artistId: '',
        albumId: null,
        album: null,
        durationMs: null,
        source: 'server',
        thumbnail: 'https://images.sonare.test/no_art.jpg',
        playCount: 0,
        favourite: false,
        addedAt: 1_000,
      };

      const { result, rerender } = renderHook(({ t }: { t: Track }) => useTrackArtwork(t, 64), {
        initialProps: { t: track },
      });
      expect(result.current).toBe('https://images.sonare.test/no_art.jpg');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      rerender({ t: track });
      // Even after cache resolves with null, fallback to catalogue network url
      expect(result.current).toBe('https://images.sonare.test/no_art.jpg');
    } finally {
      jest.useRealTimers();
    }
  });

  it('MOB-DLART-005 tracksInFolder still matches downloads correctly', () => {
    const download = makeDownloadItem({
      id: 'yt:folder_dl',
      uri: 'content://media/external/audio/media/501',
      fileName: 'FolderSong.opus',
    });
    const song = makeDeviceSong('501', 'content://media/external/audio/media/501', 'FolderSong.opus');

    const folderTracks = tracksInFolder('Music/Sonare', [song], { [download.id]: download });

    expect(folderTracks).toHaveLength(1);
    expect(folderTracks[0].id).toBe('yt:folder_dl');
    expect(folderTracks[0].source).toBe('server');
  });

  it("MOB-DLART-007 the song with the download's own uri wins over another with the same file name", () => {
    const download = makeDownloadItem({
      id: 'yt:both',
      uri: 'content://media/external/audio/media/702',
      fileName: 'Same Name.opus',
    });
    // A copy elsewhere with the same name comes first in the list; the uri match must still win.
    const copy = makeDeviceSong('701', 'content://media/external/audio/media/701', 'Same Name.opus');
    const own = makeDeviceSong('702', 'content://media/external/audio/media/702', 'Same Name.opus');
    useDownloadsStore.setState({ items: { [download.id]: download } });
    useLocalMusicStore.setState({ songs: [copy, own] });

    expect(mediaIdFor('yt:both')).toBe('702');
  });

  it('MOB-DLART-006 useDeviceArt re-renders when device songs or download status change', async () => {
    jest.useFakeTimers();
    try {
      const download = makeDownloadItem({
        id: 'yt:dl_dynamic',
        status: 'downloading',
        uri: 'content://media/external/audio/media/601',
        fileName: 'Dynamic.opus',
      });
      const song = makeDeviceSong('601', 'content://media/external/audio/media/601', 'Dynamic.opus');

      useDownloadsStore.setState({ items: { [download.id]: download } });
      useLocalMusicStore.setState({ songs: [] });

      native.artworkFor.mockResolvedValue({ '601': 'file:///covers/601.jpg' });

      const track: Track = {
        id: 'yt:dl_dynamic',
        title: download.title,
        artist: download.artist,
        artistId: '',
        albumId: null,
        album: null,
        durationMs: null,
        source: 'server',
        thumbnail: 'https://images.sonare.test/dynamic.jpg',
        playCount: 0,
        favourite: false,
        addedAt: 1_000,
      };

      const { result, rerender } = renderHook(({ t }: { t: Track }) => useDeviceArt(t), {
        initialProps: { t: track },
      });
      expect(result.current).toBeUndefined();

      // Download finishes and songs are scanned
      act(() => {
        useDownloadsStore.setState({
          items: {
            [download.id]: { ...download, status: 'done' },
          },
        });
        useLocalMusicStore.setState({ songs: [song] });
      });

      rerender({ t: track });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      rerender({ t: track });
      expect(result.current).toBe('file:///covers/601.jpg');
    } finally {
      jest.useRealTimers();
    }
  });
});
