import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import { onFavouritesSaved } from './favourites';
import { fetchLyrics } from './lyricsAvailability';
import { getCurrentUser, isAuthReady, onAuthChange, onAuthReady } from './auth';
import { saveOfflinePlaylists } from '../storage/offlinePlaylists';
import type { Page, Track, User } from '../types';
import { useDevicePrefs } from '../storage/devicePrefs';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface PagedList<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  /** Whether the server said there is another page to ask for. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Why the last "Load more" failed; null when the last one worked. */
  moreError: string | null;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * A list that comes in pages: the first page loads on its own (again when `deps` change or
 * `refetch` is called), and `loadMore` appends the next one, dropping anything already shown.
 */
export const usePagedList = <T extends { id: string }>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
): PagedList<T> => {
  const { enabled = true } = options;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  // Bumped for every first page, so a "Load more" answer for the old list is dropped.
  const generation = useRef(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);
  // Same trick as useAsync: a fixed-size dependency array for a caller-chosen list of deps.
  const depKey = JSON.stringify(deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    generation.current += 1;
    setLoading(true);
    setError(null);
    setMoreError(null);
    setNextCursor(null);
    setLoadingMore(false);

    fetchPage()
      .then((page) => {
        if (!isMounted) return;
        setItems(page.items);
        setNextCursor(page.meta?.nextCursor ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, trigger, depKey]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    const asked = generation.current;
    setLoadingMore(true);
    setMoreError(null);
    fetchPage(nextCursor)
      .then((page) => {
        if (asked !== generation.current) return;
        setItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...page.items.filter((item) => !seen.has(item.id))];
        });
        setNextCursor(page.meta?.nextCursor ?? null);
      })
      .catch((err) => {
        if (asked === generation.current) setMoreError(err instanceof Error ? err.message : "Couldn't load more");
      })
      .finally(() => {
        if (asked === generation.current) setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, depKey]);

  return {
    items,
    loading,
    error,
    hasMore: nextCursor !== null,
    loadingMore,
    moreError,
    loadMore,
    refetch,
  };
};

export const useAuth = (): { user: User | null; ready: boolean } => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [ready, setReady] = useState<boolean>(isAuthReady());

  useEffect(() => {
    const unsubAuth = onAuthChange((u) => setUser(u));
    const unsubReady = onAuthReady(() => setReady(true));
    return () => {
      unsubAuth();
      unsubReady();
    };
  }, []);

  return { user, ready };
};

export const useAsync = <T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: { enabled?: boolean; initialData?: T | null } = {},
): AsyncState<T> => {
  const { enabled = true, initialData = null } = options;
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  // Serialize the caller's deps into one string so the effect's dependency array is a
  // fixed size regardless of how many deps a call site passes. Computed inline rather
  // than via useMemo: `deps` is a fresh array literal on every render, so memoising on
  // [deps] would recompute every render anyway while costing an extra hook slot.
  const depKey = JSON.stringify(deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      // e.g. signed out: don't keep showing the previous user's data.
      setData(initialData);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    asyncFn()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, trigger, depKey]);

  return { data, loading, error, refetch };
};

export const useAuthAsync = <T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: { enabled?: boolean; initialData?: T | null; accountOnly?: boolean } = {},
): AsyncState<T> => {
  const { user, ready } = useAuth();
  const { enabled = true, initialData = null, accountOnly = false } = options;

  // Wait for auth to settle during cold boot before firing /me calls, and refetch on user state change.
  // Account-only data isn't asked for at all while listening as a guest.
  const shouldRun = enabled && ready && (!accountOnly || !!user);

  return useAsync(asyncFn, [user?.id, ready, ...deps], { enabled: shouldRun, initialData });
};

export const useDebounce = <T>(value: T, delayMs: number = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);
  return debounced;
};

// Catalog hooks (unauthenticated, immediate)
export const useTrending = (region: string = 'IN', limit: number = 50) => {
  return useAsync(() => api.getTrending(region, limit), [region, limit]);
};

export const useSearch = (
  query: string,
  type: 'songs' | 'albums' | 'artists' | 'playlists' | 'all' = 'all',
  cursor?: string,
  enabled: boolean = true,
) => {
  const debouncedQuery = useDebounce(query.trim(), 300);
  return useAsync(() => api.search(debouncedQuery, type, cursor), [debouncedQuery, type, cursor], {
    enabled: enabled && debouncedQuery.length > 0,
  });
};

/**
 * Autocomplete for the search field, asked for once typing pauses. The previous list stays up
 * while the next one loads, so it doesn't flicker on every keystroke.
 */
export const useSearchSuggestions = (query: string, enabled: boolean = true): string[] => {
  const debouncedQuery = useDebounce(query.trim(), 250);
  const on = enabled && debouncedQuery.length > 0 && debouncedQuery.length <= 200;
  const { data } = useAsync(() => api.searchSuggestions(debouncedQuery), [debouncedQuery], { enabled: on });
  return on && query.trim() ? (data ?? []).slice(0, 8) : [];
};

export const useGenres = () => {
  return useAsync(() => api.getGenres(), []);
};

export const useAlbum = (id: string | undefined) => {
  return useAsync(() => (id ? api.getAlbum(id) : Promise.reject(new Error('Missing album id'))), [id], {
    enabled: !!id,
  });
};

export const useAlbumTracks = (id: string | undefined, cursor?: string) => {
  return useAsync(
    () => (id ? api.getAlbumTracks(id, cursor) : Promise.reject(new Error('Missing album id'))),
    [id, cursor],
    { enabled: !!id },
  );
};

export const useArtist = (id: string | undefined) => {
  return useAsync(() => (id ? api.getArtist(id) : Promise.reject(new Error('Missing artist id'))), [id], {
    enabled: !!id,
  });
};

export const useArtistTopTracks = (id: string | undefined, limit: number = 20) => {
  return useAsync(
    () => (id ? api.getArtistTopTracks(id, limit) : Promise.reject(new Error('Missing artist id'))),
    [id, limit],
    { enabled: !!id },
  );
};

export const useArtistAlbums = (id: string | undefined, cursor?: string) => {
  return useAsync(
    () => (id ? api.getArtistAlbums(id, cursor) : Promise.reject(new Error('Missing artist id'))),
    [id, cursor],
    { enabled: !!id },
  );
};

/** The user's own playlists (contract §8.1 `sonare:` ids) live under /me, not the public catalog. */
const isOwnPlaylist = (id: string) => id.startsWith('sonare:');

export const usePlaylist = (id: string | undefined) => {
  const result = useAuthAsync(
    () =>
      !id
        ? Promise.reject(new Error('Missing playlist id'))
        : isOwnPlaylist(id)
          ? api.getMyPlaylist(id)
          : api.getPlaylist(id),
    [id],
    { enabled: !!id, accountOnly: !!id && isOwnPlaylist(id) },
  );
  // Renamed (or changed) elsewhere, e.g. from the sidebar's menu: show the new name.
  const { refetch } = result;
  const own = !!id && isOwnPlaylist(id);
  useEffect(() => {
    if (!own) return;
    window.addEventListener(PLAYLISTS_CHANGED, refetch);
    return () => window.removeEventListener(PLAYLISTS_CHANGED, refetch);
  }, [refetch, own]);
  return result;
};

export const usePlaylistTracks = (id: string | undefined, cursor?: string, enabled: boolean = true) => {
  return useAuthAsync(
    () =>
      !id
        ? Promise.reject(new Error('Missing playlist id'))
        : isOwnPlaylist(id)
          ? api.getMyPlaylistTracks(id)
          : api.getPlaylistTracks(id, cursor),
    [id, cursor],
    { enabled: enabled && !!id, accountOnly: !!id && isOwnPlaylist(id) },
  );
};

// User /me hooks (wait for auth settlement and react to login)
export const useLibraryTracks = (params?: {
  sort?: 'addedAt' | 'playCount' | 'title';
  order?: 'asc' | 'desc';
  source?: 'all' | 'server';
  cursor?: string;
}) => {
  return useAuthAsync(
    () => api.getLibraryTracks(params),
    [params?.sort, params?.order, params?.source, params?.cursor],
    { accountOnly: true },
  );
};

export const useLibraryAlbums = (cursor?: string) => {
  return useAuthAsync(() => api.getLibraryAlbums(cursor), [cursor], { accountOnly: true });
};

export const useLibraryArtists = (cursor?: string) => {
  return useAuthAsync(() => api.getLibraryArtists(cursor), [cursor], { accountOnly: true });
};

export const useFavourites = (cursor?: string) => {
  const result = useAuthAsync(() => api.getFavouriteTracks(cursor), [cursor], { accountOnly: true });
  const { refetch } = result;
  // A heart toggled anywhere (player, another list) changes this list.
  useEffect(() => onFavouritesSaved(refetch), [refetch]);
  return result;
};

export const useRecentlyPlayed = (limit: number = 20) => {
  return useAuthAsync(() => api.getRecentlyPlayed(limit), [limit], { accountOnly: true });
};

export const useMostPlayed = (params?: { limit?: number; window?: '30d' }) => {
  return useAuthAsync(() => api.getMostPlayed(params), [params?.limit, params?.window], { accountOnly: true });
};

const PLAYLISTS_CHANGED = 'sonare:playlists-changed';

/** Tell every mounted playlist list (sidebar, pickers) to refetch. */
export const notifyPlaylistsChanged = (): void => {
  window.dispatchEvent(new Event(PLAYLISTS_CHANGED));
};

export const useMyPlaylists = (enabled: boolean = true) => {
  const result = useAuthAsync(() => api.getMyPlaylists(), [], { accountOnly: true, enabled });
  const { data, refetch } = result;
  // Keep the server's list for Offline Mode (storage/offlinePlaylists.ts).
  useEffect(() => {
    if (data) saveOfflinePlaylists(data.items);
  }, [data]);
  useEffect(() => {
    window.addEventListener(PLAYLISTS_CHANGED, refetch);
    return () => window.removeEventListener(PLAYLISTS_CHANGED, refetch);
  }, [refetch]);
  return result;
};

export const useLyrics = (
  track: Pick<Track, 'id' | 'title' | 'artist' | 'durationMs'> | null | undefined,
  prefer: 'synced' | 'plain' = 'synced',
) => {
  const { lyricsScript } = useDevicePrefs();
  const trackId = track?.id;
  return useAsync(
    // The same request the Lyrics buttons made when the song started, if there was one.
    () => (track ? fetchLyrics(track, prefer, lyricsScript) : Promise.reject(new Error('Missing track id'))),
    [trackId, prefer, lyricsScript],
    // Local files are unknown to the server; their lyrics come from the file (tags or a .lrc).
    { enabled: !!trackId && !trackId.startsWith('local:') },
  );
};

export const usePeaks = (trackId: string | undefined, bars: number = 150) => {
  return useAsync(
    () => (trackId ? api.getTrackPeaks(trackId, bars) : Promise.reject(new Error('Missing track id'))),
    [trackId, bars],
    { enabled: !!trackId && !trackId.startsWith('local:') },
  );
};
