import { create } from 'zustand';
import { api } from '../data/api';
import type { Playlist, Track } from '../data/types';

/**
 * The signed-in user's favourites and playlists, shared so a heart toggled on one screen
 * shows on every other. Loaded after sign-in; cleared on sign-out.
 */
interface LibraryStore {
  favouriteIds: Record<string, true>;
  playlists: Playlist[];
  load: () => Promise<void>;
  reset: () => void;
  isFavourite: (trackId: string) => boolean;
  toggleFavourite: (track: Track) => Promise<void>;
  reloadPlaylists: () => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  favouriteIds: {},
  playlists: [],

  load: async () => {
    const [favs, lists] = await Promise.all([
      api.favourites().catch(() => null),
      api.myPlaylists().catch(() => null),
    ]);
    set({
      ...(favs && { favouriteIds: Object.fromEntries(favs.items.map(t => [t.id, true as const])) }),
      ...(lists && { playlists: lists.items }),
    });
  },

  reset: () => set({ favouriteIds: {}, playlists: [] }),

  isFavourite: (trackId) => !!get().favouriteIds[trackId],

  toggleFavourite: async (track) => {
    const next = !get().favouriteIds[track.id];
    const apply = (on: boolean) =>
      set(state => {
        const ids = { ...state.favouriteIds };
        if (on) ids[track.id] = true;
        else delete ids[track.id];
        return { favouriteIds: ids };
      });
    // Optimistic; undone if the server refuses.
    apply(next);
    try {
      await api.setFavourite(track.id, next);
    } catch (e) {
      apply(!next);
      throw e;
    }
  },

  reloadPlaylists: async () => {
    const lists = await api.myPlaylists();
    set({ playlists: lists.items });
  },

  createPlaylist: async (name) => {
    const playlist = await api.createPlaylist(name);
    set(state => ({ playlists: [playlist, ...state.playlists] }));
    return playlist;
  },

  addToPlaylist: async (playlistId, track) => {
    await api.addToPlaylist(playlistId, [track.id]);
    await get().reloadPlaylists().catch(() => {});
  },
}));
