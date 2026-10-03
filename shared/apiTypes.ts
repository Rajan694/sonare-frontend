// Shapes the Sonare API returns (../../docs/api-contract.md), shared by the desktop/web app
// and the mobile app. Types only: no runtime code and no imports, so each app can pull it in
// with `import type` / `export type *` and no bundler ever has to load this file.
//
// Ids are namespaced: `yt:…` for server content, `sonare:…` for the user's own playlists,
// `local:…` for device files.

export type Source = 'local' | 'server';

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
  /** Missing on sessions saved before email verification existed. */
  emailVerified?: boolean;
  /** ISO timestamp (GET /me); not sent with sign-in responses. */
  createdAt?: string;
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
  /** The user's own playlists only; YouTube playlists (GET /playlists/:id) have no date. */
  updatedAt?: number;
  thumbnail?: string;
}

/** Search results carry a `kind` discriminator. */
export type SearchItem =
  | ({ kind: 'track' } & Track)
  | ({ kind: 'album' } & Album)
  | ({ kind: 'artist' } & Artist)
  // Playlist has its own `kind` (local/synced/online); search replaces it with the discriminator.
  | ({ kind: 'playlist' } & Omit<Playlist, 'kind'>);

export interface LyricsLine {
  atMs: number;
  text: string;
}

/** GET /tracks/:id/lyrics. */
export interface Lyrics {
  synced: boolean;
  /** lrclib, genius or user (an override saved by the user). */
  provider: string;
  offsetMs: number;
  lines: LyricsLine[];
  plain?: string;
  /** Genius results carry only a link to the lyrics. */
  attribution?: { name: string; url: string };
}

/** GET /tracks/:id/stream. */
export interface StreamInfo {
  url: string;
  mimeType: string;
  codec: string;
  bitrateKbps: number;
  contentLength: number;
  expiresAt: number;
  muxed?: boolean;
  itag?: number;
}
