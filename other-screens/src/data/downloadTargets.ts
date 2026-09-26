import { filesystem, os, storage } from '@neutralinojs/lib'
import { CAPS } from '../lib/caps'

/**
 * Where downloaded files are written, one implementation per platform:
 *
 *  - `native`  desktop app: a folder on disk through Neutralino (default <Music>/Sonare).
 *  - `folder`  web, Chromium only: a folder the user picked with the File System Access API.
 *  - `browser` web anywhere else: bytes collect in IndexedDB, and the finished file is handed
 *              to the browser's own Downloads folder.
 *
 * All three write an in-progress download to a part file that survives restarts, which is
 * what makes pause / resume work: a resumed download asks the server for the bytes after
 * `part.size()`.
 *
 * The location is a per-device choice, so it's stored here and not in the account settings.
 */

export type TargetKind = 'native' | 'folder' | 'browser'

export interface DownloadLocation {
  kind: TargetKind
  /** What to show in Settings: a path, a folder name, or "Browser downloads". */
  label: string
  /** Native only: the folder path. */
  path?: string
  /** The user picked it (as opposed to the default). */
  custom?: boolean
}

/** The file (or its record) is not where the download left it: moved, renamed or deleted. */
export class FileMissingError extends Error {
  constructor(message = 'The file is no longer where it was downloaded') {
    super(message)
    this.name = 'FileMissingError'
  }
}

/** One download's partial data. */
export interface PartFile {
  size(): Promise<number>
  append(bytes: Uint8Array): Promise<void>
  /** Make appended bytes durable; the web folder target only commits them on close. */
  flush(): Promise<void>
  discard(): Promise<void>
  /** Move the part into place as `fileName` (or a free variant of it). Returns the saved name/path. */
  finish(fileName: string, mimeType: string): Promise<{ path: string; size: number }>
}

export interface DownloadTarget {
  kind: TargetKind
  /** Resolves when writing is allowed; `interactive` may prompt (needs a user gesture on web). */
  ready(interactive: boolean): Promise<boolean>
  open(): Promise<PartFile>
  /** Delete a finished file. Throws FileMissingError when it isn't there any more. */
  removeFile(path: string): Promise<void>
}

// ─── IndexedDB (web): folder handles and browser-target part data ──────────────────────

const DB_NAME = 'sonare-downloads'
let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('parts')
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function idb<T>(store: 'parts' | 'handles', mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const conn = await db()
  return new Promise<T>((resolve, reject) => {
    const req = op(conn.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

// ─── File System Access API bits missing from lib.dom ─────────────────────────────────

type PermissionMode = { mode: 'readwrite' }
interface FsaDirectory extends FileSystemDirectoryHandle {
  queryPermission?(d: PermissionMode): Promise<PermissionState>
  requestPermission?(d: PermissionMode): Promise<PermissionState>
}
interface FsaFile extends FileSystemFileHandle {
  move?(name: string): Promise<void>
}
type DirectoryPicker = (o?: { id?: string; mode?: 'readwrite'; startIn?: string }) => Promise<FsaDirectory>

function directoryPicker(): DirectoryPicker | null {
  const picker = (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker
  return typeof picker === 'function' ? picker.bind(window) : null
}

/** Chromium browsers can save into a folder the user picks; others use the Downloads folder. */
export const canPickWebFolder = !CAPS.offlineDownloads && typeof window !== 'undefined' && directoryPicker() !== null

// ─── Location preference ──────────────────────────────────────────────────────────────

const NATIVE_DIR_KEY = 'sonare_download_dir'
const WEB_FOLDER_KEY = 'location'

const listeners = new Set<() => void>()
let location: DownloadLocation = CAPS.offlineDownloads
  ? { kind: 'native', label: '~/Music/Sonare' }
  : { kind: 'browser', label: 'Browser downloads' }
let webFolder: FsaDirectory | null = null
let locationLoaded: Promise<void> | null = null

function setLocation(next: DownloadLocation) {
  location = next
  for (const l of listeners) l()
}

export async function defaultNativeDir(): Promise<string> {
  return `${await os.getPath('music')}/Sonare`
}

export function loadLocation(): Promise<void> {
  locationLoaded ??= (async () => {
    if (CAPS.offlineDownloads) {
      let path = ''
      try {
        path = await storage.getData(NATIVE_DIR_KEY)
      } catch {
        // Never chosen: use the default.
      }
      const custom = !!path
      path ||= await defaultNativeDir()
      setLocation({ kind: 'native', label: path, path, custom })
      return
    }
    try {
      const handle = await idb<FsaDirectory | undefined>('handles', 'readonly', s => s.get(WEB_FOLDER_KEY))
      if (handle && canPickWebFolder) {
        webFolder = handle
        setLocation({ kind: 'folder', label: handle.name, custom: true })
      }
    } catch {
      // IndexedDB unavailable (private mode): browser downloads it is.
    }
  })()
  return locationLoaded
}

export function getLocation(): DownloadLocation {
  return location
}

export function subscribeLocation(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Ask for a new download folder. Returns false if the user cancelled. */
export async function chooseLocation(): Promise<boolean> {
  await loadLocation()
  if (CAPS.offlineDownloads) {
    const chosen = await os.showFolderDialog('Choose where downloads are saved', { defaultPath: location.path })
    if (!chosen) return false
    await storage.setData(NATIVE_DIR_KEY, chosen)
    setLocation({ kind: 'native', label: chosen, path: chosen, custom: true })
    return true
  }
  const picker = directoryPicker()
  if (!picker) return false
  let handle: FsaDirectory
  try {
    handle = await picker({ id: 'sonare-downloads', mode: 'readwrite', startIn: 'music' })
  } catch {
    return false // Cancelled.
  }
  webFolder = handle
  await idb('handles', 'readwrite', s => s.put(handle, WEB_FOLDER_KEY)).catch(() => {})
  setLocation({ kind: 'folder', label: handle.name, custom: true })
  return true
}

/** Back to the default: <Music>/Sonare on desktop, the browser's Downloads folder on web. */
export async function resetLocation(): Promise<void> {
  await loadLocation()
  if (CAPS.offlineDownloads) {
    await storage.setData(NATIVE_DIR_KEY, '')
    const path = await defaultNativeDir()
    setLocation({ kind: 'native', label: path, path })
    return
  }
  webFolder = null
  await idb('handles', 'readwrite', s => s.delete(WEB_FOLDER_KEY)).catch(() => {})
  setLocation({ kind: 'browser', label: 'Browser downloads' })
}

// ─── Targets ──────────────────────────────────────────────────────────────────────────

/** The bits of a download a target needs; the manager's item satisfies it. */
export interface TargetRef {
  id: string
  target: TargetKind
  /** Native: folder path. */
  dir?: string
}

function partName(id: string): string {
  return `.sonare-${id.replace(/[^A-Za-z0-9_-]/g, '_')}.part`
}

function splitName(fileName: string): [string, string] {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? [fileName.slice(0, dot), fileName.slice(dot)] : [fileName, '']
}

export function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

function nativeTarget(dir: string, id: string): DownloadTarget {
  const part = `${dir}/${partName(id)}`
  const exists = (path: string) => filesystem.getStats(path).then(() => true, () => false)
  return {
    kind: 'native',
    async ready() {
      return true
    },
    async open() {
      try {
        await filesystem.createDirectory(dir)
      } catch {
        // Already there.
      }
      return {
        size: () => filesystem.getStats(part).then(s => s.size, () => 0),
        async append(bytes) {
          await filesystem.appendBinaryFile(part, bytes.slice().buffer)
        },
        async flush() {},
        async discard() {
          await filesystem.remove(part).catch(() => {})
        },
        async finish(fileName) {
          const [base, ext] = splitName(fileName)
          let path = `${dir}/${fileName}`
          for (let n = 2; await exists(path); n++) path = `${dir}/${base} (${n})${ext}`
          await filesystem.move(part, path)
          return { path, size: (await filesystem.getStats(path)).size }
        },
      }
    },
    async removeFile(path) {
      if (!(await exists(path))) throw new FileMissingError()
      await filesystem.remove(path)
    },
  }
}

async function folderHandleFor(id: string): Promise<FsaDirectory | null> {
  // Each download remembers the folder it started in, so changing the setting later
  // doesn't strand a paused download or make its Delete look in the wrong place.
  const own = await idb<FsaDirectory | undefined>('handles', 'readonly', s => s.get(`item:${id}`)).catch(() => undefined)
  return own ?? webFolder
}

function folderTarget(id: string): DownloadTarget {
  const withDir = async (interactive: boolean): Promise<FsaDirectory> => {
    const dir = await folderHandleFor(id)
    if (!dir) throw new Error('Choose a download folder in Settings')
    const mode: PermissionMode = { mode: 'readwrite' }
    let state = (await dir.queryPermission?.(mode)) ?? 'granted'
    if (state !== 'granted' && interactive) state = (await dir.requestPermission?.(mode)) ?? 'denied'
    if (state !== 'granted') throw new Error(`Allow Sonare to use the "${dir.name}" folder to continue`)
    return dir
  }
  return {
    kind: 'folder',
    async ready(interactive) {
      try {
        const dir = await withDir(interactive)
        await idb('handles', 'readwrite', s => s.put(dir, `item:${id}`)).catch(() => {})
        return true
      } catch {
        return false
      }
    },
    async open() {
      const dir = await withDir(false)
      const handle = await dir.getFileHandle(partName(id), { create: true })
      let committed = (await handle.getFile()).size
      let writer: FileSystemWritableFileStream | null = null
      let written = 0
      const close = async () => {
        if (!writer) return
        const w = writer
        writer = null
        await w.close()
        committed += written
        written = 0
      }
      return {
        async size() {
          return committed + written
        },
        async append(bytes) {
          if (!writer) {
            writer = await handle.createWritable({ keepExistingData: true })
            await writer.seek(committed)
          }
          await writer.write(bytes.slice())
          written += bytes.length
        },
        flush: close,
        async discard() {
          await writer?.abort().catch(() => {})
          writer = null
          await dir.removeEntry(partName(id)).catch(() => {})
        },
        async finish(fileName) {
          await close()
          const [base, ext] = splitName(fileName)
          let name = fileName
          for (let n = 2; await dir.getFileHandle(name).then(() => true, () => false); n++) name = `${base} (${n})${ext}`
          const moved = await (handle as FsaFile).move?.(name).then(() => true, () => false)
          if (!moved) {
            // No move() on this browser: copy, then drop the part.
            const target = await dir.getFileHandle(name, { create: true })
            const w = await target.createWritable()
            await w.write(await handle.getFile())
            await w.close()
            await dir.removeEntry(partName(id))
          }
          const file = await (await dir.getFileHandle(name)).getFile()
          return { path: name, size: file.size }
        },
      }
    },
    async removeFile(path) {
      const dir = await withDir(true)
      try {
        await dir.removeEntry(path)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'NotFoundError') throw new FileMissingError()
        throw e
      }
      await idb('handles', 'readwrite', s => s.delete(`item:${id}`)).catch(() => {})
    },
  }
}

function browserTarget(id: string): DownloadTarget {
  const load = () => idb<Blob[] | undefined>('parts', 'readonly', s => s.get(id)).then(p => p ?? [])
  return {
    kind: 'browser',
    async ready() {
      return true
    },
    async open() {
      let parts = await load()
      return {
        async size() {
          return parts.reduce((n, b) => n + b.size, 0)
        },
        async append(bytes) {
          parts = [...parts, new Blob([bytes.slice()])]
          await idb('parts', 'readwrite', s => s.put(parts, id))
        },
        async flush() {},
        async discard() {
          parts = []
          await idb('parts', 'readwrite', s => s.delete(id)).catch(() => {})
        },
        async finish(fileName, mimeType) {
          const blob = new Blob(parts, { type: mimeType })
          // A same-origin blob: link honours `download`, so the browser saves instead of playing it.
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 60_000)
          await idb('parts', 'readwrite', s => s.delete(id)).catch(() => {})
          return { path: fileName, size: blob.size }
        },
      }
    },
    async removeFile() {
      // A web page can't reach into the Downloads folder.
      throw new FileMissingError('Files saved by the browser have to be deleted from its Downloads folder')
    },
  }
}

export function targetFor(ref: TargetRef): DownloadTarget {
  if (ref.target === 'native') return nativeTarget(ref.dir ?? location.path ?? '', ref.id)
  if (ref.target === 'folder') return folderTarget(ref.id)
  return browserTarget(ref.id)
}
