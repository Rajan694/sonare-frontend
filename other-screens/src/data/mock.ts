import type { Track, Album, Artist, Playlist, Folder } from './types'

export const MOCK_PEAKS: number[] = [
  9,15,10,13,12,13,14,11,15,13,10,11,16,10,11,13,16,13,14,12,15,14,15,14,17,16,15,19,18,16,
  20,18,14,16,14,18,20,20,18,22,19,20,18,16,20,18,20,22,18,20,24,22,20,22,24,22,20,24,22,20,
  22,24,22,20,22,20,18,16,18,16,18,20,18,16,14,16,14,16,18,16,14,12,14,12,10,12,10,12,14,12,
  10,8,10,8,10,12,10,8,6,8,10,8,6,4,6,8,6,4,6,8,10,8,6,8,10,12,10,8,10,12,14,12,10,11,9,
  13,14,15,13,12,10,9,11,13,15,16,14,12,11,10,12,14,16,18,16,14,12,11,13
]

export const MOCK_TRACKS: Track[] = [
  { id: 't1', title: 'Paper Lanterns', artist: 'Hollow Coast', artistId: 'a1', albumId: 'al1', album: 'Drifts', durationMs: 222000, source: 'local', codec: 'FLAC', bitrateKbps: 1411, bitDepth: 24, playCount: 184, favourite: true, addedAt: 1700000000 },
  { id: 't2', title: 'Blue Hour', artist: 'Hollow Coast', artistId: 'a1', albumId: 'al1', album: 'Drifts', durationMs: 195000, source: 'local', codec: 'FLAC', bitrateKbps: 1411, bitDepth: 24, playCount: 97, favourite: false, addedAt: 1700000001 },
  { id: 't3', title: 'Salt Flats', artist: 'Hollow Coast', artistId: 'a1', albumId: 'al1', album: 'Drifts', durationMs: 258000, source: 'server', playCount: 212, favourite: true, addedAt: 1700000002 },
  { id: 't4', title: 'Undertow', artist: 'Hollow Coast', artistId: 'a1', albumId: 'al1', album: 'Drifts', durationMs: 184000, source: 'local', codec: 'AAC', bitrateKbps: 256, playCount: 63, favourite: false, addedAt: 1700000003 },
  { id: 't5', title: 'Meridian', artist: 'Slow Static', artistId: 'a2', albumId: 'al2', album: 'Quiet Motion', durationMs: 311000, source: 'server', playCount: 441, favourite: true, addedAt: 1700000004 },
  { id: 't6', title: 'Thermal', artist: 'Slow Static', artistId: 'a2', albumId: 'al2', album: 'Quiet Motion', durationMs: 228000, source: 'local', codec: 'FLAC', bitrateKbps: 1152, playCount: 88, favourite: false, addedAt: 1700000005 },
  { id: 't7', title: 'Glass Corridor', artist: 'Yara Voss', artistId: 'a3', albumId: 'al3', album: 'Passage', durationMs: 267000, source: 'local', codec: 'MP3', bitrateKbps: 320, playCount: 156, favourite: true, addedAt: 1700000006 },
  { id: 't8', title: 'Periphery', artist: 'Yara Voss', artistId: 'a3', albumId: 'al3', album: 'Passage', durationMs: 198000, source: 'server', playCount: 73, favourite: false, addedAt: 1700000007 },
]

export const MOCK_ALBUMS: Album[] = [
  { id: 'al1', title: 'Drifts', artist: 'Hollow Coast', artistId: 'a1', year: 2023, trackCount: 11, genre: 'Ambient', source: 'local', downloaded: true },
  { id: 'al2', title: 'Quiet Motion', artist: 'Slow Static', artistId: 'a2', year: 2022, trackCount: 9, genre: 'Electronica', source: 'server', downloaded: false },
  { id: 'al3', title: 'Passage', artist: 'Yara Voss', artistId: 'a3', year: 2024, trackCount: 10, genre: 'Indie', source: 'local', downloaded: true },
  { id: 'al4', title: 'Late Bloom', artist: 'Crestline', artistId: 'a4', year: 2021, trackCount: 8, genre: 'Post-rock', source: 'server', downloaded: false },
]

export const MOCK_ARTISTS: Artist[] = [
  { id: 'a1', name: 'Hollow Coast', albumCount: 3, localTrackCount: 28, following: true, monthlyListeners: 94200 },
  { id: 'a2', name: 'Slow Static', albumCount: 2, localTrackCount: 9, following: false, monthlyListeners: 142000 },
  { id: 'a3', name: 'Yara Voss', albumCount: 4, localTrackCount: 17, following: true, monthlyListeners: 67800 },
  { id: 'a4', name: 'Crestline', albumCount: 2, localTrackCount: 0, following: false, monthlyListeners: 211000 },
]

export const MOCK_PLAYLISTS: Playlist[] = [
  { id: 'pl1', name: 'Late Drive', kind: 'local', trackCount: 42, downloadedCount: 42, updatedAt: 1720000000 },
  { id: 'pl2', name: 'Focus / Deep Work', kind: 'synced', trackCount: 88, downloadedCount: 72, updatedAt: 1720000100 },
  { id: 'pl3', name: 'Rainy Window', kind: 'local', trackCount: 27, downloadedCount: 27, updatedAt: 1720000200 },
  { id: 'pl4', name: 'Downloaded ★', kind: 'local', trackCount: 156, downloadedCount: 156, updatedAt: 1720000300 },
  { id: 'pl5', name: 'Weekend Warmup', kind: 'online', trackCount: 35, downloadedCount: 0, updatedAt: 1720000400 },
  { id: 'pl6', name: 'Liked Songs', kind: 'local', trackCount: 214, downloadedCount: 214, updatedAt: 1720000500 },
]

export const MOCK_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Music', path: '/home/rajan/Music', trackCount: 412, bytes: 26843545600, included: true, lastScanAt: 1720100000 },
  { id: 'f2', name: 'Downloads', path: '/home/rajan/Downloads/Music', trackCount: 38, bytes: 2147483648, included: true, lastScanAt: 1720090000 },
  { id: 'f3', name: 'Archive', path: '/home/rajan/Music/Archive', trackCount: 87, bytes: 5368709120, included: false, lastScanAt: 1720080000 },
]
