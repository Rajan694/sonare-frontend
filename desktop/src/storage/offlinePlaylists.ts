import { useSyncExternalStore } from 'react';
import { api } from '../api/api';
import { getCurrentUser, onAuthChange } from '../api/auth';
import type { Playlist, Track } from '../types';

/**
 * The user's own playlists and their songs, kept for Offline Mode (audit I7). The server
 * list is saved whenever it loads, and each playlist's songs when the playlist is opened;
 * playlists whose `updatedAt` changed since they were saved are fetched again so a playlist
 * never opened still works offline. Kept in localStorage, per signed-in user: a different
 * user or a signed-out app sees nothing.
 */

const KEY = 'sonare_offline_playlists';
/** Most playlists refreshed after one list load, so a huge account cannot hammer the server. */
const MAX_REFRESH = 50;
const MAX_SONGS = 5000;

interface SavedSongs {
  /** The playlist's `updatedAt` at the time these songs were saved. */
  updatedAt?: number;
  songs: Track[];
}

interface Stored {
  userId: string;
  playlists: Playlist[];
  songs: Record<string, SavedSongs>;
}

export interface OfflinePlaylists {
  playlists: Playlist[];
  /** Playlist id → its saved songs. */
  songs: Map<string, Track[]>;
}

const EMPTY: OfflinePlaylists = { playlists: [], songs: new Map() };

const read = (): Stored | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || typeof parsed.userId !== 'string' || !Array.isArray(parsed.playlists)) return null;
    return { userId: parsed.userId, playlists: parsed.playlists, songs: parsed.songs ?? {} };
  } catch {
    return null;
  }
};

const view = (data: Stored): OfflinePlaylists => {
  const userId = getCurrentUser()?.id;
  if (!userId || data.userId !== userId) return EMPTY;
  return {
    playlists: data.playlists,
    songs: new Map(Object.entries(data.songs).map(([id, saved]) => [id, saved.songs])),
  };
};

let stored: Stored | null = read();
let snapshot: OfflinePlaylists = stored ? view(stored) : EMPTY;
const listeners = new Set<() => void>();
const fetching = new Set<string>();

const emit = () => {
  snapshot = stored ? view(stored) : EMPTY;
  for (const listener of listeners) listener();
};

const write = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Applies for this session only.
  }
};

/** The own playlists and songs this device remembers for the signed-in user. */
export const getOfflinePlaylists = (): OfflinePlaylists => {
  return stored ? view(stored) : EMPTY;
};

const savedUpdatedAt = (id: string): number | undefined => {
  return stored?.songs[id]?.updatedAt;
};

/** Fetch the songs of playlists that changed since they were saved; one at a time, errors ignored. */
const refreshSongs = async (playlists: Playlist[], userId: string): Promise<void> => {
  const stale = playlists
    .filter((p) => p.id.startsWith('sonare:'))
    .filter((p) => !stored?.songs[p.id] || savedUpdatedAt(p.id) !== p.updatedAt)
    .filter((p) => !fetching.has(p.id))
    .slice(0, MAX_REFRESH);
  for (const playlist of stale) {
    fetching.add(playlist.id);
    try {
      const page = await api.getMyPlaylistTracks(playlist.id);
      if (getCurrentUser()?.id !== userId) return;
      saveOfflinePlaylistSongs(playlist.id, page.items, playlist.updatedAt);
    } catch {
      // Offline, or gone: keep whatever songs were saved.
    } finally {
      fetching.delete(playlist.id);
    }
  }
};

/** Remember the server's own playlist list for Offline Mode, and refresh the songs that changed. */
export const saveOfflinePlaylists = (playlists: Playlist[]): void => {
  const userId = getCurrentUser()?.id;
  if (!userId) return;
  if (!stored || stored.userId !== userId) stored = { userId, playlists: [], songs: {} };
  const kept = new Set(playlists.map((p) => p.id));
  const songs = Object.fromEntries(Object.entries(stored.songs).filter(([id]) => kept.has(id)));
  stored = { userId, playlists, songs };
  write();
  emit();
  void refreshSongs(playlists, userId);
};

/** Remember one playlist's songs, e.g. when the playlist is opened online. */
export const saveOfflinePlaylistSongs = (id: string, songs: Track[], updatedAt?: number): void => {
  const userId = getCurrentUser()?.id;
  if (!userId) return;
  if (!stored || stored.userId !== userId) stored = { userId, playlists: [], songs: {} };
  stored = {
    ...stored,
    songs: {
      ...stored.songs,
      [id]: { updatedAt: updatedAt ?? stored.songs[id]?.updatedAt, songs: songs.slice(0, MAX_SONGS) },
    },
  };
  write();
  emit();
};

export const useOfflinePlaylists = (): OfflinePlaylists => {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => snapshot,
  );
};

// Signing in or out changes whose playlists these are; re-read in case storage changed since.
onAuthChange(() => {
  stored = read();
  emit();
});
