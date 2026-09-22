export type Source = 'local' | 'server'
export type Mode = 'online' | 'offline'

export interface Track {
  id: string
  title: string
  artistId: string
  artist: string
  albumId: string
  album: string
  durationMs: number
  source: Source
  localPath?: string
  codec?: string
  bitrateKbps?: number
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
}

export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  year: number
  trackCount: number
  genre: string
  source: Source
  downloaded: boolean
}

export interface Artist {
  id: string
  name: string
  albumCount: number
  localTrackCount: number
  following: boolean
  monthlyListeners?: number
}

export interface Playlist {
  id: string
  name: string
  kind: 'local' | 'synced' | 'online'
  trackCount: number
  downloadedCount: number
  updatedAt: number
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
