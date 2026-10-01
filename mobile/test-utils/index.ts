/* eslint-env jest */
import type { Album, Artist, Playlist, Track } from '../src/data/types';
import type { DownloadItem } from '../src/store/downloads';

/**
 * The navigation a screen sees. Test files mock @react-navigation/native with
 * `navigationMock()` and then assert on `nav` / set `route.params`.
 */
export const nav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
  canGoBack: () => true,
};
export const route: { params: Record<string, unknown> } = { params: {} };

export function navigationMock() {
  const actual = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actual,
    useNavigation: () => nav,
    useRoute: () => route,
    // Runs like a screen gaining focus once, on mount.
    useFocusEffect: (cb: () => void) => React.useEffect(() => cb(), [cb]),
  };
}

let seq = 0;

export function makeTrack(over: Partial<Track> = {}): Track {
  const n = ++seq;
  return {
    id: `yt:t${n}`,
    title: `Track ${n}`,
    artistId: `yt:a${n}`,
    artist: `Artist ${n}`,
    albumId: null,
    album: null,
    durationMs: 200_000,
    source: 'server',
    playCount: 0,
    favourite: false,
    addedAt: 1_700_000_000_000 + n,
    ...over,
  };
}

export function makeAlbum(over: Partial<Album> = {}): Album {
  const n = ++seq;
  return {
    id: `yt:al${n}`,
    title: `Album ${n}`,
    artist: `Artist ${n}`,
    artistId: `yt:a${n}`,
    year: 2020,
    trackCount: 10,
    genre: null,
    source: 'server',
    downloaded: false,
    ...over,
  } as Album;
}

export function makeArtist(over: Partial<Artist> = {}): Artist {
  const n = ++seq;
  return {
    id: `yt:a${n}`,
    name: `Artist ${n}`,
    albumCount: 2,
    localTrackCount: 0,
    following: false,
    ...over,
  } as Artist;
}

export function makePlaylist(over: Partial<Playlist> = {}): Playlist {
  const n = ++seq;
  return {
    id: `sonare:p${n}`,
    name: `Playlist ${n}`,
    kind: 'synced',
    trackCount: 0,
    downloadedCount: 0,
    updatedAt: 1,
    ...over,
  } as Playlist;
}

export function makeDownload(
  track: Track,
  over: Partial<DownloadItem> = {},
): DownloadItem {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artistId: track.artistId,
    album: track.album,
    albumId: track.albumId,
    durationMs: track.durationMs,
    status: 'done',
    quality: 'high',
    format: 'opus',
    totalBytes: 1000,
    receivedBytes: 1000,
    uri: `content://media/${track.id}`,
    addedAt: 1,
    completedAt: 2,
    ...over,
  } as DownloadItem;
}

export const page = <T>(items: T[], total?: number) => ({
  items,
  meta: total ? { total } : {},
});

export const alice = {
  id: 'u-alice',
  email: 'alice@sonare.test',
  displayName: 'Alice Walker',
  role: 'user',
};
