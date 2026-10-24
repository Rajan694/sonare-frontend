import { create } from 'zustand';
import type { Album, Playlist, SearchItem, Track } from '../data/types';
import { fetchAllPages } from '../../../shared/api/pages';
import { api, isOwnPlaylist } from '../data/api';
import { usePlayerStore } from './player';
import { showSnackbar, songsSubtitle } from './snackbar';

export type CollectionAlbumItem = Album | Extract<SearchItem, { kind: 'album' }>;
export type CollectionPlaylistItem = Playlist | Extract<SearchItem, { kind: 'playlist' }>;

export type CollectionTarget =
  { kind: 'album'; item: CollectionAlbumItem } | { kind: 'playlist'; item: CollectionPlaylistItem };

export const fetchCollectionTracks = async (target: CollectionTarget): Promise<Track[]> => {
  if (target.kind === 'album') {
    return fetchAllPages((cursor) => api.albumTracks(target.item.id, cursor));
  }
  if (isOwnPlaylist(target.item.id)) {
    const res = await api.myPlaylistTracks(target.item.id);
    return res.items ?? [];
  }
  return fetchAllPages((cursor) => api.playlistTracks(target.item.id, cursor));
};

/**
 * Adds a whole album or playlist to the queue from its page: pages the screen hasn't loaded yet
 * are fetched first, so a long playlist isn't cut at its first page. If they can't be loaded,
 * nothing is queued and the snackbar says so.
 */
export const queueCollection = async (target: CollectionTarget, loaded: Track[], hasMore: boolean): Promise<void> => {
  let tracks = loaded;
  if (hasMore) {
    try {
      tracks = await fetchCollectionTracks(target);
    } catch {
      showSnackbar({ title: 'Could not load the songs', subtitle: 'Nothing was added to the queue', icon: 'info' });
      return;
    }
  }
  usePlayerStore.getState().addToQueue(tracks);
  showSnackbar({ title: 'Added to queue', subtitle: songsSubtitle(tracks), icon: 'list' });
};

interface CollectionMenuStore {
  target: CollectionTarget | null;
  view: 'menu' | 'playlists';
  tracks: Track[] | null;
  loading: boolean;
  error: string | null;
  open: (target: CollectionTarget, options?: { view?: 'menu' | 'playlists'; tracks?: Track[] }) => void;
  setView: (view: 'menu' | 'playlists') => void;
  setTracks: (tracks: Track[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadTracks: () => Promise<Track[]>;
  close: () => void;
}

export const useCollectionMenuStore = create<CollectionMenuStore>((set, get) => ({
  target: null,
  view: 'menu',
  tracks: null,
  loading: false,
  error: null,
  open: (target, options) =>
    set({
      target,
      view: options?.view ?? 'menu',
      tracks: options?.tracks ?? null,
      loading: false,
      error: null,
    }),
  setView: (view) => set({ view }),
  setTracks: (tracks) => set({ tracks, loading: false, error: null }),
  setLoading: (loading) => set({ loading, error: null }),
  setError: (error) => set({ error, loading: false }),
  loadTracks: async () => {
    const { target, tracks } = get();
    if (tracks) return tracks;
    if (!target) return [];
    set({ loading: true, error: null });
    try {
      const fetched = await fetchCollectionTracks(target);
      set({ tracks: fetched, loading: false, error: null });
      return fetched;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load tracks';
      set({ error: msg, loading: false });
      throw e;
    }
  },
  close: () => set({ target: null, view: 'menu', tracks: null, loading: false, error: null }),
}));
