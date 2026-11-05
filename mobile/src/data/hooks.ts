import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from './api';
import { ApiError } from '../../../shared/api/client';
import type { Track, Page } from './types';
import { fetchAllPages } from '../../../shared/api/pages';

/**
 * The last result of each cached loader (useAsync's `cacheKey`, usePagedTracks' first page), so a
 * screen opened again shows what it had at once and refreshes it quietly instead of spinning.
 */
const cache = new Map<string, unknown>();
const MAX_CACHED = 60;

const remember = (key: string, value: unknown) => {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
};

export const clearLoaderCache = (): void => cache.clear();

/**
 * A refresh of cached data failed for a reason that says nothing about the data (offline, the
 * server or YouTube down): keep showing it. A clear answer about it (not found, not allowed) is
 * shown instead.
 */
const keepsCached = (err: unknown): boolean => !(err instanceof ApiError && err.status >= 400 && err.status < 500);

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Run an async loader and track its result. `deps` re-run it; `refetchOnFocus` re-runs it
 * whenever the screen comes back into view (lists the user can change from elsewhere).
 *
 * With a `cacheKey`, the last result for the same deps shows straight away (no spinner) while a
 * fresh one loads; if that refresh fails, what is shown stays and no error appears.
 */
export const useAsync = <T>(
  load: () => Promise<T>,
  deps: unknown[],
  {
    enabled = true,
    refetchOnFocus = false,
    cacheKey,
  }: { enabled?: boolean; refetchOnFocus?: boolean; cacheKey?: string } = {},
): AsyncState<T> => {
  const depKey = JSON.stringify(deps);
  const key = cacheKey ? `${cacheKey}:${depKey}` : null;
  const [data, setData] = useState<T | null>(() =>
    enabled && key ? ((cache.get(key) as T | undefined) ?? null) : null,
  );
  const [loading, setLoading] = useState(enabled && !(key && cache.has(key)));
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let live = true;
    const quiet = !!key && cache.has(key);
    if (quiet) setData(cache.get(key!) as T);
    setLoading(!quiet);
    setError(null);
    loadRef
      .current()
      .then((res) => {
        if (key) remember(key, res);
        if (live) setData(res);
      })
      .catch((err) => {
        if (quiet && !keepsCached(err)) cache.delete(key!);
        if (!live || (quiet && keepsCached(err))) return;
        if (quiet) setData(null);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [enabled, nonce, depKey, key]);

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
  const depKey = JSON.stringify([filter, sort, ...deps]);
  // The first page as it was last time, shown at once while it reloads (see `cache`).
  const firstKey = `libraryTracks:${depKey}`;
  const firstPage = enabled ? (cache.get(firstKey) as Page<Track> | undefined) : undefined;
  const [items, setItems] = useState<Track[]>(() => firstPage?.items ?? []);
  const itemsRef = useRef<Track[]>([]);
  itemsRef.current = items;
  const [total, setTotal] = useState<number | null>(() => firstPage?.meta?.total ?? null);
  const [loading, setLoading] = useState(enabled && !firstPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(() => firstPage?.meta?.nextCursor);
  const cursorRef = useRef<string | undefined>(undefined);
  cursorRef.current = cursor;
  const [nonce, setNonce] = useState(0);
  const generation = useRef(0);
  const lastDepKey = useRef<string | null>(null);

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
    const cached = cache.get(firstKey) as Page<Track> | undefined;
    setLoading(!cached);
    setError(null);
    setLoadMoreError(null);
    if (!isRefetch) {
      setItems(cached?.items ?? []);
      setCursor(cached?.meta?.nextCursor);
      setTotal(cached?.meta?.total ?? null);
    }
    api
      .libraryTracks({ filter, sort, limit: PAGE })
      .then((page: Page<Track>) => {
        remember(firstKey, page);
        if (gen !== generation.current) return;
        setItems(page.items);
        setCursor(page.meta?.nextCursor);
        setTotal(page.meta?.total ?? null);
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return;
        // A failed refresh of a list already on show keeps it, without an error.
        if (cached && keepsCached(err)) return;
        cache.delete(firstKey);
        if (cached) setItems([]);
        setError(asError(err));
      })
      .finally(() => {
        if (gen === generation.current) setLoading(false);
      });
  }, [enabled, nonce, depKey, firstKey, filter, sort]);

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
    // What we already have, plus every page still to come (none when nothing more is pending).
    const all = await fetchAllPages((next) => api.libraryTracks({ filter, sort, limit: PAGE, cursor: next }), {
      items: itemsRef.current,
      cursor: cursorRef.current,
    });
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
