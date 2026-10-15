import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '../data/api';
import { useAuthStore } from '../data/auth';
import { useLibraryStore } from './library';
import type { Playlist, Track } from '../data/types';

/**
 * The signed-in user's own playlists, kept on the phone so Offline Mode still shows them: the
 * list itself, and each playlist's songs as the last online load had them. Only the songs that
 * play without a network are offered offline (see `playablePlaylistTracks`). A different user, or
 * no one signed in, sees nothing.
 *
 * The playlists come from `useLibraryStore` (it reloads them), watched here rather than inside it.
 * After a reload, playlists whose `updatedAt` moved are read again, one at a time, so a playlist
 * never opened online still works offline.
 */

const STORAGE_KEY = 'sonare.offlinePlaylists';
/** A reload only re-reads this many playlists' songs. */
const MAX_REFRESH = 50;

interface Saved {
  userId: string | null;
  playlists: Playlist[];
  /** Each playlist's songs, by playlist id. */
  tracks: Record<string, Track[]>;
  /** The playlist's `updatedAt` when its songs were saved here. */
  savedAt: Record<string, number>;
}

interface OfflinePlaylistsStore {
  /** The user the lists below belong to; null when nobody is signed in. */
  userId: string | null;
  playlists: Playlist[];
  tracks: Record<string, Track[]>;
  hydrate: () => Promise<void>;
  /** Keeps a playlist's songs, e.g. the ones the playlist screen just loaded. */
  rememberTracks: (playlistId: string, tracks: Track[]) => void;
  /** Forgets everything; the next sign-in starts again. */
  reset: () => void;
}

const empty = (userId: string | null): Saved => ({ userId, playlists: [], tracks: {}, savedAt: {} });

/** What is on the phone; written as a whole, it is small. */
let saved: Saved = empty(null);
let listening = false;

const currentUserId = () => useAuthStore.getState().user?.id ?? null;

const persist = () => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
};

/** The saved copy for this user, starting fresh when someone else was saved before. */
const forUser = (userId: string): Saved => {
  if (saved.userId !== userId) saved = empty(userId);
  return saved;
};

export const useOfflinePlaylistsStore = create<OfflinePlaylistsStore>((set) => {
  /** Shows the signed-in user's saved lists, and nothing for anyone else. */
  const apply = () => {
    const userId = currentUserId();
    const mine = userId && saved.userId === userId ? saved : empty(userId);
    set({ userId, playlists: mine.playlists, tracks: mine.tracks });
  };

  /**
   * Reads the songs of playlists whose `updatedAt` changed since they were saved. One at a time,
   * so a long list can't flood the network; a failure leaves that playlist's saved songs alone.
   */
  const refreshChanged = async (playlists: Playlist[]) => {
    const changed = playlists.filter((p) => saved.savedAt[p.id] !== (p.updatedAt ?? 0)).slice(0, MAX_REFRESH);
    for (const playlist of changed) {
      if (saved.userId !== currentUserId()) return;
      try {
        const page = await api.myPlaylistTracks(playlist.id);
        useOfflinePlaylistsStore.getState().rememberTracks(playlist.id, page.items);
      } catch {
        // Offline, or the playlist is gone; whatever was saved stays.
      }
    }
  };

  /** The playlists the library just reloaded are what the phone keeps. */
  const syncLists = (playlists: Playlist[]) => {
    const userId = currentUserId();
    if (!userId) return;
    const mine = forUser(userId);
    const ids = new Set(playlists.map((p) => p.id));
    // A playlist that is gone takes its saved songs with it.
    for (const key of Object.keys(mine.tracks)) {
      if (ids.has(key)) continue;
      delete mine.tracks[key];
      delete mine.savedAt[key];
    }
    mine.playlists = playlists;
    apply();
    persist();
    refreshChanged(playlists);
  };

  const watch = () => {
    if (listening) return;
    listening = true;
    useLibraryStore.subscribe((state, prev) => {
      if (state.playlists !== prev.playlists) syncLists(state.playlists);
    });
    useAuthStore.subscribe((state, prev) => {
      if (state.user?.id !== prev.user?.id) apply();
    });
  };

  return {
    userId: null,
    playlists: [],
    tracks: {},

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored = raw ? JSON.parse(raw) : null;
        if (stored && Array.isArray(stored.playlists)) {
          saved = {
            userId: typeof stored.userId === 'string' ? stored.userId : null,
            playlists: stored.playlists,
            tracks: stored.tracks ?? {},
            savedAt: stored.savedAt ?? {},
          };
        }
      } catch {
        // Nothing stored, or unreadable: start empty.
      }
      watch();
      apply();
    },

    rememberTracks: (playlistId, tracks) => {
      const userId = currentUserId();
      if (!userId) return;
      const mine = forUser(userId);
      mine.tracks = { ...mine.tracks, [playlistId]: tracks };
      const list = mine.playlists.find((p) => p.id === playlistId);
      mine.savedAt[playlistId] = list?.updatedAt ?? 0;
      apply();
      persist();
    },

    reset: () => {
      saved = empty(null);
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      apply();
    },
  };
});

/**
 * The saved songs of a playlist that play on this phone now, each as the copy to play: a
 * downloaded song (its file) or a song in a music folder. `hidden` counts the rest, the ones that
 * would need the internet.
 */
export const playablePlaylistTracks = (
  savedTracks: Track[],
  phoneTracks: Track[],
): { playable: Track[]; hidden: number } => {
  const onPhone = new Map(phoneTracks.map((track) => [track.id, track]));
  const playable = savedTracks.map((track) => onPhone.get(track.id)).filter((track): track is Track => !!track);
  return { playable, hidden: savedTracks.length - playable.length };
};
