import { create } from 'zustand';
import { api } from '../data/api';
import type { Playlist, Track } from '../data/types';

/**
 * The signed-in user's favourites, playlists and followed artists, shared so a heart toggled on one screen
 * shows on every other. Loaded after sign-in; cleared on sign-out.
 */
interface LibraryStore {
  favouriteIds: Record<string, true>;
  playlists: Playlist[];
  followingArtistIds: Record<string, true>;
  load: () => Promise<void>;
  reset: () => void;
  isFavourite: (trackId: string) => boolean;
  toggleFavourite: (track: Track) => Promise<void>;
  isArtistFollowed: (artistId: string) => boolean;
  setArtistFollowed: (artistId: string, following: boolean) => void;
  reloadPlaylists: () => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  /** Rejects if the server refuses; the playlist stays listed until it is really gone. */
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
}

/** Artist pages from the in-app catalog can't ask the backend who you follow; this list answers. */
const followKey = (artistId: string) => (artistId.startsWith('yt:') ? artistId : `yt:${artistId}`);

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  favouriteIds: {},
  playlists: [],
  followingArtistIds: {},

  load: async () => {
    const [favs, lists, artists] = await Promise.all([
      api.favourites().catch(() => null),
      api.myPlaylists().catch(() => null),
      api.libraryArtists().catch(() => null),
    ]);
    set({
      ...(favs && {
        favouriteIds: Object.fromEntries(favs.items.map((t) => [t.id, true as const])),
      }),
      ...(lists && { playlists: lists.items }),
      // The library also lists artists of liked songs; only `following` ones are followed.
      ...(artists && {
        followingArtistIds: Object.fromEntries(
          artists.items.filter((a) => a.following).map((a) => [followKey(a.id), true as const]),
        ),
      }),
    });
  },

  reset: () => set({ favouriteIds: {}, playlists: [], followingArtistIds: {} }),

  isFavourite: (trackId) => !!get().favouriteIds[trackId],

  isArtistFollowed: (artistId) => !!get().followingArtistIds[followKey(artistId)],

  setArtistFollowed: (artistId, following) =>
    set((state) => {
      const next = { ...state.followingArtistIds };
      if (following) next[followKey(artistId)] = true;
      else delete next[followKey(artistId)];
      return { followingArtistIds: next };
    }),

  toggleFavourite: async (track) => {
    const next = !get().favouriteIds[track.id];
    const apply = (on: boolean) =>
      set((state) => {
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
    set((state) => ({ playlists: [playlist, ...state.playlists] }));
    return playlist;
  },

  deletePlaylist: async (id) => {
    await api.deletePlaylist(id);
    set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }));
  },

  addToPlaylist: async (playlistId, track) => {
    await api.addToPlaylist(playlistId, [track.id]);
    await get()
      .reloadPlaylists()
      .catch(() => {});
  },
}));
