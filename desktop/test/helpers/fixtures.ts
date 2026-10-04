import type { Album, Artist, Page, Playlist, Track, User } from '../../src/types';

let seq = 0;
const next = () => ++seq;

export function makeTrack(over: Partial<Track> = {}): Track {
  const n = next();
  return {
    id: `yt:track${n}`,
    title: `Track ${n}`,
    artistId: `yt:artist${n}`,
    artist: `Artist ${n}`,
    albumId: null,
    album: null,
    durationMs: 200_000,
    source: 'server',
    playCount: 0,
    favourite: false,
    addedAt: 1_700_000_000_000,
    ...over,
  };
}

export function makeAlbum(over: Partial<Album> = {}): Album {
  const n = next();
  return {
    id: `yt:album${n}`,
    title: `Album ${n}`,
    artist: `Artist ${n}`,
    artistId: `yt:artist${n}`,
    year: 2024,
    trackCount: 10,
    genre: null,
    source: 'server',
    downloaded: false,
    ...over,
  };
}

export function makeArtist(over: Partial<Artist> = {}): Artist {
  const n = next();
  return {
    id: `yt:artist${n}`,
    name: `Artist ${n}`,
    albumCount: 3,
    localTrackCount: 0,
    following: false,
    ...over,
  };
}

export function makePlaylist(over: Partial<Playlist> = {}): Playlist {
  const n = next();
  return {
    id: `sonare:pl${n}`,
    name: `Playlist ${n}`,
    kind: 'online',
    trackCount: 0,
    downloadedCount: 0,
    updatedAt: 1_700_000_000_000,
    ...over,
  };
}

export const testUser: User = { id: 'u-test', email: 'listener@sonare.test', displayName: 'Test Listener' };

export const page = <T>(items: T[], nextCursor?: string): Page<T> => ({
  items,
  meta: nextCursor ? { nextCursor } : {},
});
