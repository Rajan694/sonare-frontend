import { useEffect, useSyncExternalStore } from 'react'
import { filesystem, os, storage } from '@neutralinojs/lib'
import { CAPS } from '../lib/caps'
import { clean, readTags, tagsFromFileName } from './tags'
import type { Folder, Track } from './types'

/**
 * Device-local library (contract §1 / §6.6) — desktop only, backed by Neutralino.
 *
 * Folders are scanned recursively, tags are read with ranged reads (tags.ts), and the
 * index is kept in Neutralino storage: the webview's localStorage is keyed by origin,
 * and the release build serves from a random port, so it would forget between launches.
 *
 * Finished downloads (data/downloads.ts) are indexed like any other local file,
 * remembering the server track they came from so the UI can show them as downloaded and
 * the player can prefer the file over the network. They live in the "Sonare downloads"
 * folder entry, whose rescan re-checks the files it knows rather than listing a directory:
 * downloads may sit in more than one place after the download location changes.
 *
 * On web every method degrades to an empty library.
 */

const AUDIO_EXT = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|webm)$/i
const STORAGE_KEY = 'sonare_library'
const DOWNLOADS_FOLDER_ID = 'downloads'

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg',
  oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm',
}

interface LocalEntry {
  id: string
  path: string
  folderId: string
  size: number
  mtime: number
  title: string
  artist: string
  album: string | null
  year?: number
  genre?: string
  durationMs: number | null
  codec?: string
  bitrateKbps?: number
  addedAt: number
  /** Set for files Sonare downloaded: the server track they are a copy of. */
  serverId?: string
  thumbnail?: string
}

export interface LocalLyrics {
  synced: boolean
  lines: { atMs: number; text: string }[]
  plain?: string
  offsetMs: number
  provider: 'user' | 'lrc'
}

interface LibraryIndex {
  version: 1
  folders: Folder[]
  entries: LocalEntry[]
  /** Lyrics typed or pasted for local files; the server cannot store them (it only knows YouTube ids). */
  lyrics?: Record<string, LocalLyrics>
}

/** Parse LRC text: `[mm:ss.xx]` stamps (several per line allowed) and an optional `[offset:±ms]` tag. */
export function parseLrc(text: string): { lines: { atMs: number; text: string }[]; offsetMs: number } {
  const lines: { atMs: number; text: string }[] = []
  let offsetMs = 0
  for (const raw of text.split(/\r?\n/)) {
    const offset = raw.match(/^\[offset:\s*([+-]?\d+)\]/i)
    if (offset) {
      // LRC's positive offset means "show lyrics sooner"; ours means "later".
      offsetMs = -parseInt(offset[1], 10)
      continue
    }
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)]
    if (stamps.length === 0) continue
    const lyric = raw.replace(/\[[^\]]*\]/g, '').trim()
    for (const m of stamps) {
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0
      lines.push({ atMs: parseInt(m[1], 10) * 60000 + parseInt(m[2], 10) * 1000 + frac, text: lyric })
    }
  }
  return { lines: lines.sort((a, b) => a.atMs - b.atMs), offsetMs }
}

export interface LocalSnapshot {
  ready: boolean
  folders: Folder[]
  /** Tracks from included folders, newest first. */
  tracks: Track[]
  /** Server track id → local track id, for downloaded copies. */
  downloads: Map<string, string>
  scanning: { done: number; total: number } | null
}

let index: LibraryIndex = { version: 1, folders: [], entries: [] }
let snapshot: LocalSnapshot = { ready: !CAPS.localLibrary, folders: [], tracks: [], downloads: new Map(), scanning: null }
const listeners = new Set<() => void>()
let loadPromise: Promise<void> | null = null

function hash(s: string): string {
  // cyrb53 — stable, fast, and plenty for de-duplicating file paths.
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

function toTrack(e: LocalEntry): Track {
  return {
    id: e.id,
    // Tidy on display too, so entries indexed before a cleanup rule existed benefit.
    title: clean(e.title) ?? e.title,
    // Local artists/albums have no catalog page, so leave the ids empty (menus hide "Go to").
    artistId: '',
    artist: clean(e.artist) ?? e.artist,
    albumId: null,
    album: clean(e.album ?? undefined) ?? e.album,
    durationMs: e.durationMs,
    source: 'local',
    localPath: e.path,
    codec: e.codec ?? null,
    bitrateKbps: e.bitrateKbps ?? null,
    playCount: 0,
    favourite: false,
    addedAt: e.addedAt,
    thumbnail: e.thumbnail,
  }
}

function rebuild(patch: Partial<LocalSnapshot> = {}) {
  const included = new Set(index.folders.filter(f => f.included).map(f => f.id))
  const seen = new Set<string>()
  const tracks: Track[] = []
  const downloads = new Map<string, string>()
  for (const e of [...index.entries].sort((a, b) => b.addedAt - a.addedAt)) {
    if (e.serverId) downloads.set(e.serverId, e.id)
    if (!included.has(e.folderId) || seen.has(e.id)) continue
    seen.add(e.id)
    tracks.push(toTrack(e))
  }
  const folders = index.folders.map(f => {
    const own = index.entries.filter(e => e.folderId === f.id)
    return { ...f, trackCount: own.length, bytes: own.reduce((n, e) => n + e.size, 0) }
  })
  snapshot = { ...snapshot, ready: true, folders, tracks, downloads, ...patch }
  for (const l of listeners) l()
}

async function persist() {
  try {
    await storage.setData(STORAGE_KEY, JSON.stringify(index))
  } catch {
    // Storage denied: the library still works for this session.
  }
}

function load(): Promise<void> {
  if (!CAPS.localLibrary) return Promise.resolve()
  loadPromise ??= (async () => {
    try {
      const raw = await storage.getData(STORAGE_KEY)
      const parsed = JSON.parse(raw) as LibraryIndex
      if (parsed?.version === 1) index = parsed
    } catch {
      // First launch: no stored library yet.
    }
    rebuild()
  })()
  return loadPromise
}

function rangeReader(path: string, fileSize: number) {
  return async (pos: number, size: number) => {
    const start = Math.max(0, Math.min(pos, fileSize))
    const len = Math.max(0, Math.min(size, fileSize - start))
    if (len === 0) return new Uint8Array(0)
    return new Uint8Array(await filesystem.readBinaryFile(path, { pos: start, size: len }))
  }
}

async function indexFile(path: string, folderId: string, previous?: LocalEntry): Promise<LocalEntry | null> {
  const stats = await filesystem.getStats(path)
  if (previous && previous.size === stats.size && previous.mtime === stats.modifiedAt) return previous
  const tags = await readTags(path, stats.size, rangeReader(path, stats.size))
  const fromName = tagsFromFileName(path)
  return {
    id: `local:${hash(path)}`,
    path,
    folderId,
    size: stats.size,
    mtime: stats.modifiedAt,
    title: previous?.serverId ? previous.title : tags.title ?? fromName.title,
    artist: previous?.serverId ? previous.artist : tags.artist ?? fromName.artist ?? 'Unknown artist',
    album: previous?.serverId ? previous.album : tags.album ?? fromName.album ?? null,
    year: tags.year,
    genre: tags.genre,
    durationMs: tags.durationMs ?? previous?.durationMs ?? null,
    codec: tags.codec,
    bitrateKbps: tags.bitrateKbps,
    addedAt: previous?.addedAt ?? stats.createdAt ?? Date.now(),
    serverId: previous?.serverId,
    thumbnail: previous?.thumbnail,
  }
}

async function scanFolder(folder: Folder, onFile: () => void, files: string[]) {
  const previous = new Map(index.entries.filter(e => e.folderId === folder.id).map(e => [e.path, e]))
  const next: LocalEntry[] = []
  // A few reads in flight keeps the scan quick without flooding the native bridge.
  let cursor = 0
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < files.length) {
        const path = files[cursor++]
        try {
          const entry = await indexFile(path, folder.id, previous.get(path))
          if (entry) next.push(entry)
        } catch {
          // Unreadable file — skip it rather than failing the folder.
        }
        onFile()
      }
    })
  )
  index = {
    ...index,
    entries: [...index.entries.filter(e => e.folderId !== folder.id), ...next],
    folders: index.folders.map(f => (f.id === folder.id ? { ...f, lastScanAt: Date.now() } : f)),
  }
}

async function listAudioFiles(dir: string): Promise<string[]> {
  const entries = await filesystem.readDirectory(dir, { recursive: true })
  return entries.filter(e => e.type === 'FILE' && AUDIO_EXT.test(e.entry)).map(e => e.path)
}

/** Downloaded files that are still on disk; the downloads folder "scans" by checking these. */
async function existingDownloadFiles(): Promise<string[]> {
  const paths = index.entries.filter(e => e.folderId === DOWNLOADS_FOLDER_ID).map(e => e.path)
  const present = await Promise.all(paths.map(p => filesystem.getStats(p).then(() => true, () => false)))
  return paths.filter((_, i) => present[i])
}

/** The downloads folder entry, pointed at the current download location. */
function ensureDownloadsFolder(path: string): Folder {
  const existing = index.folders.find(f => f.id === DOWNLOADS_FOLDER_ID)
  if (existing) {
    if (existing.path !== path) index = { ...index, folders: index.folders.map(f => (f === existing ? { ...f, path } : f)) }
    return { ...existing, path }
  }
  const folder: Folder = { id: DOWNLOADS_FOLDER_ID, name: 'Sonare downloads', path, trackCount: 0, bytes: 0, included: true, lastScanAt: Date.now() }
  index = { ...index, folders: [...index.folders, folder] }
  return folder
}

/** A finished download, as the download manager reports it. */
export interface DownloadedFile {
  serverId: string
  path: string
  /** The download location, for the "Sonare downloads" folder entry. */
  dir: string
  title: string
  artist: string
  album: string | null
  durationMs: number | null
  codec?: string
  bitrateKbps?: number
  thumbnail?: string
}

export interface LocalFileData {
  data: ArrayBuffer
  mime: string
  durationMs: number | null
}

let activeObjectUrl: string | null = null

export const localLibrary = {
  async listFolders(): Promise<Folder[]> {
    await load()
    return snapshot.folders
  },

  /** Adds a folder (native picker when no path is given) and scans it. Returns null if cancelled. */
  async addFolder(path?: string): Promise<Folder | null> {
    if (!CAPS.localLibrary) throw new Error('Local folders are only available in the desktop app')
    await load()
    const chosen = path ?? (await os.showFolderDialog('Add a music folder', { defaultPath: await os.getPath('music') }))
    if (!chosen) return null
    const existing = index.folders.find(f => f.path === chosen)
    if (existing) return existing
    const folder: Folder = {
      id: `f_${hash(chosen)}`,
      name: chosen.split('/').filter(Boolean).pop() || chosen,
      path: chosen,
      trackCount: 0,
      bytes: 0,
      included: true,
      lastScanAt: 0,
    }
    index = { ...index, folders: [...index.folders, folder] }
    rebuild()
    await localLibrary.rescan(folder.id)
    return folder
  },

  /** Forgets a folder and its index entries; files on disk are untouched. */
  async removeFolder(id: string): Promise<void> {
    await load()
    const gone = new Set(index.entries.filter(e => e.folderId === id).map(e => e.id))
    const lyrics = Object.fromEntries(Object.entries(index.lyrics ?? {}).filter(([trackId]) => !gone.has(trackId)))
    index = { folders: index.folders.filter(f => f.id !== id), entries: index.entries.filter(e => e.folderId !== id), lyrics, version: 1 }
    rebuild()
    await persist()
  },

  async setIncluded(id: string, included: boolean): Promise<void> {
    await load()
    index = { ...index, folders: index.folders.map(f => (f.id === id ? { ...f, included } : f)) }
    rebuild()
    await persist()
  },

  /** Re-index one folder, or all of them. Unchanged files (same size + mtime) are not re-read. */
  async rescan(id?: string): Promise<{ added: number; removed: number; scannedAt: number }> {
    if (!CAPS.localLibrary) return { added: 0, removed: 0, scannedAt: Date.now() }
    await load()
    const targets = index.folders.filter(f => !id || f.id === id)
    const before = new Set(index.entries.map(e => e.id))
    const lists = await Promise.all(
      targets.map(f => (f.id === DOWNLOADS_FOLDER_ID ? existingDownloadFiles() : listAudioFiles(f.path)).catch(() => [] as string[]))
    )
    const total = lists.reduce((n, l) => n + l.length, 0)
    let done = 0
    rebuild({ scanning: { done, total } })
    for (let i = 0; i < targets.length; i++) {
      await scanFolder(targets[i], () => {
        done++
        if (done % 10 === 0 || done === total) rebuild({ scanning: { done, total } })
      }, lists[i])
    }
    const after = new Set(index.entries.map(e => e.id))
    rebuild({ scanning: null })
    await persist()
    return {
      added: [...after].filter(x => !before.has(x)).length,
      removed: [...before].filter(x => !after.has(x)).length,
      scannedAt: Date.now(),
    }
  },

  async storageStats(): Promise<{ total: number; albums: number; downloads: number }> {
    await load()
    const albums = new Set(snapshot.tracks.map(t => t.album).filter(Boolean)).size
    const downloads = index.entries.filter(e => e.folderId === DOWNLOADS_FOLDER_ID).reduce((n, e) => n + e.size, 0)
    return { total: index.entries.reduce((n, e) => n + e.size, 0), albums, downloads }
  },

  async listTracks(): Promise<Track[]> {
    await load()
    return snapshot.tracks
  },

  /** The local copy of a track: itself if local, or its download if it has one. */
  localIdFor(trackId: string): string | null {
    if (trackId.startsWith('local:')) return trackId
    return snapshot.downloads.get(trackId) ?? null
  },

  /**
   * A blob URL for playback. Reading the file into the page keeps it same-origin, which
   * the Web Audio EQ needs (a cross-origin file:// or server URL would play silently).
   */
  async objectUrl(trackId: string): Promise<string> {
    return localLibrary.blobUrlFor(await localLibrary.readFile(trackId))
  },

  /** The file's bytes, plus what the index knows about it (a scan may not have a duration). */
  async readFile(trackId: string): Promise<LocalFileData> {
    await load()
    const localId = localLibrary.localIdFor(trackId)
    const entry = index.entries.find(e => e.id === localId)
    if (!entry) throw new Error('File is not in the local library')
    const data = await filesystem.readBinaryFile(entry.path)
    const ext = entry.path.split('.').pop()?.toLowerCase() ?? ''
    return { data, mime: MIME[ext] ?? 'audio/*', durationMs: entry.durationMs }
  },

  /** A blob URL for bytes from readFile. Only the latest one is kept alive. */
  blobUrlFor(file: LocalFileData): string {
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = URL.createObjectURL(new Blob([file.data], { type: file.mime }))
    return activeObjectUrl
  },

  /** Record the real duration once the player has decoded a local file. */
  noteDuration(trackId: string, durationMs: number): void {
    const entry = index.entries.find(e => e.id === trackId)
    if (!entry || !durationMs || entry.durationMs === durationMs) return
    entry.durationMs = durationMs
    rebuild()
    void persist()
  },

  /** Saved lyrics for a local file, else a sidecar `.lrc` next to it; null when neither exists. */
  async lyrics(trackId: string): Promise<LocalLyrics | null> {
    await load()
    const saved = index.lyrics?.[trackId]
    if (saved) return saved
    const entry = index.entries.find(e => e.id === trackId)
    if (!entry) return null
    try {
      const text = await filesystem.readFile(entry.path.replace(/\.[^./]+$/, '.lrc'))
      const { lines, offsetMs } = parseLrc(text)
      if (lines.length > 0) return { synced: true, lines, offsetMs, provider: 'lrc' }
      const plain = text.trim()
      return plain ? { synced: false, lines: [], plain, offsetMs: 0, provider: 'lrc' } : null
    } catch {
      return null
    }
  },

  async saveLyrics(trackId: string, body: { lrc?: string; plain?: string }): Promise<void> {
    await load()
    const lyric: LocalLyrics = body.lrc
      ? { synced: true, ...parseLrc(body.lrc), provider: 'user' }
      : { synced: false, lines: (body.plain ?? '').split('\n').map(text => ({ atMs: 0, text })), plain: body.plain, offsetMs: 0, provider: 'user' }
    index = { ...index, lyrics: { ...index.lyrics, [trackId]: lyric } }
    await persist()
  },

  async setLyricsOffset(trackId: string, offsetMs: number): Promise<void> {
    const current = await localLibrary.lyrics(trackId)
    if (!current) return
    index = { ...index, lyrics: { ...index.lyrics, [trackId]: { ...current, offsetMs } } }
    await persist()
  },

  /** Index a file the download manager just finished writing. */
  async addDownload(file: DownloadedFile): Promise<void> {
    if (!CAPS.localLibrary) return
    await load()
    const folder = ensureDownloadsFolder(file.dir)
    const stats = await filesystem.getStats(file.path)
    const entry: LocalEntry = {
      id: `local:${hash(file.path)}`,
      path: file.path,
      folderId: folder.id,
      size: stats.size,
      mtime: stats.modifiedAt,
      title: file.title,
      artist: file.artist,
      album: file.album,
      durationMs: file.durationMs,
      codec: file.codec,
      bitrateKbps: file.bitrateKbps,
      addedAt: Date.now(),
      serverId: file.serverId,
      thumbnail: file.thumbnail,
    }
    // One local copy per server track: a re-download replaces the old entry.
    index = { ...index, entries: [...index.entries.filter(e => e.path !== file.path && e.serverId !== file.serverId), entry] }
    rebuild()
    await persist()
  },

  /** Forget a download's index entry. The download manager deletes the file itself. */
  async forgetDownload(serverId: string): Promise<void> {
    await load()
    if (!index.entries.some(e => e.serverId === serverId)) return
    index = { ...index, entries: index.entries.filter(e => e.serverId !== serverId) }
    rebuild()
    await persist()
  },

  /** Downloads indexed before the download manager kept its own list (for a one-time import). */
  async downloadedEntries(): Promise<(DownloadedFile & { size: number; addedAt: number })[]> {
    await load()
    return index.entries
      .filter(e => e.serverId)
      .map(e => ({
        serverId: e.serverId!,
        path: e.path,
        dir: e.path.slice(0, e.path.lastIndexOf('/')),
        title: e.title,
        artist: e.artist,
        album: e.album,
        durationMs: e.durationMs,
        codec: e.codec,
        bitrateKbps: e.bitrateKbps,
        thumbnail: e.thumbnail,
        size: e.size,
        addedAt: e.addedAt,
      }))
  },

  /** Open the file's folder in the system file manager. */
  async showInFolder(trackId: string): Promise<void> {
    const entry = index.entries.find(e => e.id === localLibrary.localIdFor(trackId))
    if (!entry) return
    await showPathInFolder(entry.path)
  },
}

export async function showPathInFolder(path: string): Promise<void> {
  await os.open(`file://${path.slice(0, path.lastIndexOf('/'))}`)
}

/**
 * Server lists (recently played, most played, favourites) carry local files only as a
 * fingerprint with placeholder metadata ("Local Track"). Swap in this device's copy, and
 * drop the ones it does not have — on web, or when the file was removed.
 */
export function resolveLocalRefs(tracks: Track[], local: LocalSnapshot): Track[] {
  const byId = new Map(local.tracks.map(t => [t.id, t]))
  return tracks.flatMap(t => (t.source !== 'local' ? [t] : byId.has(t.id) ? [byId.get(t.id)!] : []))
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getLocalSnapshot(): LocalSnapshot {
  return snapshot
}

/** Live view of the local library; loads the stored index on first use. */
export function useLocalLibrary(): LocalSnapshot {
  useEffect(() => {
    void load()
  }, [])
  return useSyncExternalStore(subscribe, getLocalSnapshot)
}
