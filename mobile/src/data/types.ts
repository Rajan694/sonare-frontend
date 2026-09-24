// Shapes follow the Sonare API (docs/api-contract.md). Ids are namespaced: `yt:…` for
// server content, `sonare:…` for the user's own playlists, `local:…` for device files.

export type Source = 'local' | 'server';
export type Mode = 'online' | 'offline';

export interface Page<T> {
  items: T[];
  meta?: {
    nextCursor?: string;
    total?: number;
  };
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string | number;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  albumId: string | null;
  album: string | null;
  durationMs: number | null;
  source: Source;
  localPath?: string;
  codec?: string | null;
  bitrateKbps?: number | null;
  bitDepth?: number;
  playCount: number;
  favourite: boolean;
  addedAt: number;
  lastPlayedAt?: number;
  thumbnail?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  year: number | null;
  trackCount: number | null;
  genre: string | null;
  source: Source;
  downloaded: boolean;
  thumbnail?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  localTrackCount: number;
  following: boolean;
  monthlyListeners?: number | null;
  thumbnail?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  kind: 'local' | 'synced' | 'online';
  trackCount: number | null;
  downloadedCount: number;
  updatedAt: number;
  thumbnail?: string;
}

/** Search results carry a `kind` discriminator. */
export type SearchItem =
  | ({ kind: 'track' } & Track)
  | ({ kind: 'album' } & Album)
  | ({ kind: 'artist' } & Artist)
  // Playlist has its own `kind` (local/synced/online); search replaces it with the discriminator.
  | ({ kind: 'playlist' } & Omit<Playlist, 'kind'>);

export interface Lyrics {
  synced: boolean;
  provider: string;
  offsetMs: number;
  lines: { atMs: number; text: string }[];
  plain?: string;
}

export interface StreamInfo {
  url: string;
  mimeType: string;
  codec: string;
  bitrateKbps: number;
  contentLength: number;
  expiresAt: number;
  muxed?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  trackCount: number;
  bytes: number;
  included: boolean;
  lastScanAt: number;
}
