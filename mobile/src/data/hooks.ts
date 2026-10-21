import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from './api';
import type { Track, Page } from './types';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Run an async loader and track its result. `deps` re-run it; `refetchOnFocus` re-runs it
 * whenever the screen comes back into view (lists the user can change from elsewhere).
 */
export const useAsync = <T>(
  load: () => Promise<T>,
  deps: unknown[],
  { enabled = true, refetchOnFocus = false }: { enabled?: boolean; refetchOnFocus?: boolean } = {},
): AsyncState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const depKey = JSON.stringify(deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then((res) => live && setData(res))
      .catch((err) => live && setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [enabled, nonce, depKey]);

  // Skip the first focus: the effect above already loaded on mount.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!enabled || !refetchOnFocus) return;
      if (focusedOnce.current) refetch();
      focusedOnce.current = true;
    }, [enabled, refetchOnFocus, refetch]),
  );

  return { data, loading, error, refetch };
};

export type LibrarySort = 'addedAt' | 'playCount' | 'title' | 'artist' | 'album' | 'durationMs';

export interface PagedTracksState {
  items: Track[];
  total: number | null;
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  loadMoreError: Error | null;
  hasMore: boolean;
  refetch: () => void;
  loadMore: () => void;
  /** Fetches every remaining page and returns the full list (for Play all / Shuffle). */
  loadAll: () => Promise<Track[]>;
}

/**
 * Paged list of library tracks. The first page (limit 100) loads on mount and whenever `deps`
 * change. `onEndReached` → `loadMore()`. Pull-to-refresh → `refetch()`. `loadAll()` fetches
 * every remaining page and returns the complete list.
 */
export const usePagedTracks = (
  filter: 'all' | 'liked',
  sort: LibrarySort,
  deps: unknown[],
  { enabled = true, refetchOnFocus = false }: { enabled?: boolean; refetchOnFocus?: boolean } = {},
): PagedTracksState => {
  const PAGE = 100;
  const [items, setItems] = useState<Track[]>([]);
  const itemsRef = useRef<Track[]>([]);
  itemsRef.current = items;
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const cursorRef = useRef<string | undefined>(undefined);
  cursorRef.current = cursor;
  const [nonce, setNonce] = useState(0);
  const generation = useRef(0);
  const lastDepKey = useRef<string | null>(null);
  const depKey = JSON.stringify([filter, sort, ...deps]);

  const asError = (err: unknown) => (err instanceof Error ? err : new Error(String(err)));

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  // Skip the first focus: initial effect loaded on mount / enabled toggle.
  const focusedOnce = useRef(false);

  useEffect(() => {
    const gen = ++generation.current;
    if (!enabled) {
      setLoading(false);
      setItems([]);
      setTotal(null);
      setCursor(undefined);
      lastDepKey.current = null;
      focusedOnce.current = false;
      return;
    }
    const isRefetch = lastDepKey.current === depKey;
    lastDepKey.current = depKey;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    if (!isRefetch) {
      setItems([]);
      setCursor(undefined);
      setTotal(null);
    }
    api
      .libraryTracks({ filter, sort, limit: PAGE })
      .then((page: Page<Track>) => {
        if (gen !== generation.current) return;
        setItems(page.items);
        setCursor(page.meta?.nextCursor);
        setTotal(page.meta?.total ?? null);
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return;
        setError(asError(err));
      })
      .finally(() => {
        if (gen === generation.current) setLoading(false);
      });
  }, [enabled, nonce, depKey, filter, sort]);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus || !enabledRef.current) return;
      if (focusedOnce.current) refetch();
      focusedOnce.current = true;
    }, [refetchOnFocus, refetch]),
  );

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore || loading) return;
    const gen = generation.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    api
      .libraryTracks({ filter, sort, limit: PAGE, cursor })
      .then((page: Page<Track>) => {
        if (gen !== generation.current) return;
        // Drop ids already in the list (pages can overlap by one).
        setItems((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          return [...prev, ...page.items.filter((t) => !seen.has(t.id))];
        });
        setCursor(page.meta?.nextCursor);
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return;
        setLoadMoreError(asError(err));
      })
      .finally(() => {
        if (gen === generation.current) setLoadingMore(false);
      });
  }, [cursor, loadingMore, loading, filter, sort]);

  const loadAll = useCallback(async (): Promise<Track[]> => {
    const gen = generation.current;
    // Return what we already have if nothing more is pending; else fetch every remaining page.
    let all: Track[] = [...itemsRef.current];
    let next = cursorRef.current;
    while (next) {
      const page: Page<Track> = await api.libraryTracks({ filter, sort, limit: PAGE, cursor: next });
      const seen = new Set(all.map((t) => t.id));
      const fresh = page.items.filter((t) => !seen.has(t.id));
      all = [...all, ...fresh];
      next = page.meta?.nextCursor;
    }
    // If the generation changed while it was fetching (sort/filter/user changed), don't write its result into state; just return it.
    if (gen === generation.current) {
      setItems(all);
      setCursor(undefined);
    }
    return all;
  }, [filter, sort]);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore: !!cursor,
    refetch,
    loadMore,
    loadAll,
  };
};
