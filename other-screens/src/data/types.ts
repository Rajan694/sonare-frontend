export type Source = 'local' | 'server'
export type Mode = 'online' | 'offline'

export interface Page<T> {
  items: T[]
  meta?: {
    nextCursor?: string
    total?: number
  }
}

export interface User {
  id: string
  email: string
  displayName: string
  createdAt?: number
}

export interface Track {
  id: string
  title: string
  artistId: string
  artist: string
  albumId: string | null
  album: string | null
  durationMs: number | null
  source: Source
  localPath?: string
  codec?: string | null
  bitrateKbps?: number | null
  bitDepth?: number
  playCount: number
  favourite: boolean
  addedAt: number
  lastPlayedAt?: number
  peaks?: number[]
  lyrics?: {
    synced: boolean
    lines: { atMs: number; text: string }[]
    offsetMs: number
  }
  thumbnail?: string
}

export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  year: number | null
  trackCount: number | null
  genre: string | null
  source: Source
  downloaded: boolean
  thumbnail?: string
}

export interface Artist {
  id: string
  name: string
  albumCount: number
  localTrackCount: number
  following: boolean
  monthlyListeners?: number | null
  thumbnail?: string
}

export interface Playlist {
  id: string
  name: string
  description?: string | null
  kind: 'local' | 'synced' | 'online'
  trackCount: number | null
  downloadedCount: number
  updatedAt: number
  thumbnail?: string
}

export interface Folder {
  id: string
  name: string
  path: string
  trackCount: number
  bytes: number
  included: boolean
  lastScanAt: number
}

export interface PlayerState {
  mode: Mode
  queue: Track[]
  index: number
  positionMs: number
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  output: {
    id: string
    name: string
    kind: 'wired' | 'bluetooth' | 'cast' | 'speaker'
    available: boolean
  }
}
