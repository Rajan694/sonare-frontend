import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { SonareLibrary, type DeviceSong } from '../native/SonareLibrary';
import { hasMusicPermission, requestMusicPermission, type MusicPermission } from '../lib/musicPermission';
import { downloadedTracks, idInFileName, useDownloadsStore, type FoundDownload } from './downloads';
import type { Track } from '../data/types';

/**
 * Music folders: the songs on the phone (MediaStore), grouped by folder, each folder shown or
 * hidden by the user. They play in Offline Mode next to the downloads. A scan also finds
 * Sonare's own downloads in Music/Sonare that the downloads list doesn't have (after a
 * reinstall, or cleared app data) and gives them back to it, by the id in their file name.
 */

const HIDDEN_KEY = 'sonare.hiddenFolders';
/** Where downloads go by default (the native downloader's DEFAULT_RELATIVE_PATH). */
export const DOWNLOADS_FOLDER = 'Music/Sonare';

export interface MusicFolder {
  path: string;
  name: string;
  songCount: number;
  bytes: number;
  hidden: boolean;
}

interface LocalMusicStore {
  /** 'unknown' until checked; 'denied' covers "not asked yet" too. */
  permission: 'unknown' | MusicPermission;
  songs: DeviceSong[];
  hidden: string[];
  scanning: boolean;
  scannedAt: number | null;
  error: string | null;
  hydrate: () => Promise<void>;
  scan: () => Promise<void>;
  /** Asks for the music permission (a scan follows when it's given). */
  requestAccess: () => Promise<MusicPermission>;
  setHidden: (folder: string, hidden: boolean) => void;
}

// cyrb53, as desktop/src/storage/local.ts uses for its file ids.
const hash = (s: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

/** Stable while the file stays where it is (MediaStore's own id can change on a re-index). */
const localId = (s: DeviceSong) => `local:${hash(`${s.folder}/${s.fileName}`)}`;

/** A Sonare download, recognised by the id in its name. */
const isOwnDownload = (s: DeviceSong) => s.folder === DOWNLOADS_FOLDER && idInFileName(s.fileName) !== null;

const toFound = (s: DeviceSong): FoundDownload => ({
  id: idInFileName(s.fileName)!,
  title: s.title,
  artist: s.artist ?? 'Unknown artist',
  album: s.album,
  durationMs: s.durationMs || null,
  uri: s.uri,
  fileName: s.fileName,
  size: s.size,
  modifiedAt: s.modifiedAt,
});

export const deviceTrack = (s: DeviceSong): Track => ({
  id: localId(s),
  title: s.title || s.fileName.replace(/\.[^.]+$/, ''),
  artistId: '',
  artist: s.artist ?? 'Unknown artist',
  albumId: null,
  album: s.album,
  durationMs: s.durationMs || null,
  source: 'local',
  codec: null,
  bitrateKbps: null,
  playCount: 0,
  favourite: false,
  addedAt: s.modifiedAt,
});

export const useLocalMusicStore = create<LocalMusicStore>((set, get) => ({
  permission: 'unknown',
  songs: [],
  hidden: [],
  scanning: false,
  scannedAt: null,
  error: null,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(HIDDEN_KEY);
      const hidden = raw ? JSON.parse(raw) : [];
      if (Array.isArray(hidden)) set({ hidden: hidden.filter((f): f is string => typeof f === 'string') });
    } catch {
      // Every folder shows.
    }
    const granted = await hasMusicPermission();
    set({ permission: granted ? 'granted' : 'denied' });
    if (granted) await get().scan();
  },

  scan: async () => {
    if (get().scanning) return;
    set({ scanning: true, error: null });
    try {
      const songs = await SonareLibrary.scan();
      set({ songs, scannedAt: Date.now(), permission: 'granted' });
      const found = songs.filter(isOwnDownload).map(toFound);
      if (found.length) useDownloadsStore.getState().adoptFound(found);
    } catch (e: any) {
      if (e?.code === 'E_PERMISSION') set({ permission: 'denied' });
      else set({ error: e?.message || 'Could not read the music on this phone' });
    } finally {
      set({ scanning: false });
    }
  },

  requestAccess: async () => {
    const result = await requestMusicPermission();
    set({ permission: result });
    if (result === 'granted') await get().scan();
    return result;
  },

  setHidden: (folder, hidden) => {
    const next = hidden ? [...new Set([...get().hidden, folder])] : get().hidden.filter((f) => f !== folder);
    set({ hidden: next });
    AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next)).catch(() => {});
  },
}));

/** The folders that hold songs, with how many and whether they show. */
export const musicFolders = (state: Pick<LocalMusicStore, 'songs' | 'hidden'>): MusicFolder[] => {
  const byPath = new Map<string, MusicFolder>();
  for (const s of state.songs) {
    const path = s.folder || 'Internal storage';
    const f = byPath.get(path) ?? {
      path,
      name: path.split('/').pop() || path,
      songCount: 0,
      bytes: 0,
      hidden: state.hidden.includes(path),
    };
    f.songCount += 1;
    f.bytes += s.size;
    byPath.set(path, f);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
};

/**
 * The phone's songs in folders that aren't hidden, newest first. Sonare's own downloads are
 * left out: they show as downloads of their catalogue songs instead.
 */
export const deviceTracks = (state: Pick<LocalMusicStore, 'songs' | 'hidden'>): Track[] =>
  state.songs
    .filter((s) => !state.hidden.includes(s.folder || 'Internal storage') && !isOwnDownload(s))
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .map(deviceTrack);

/** The content:// uri of a song on the phone (a `local:` id), for the player. */
export const deviceUriFor = (trackId: string): string | null => {
  if (!trackId.startsWith('local:')) return null;
  const song = useLocalMusicStore.getState().songs.find((s) => localId(s) === trackId);
  return song?.uri ?? null;
};

/** Everything that plays without a network: downloads (newest first), then the music folders' songs. */
export const usePhoneTracks = (): Track[] => {
  const downloads = useDownloadsStore((state) => state.items);
  const songs = useLocalMusicStore((state) => state.songs);
  const hidden = useLocalMusicStore((state) => state.hidden);
  return useMemo(
    () => [...downloadedTracks(downloads), ...deviceTracks({ songs, hidden })],
    [downloads, songs, hidden],
  );
};
