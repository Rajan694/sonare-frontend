import type { Folder, Track } from './types'

// TODO(neutralino): Real NeutralinoJS filesystem & tag reader implementation for Desktop comes in a future phase.
// Web has no local library access and degrades gracefully to an empty / unsupported state.

export interface LocalLibrary {
  listFolders(): Promise<Folder[]>
  addFolder(path: string): Promise<Folder>
  removeFolder(id: string): Promise<void>
  setIncluded(id: string, included: boolean): Promise<void>
  rescan(id?: string): Promise<{ added: number; removed: number; scannedAt: number }>
  storageStats(): Promise<{ total: number; albums: number; downloads: number }>
  listTracks(q?: any): Promise<Track[]>
  readTags(path: string): Promise<any>
  peaks(path: string, bars: number): Promise<number[]>
}

const LOCAL_FOLDERS_STORAGE_KEY = 'sonare_local_folders'

const INITIAL_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Music', path: '/home/rajan/Music', trackCount: 412, bytes: 26843545600, included: true, lastScanAt: 1720100000 },
  { id: 'f2', name: 'Downloads', path: '/home/rajan/Downloads/Music', trackCount: 38, bytes: 2147483648, included: true, lastScanAt: 1720090000 },
  { id: 'f3', name: 'Archive', path: '/home/rajan/Music/Archive', trackCount: 87, bytes: 5368709120, included: false, lastScanAt: 1720080000 },
]

function getStoredFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLDERS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return INITIAL_FOLDERS
}

function saveStoredFolders(folders: Folder[]) {
  try {
    localStorage.setItem(LOCAL_FOLDERS_STORAGE_KEY, JSON.stringify(folders))
  } catch {}
}

export const localLibrary: LocalLibrary = {
  async listFolders(): Promise<Folder[]> {
    return getStoredFolders()
  },

  async addFolder(path: string): Promise<Folder> {
    const folders = getStoredFolders()
    const name = path.split('/').filter(Boolean).pop() || 'New Folder'
    const newFolder: Folder = {
      id: `f_${Date.now()}`,
      name,
      path,
      trackCount: 0,
      bytes: 0,
      included: true,
      lastScanAt: Date.now(),
    }
    const updated = [...folders, newFolder]
    saveStoredFolders(updated)
    return newFolder
  },

  async removeFolder(id: string): Promise<void> {
    const folders = getStoredFolders()
    saveStoredFolders(folders.filter(f => f.id !== id))
  },

  async setIncluded(id: string, included: boolean): Promise<void> {
    const folders = getStoredFolders()
    saveStoredFolders(folders.map(f => f.id === id ? { ...f, included } : f))
  },

  async rescan(_id?: string): Promise<{ added: number; removed: number; scannedAt: number }> {
    return { added: 0, removed: 0, scannedAt: Date.now() }
  },

  async storageStats(): Promise<{ total: number; albums: number; downloads: number }> {
    const folders = getStoredFolders()
    const total = folders.reduce((acc, f) => acc + f.bytes, 0)
    return { total, albums: 0, downloads: 0 }
  },

  async listTracks(): Promise<Track[]> {
    return []
  },

  async readTags(): Promise<any> {
    return {}
  },

  async peaks(): Promise<number[]> {
    return []
  },
}
