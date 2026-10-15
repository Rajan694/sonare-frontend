import { useCallback, useEffect, useRef, useState } from 'react';
import type { Page } from '../data/types';

export interface PagedState<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  /** A cursor came back with the last page: there is another one. */
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: Error | null;
  loadMore: () => void;
  refetch: () => void;
}

const asError = (err: unknown): Error => (err instanceof Error ? err : new Error(String(err)));

/** Appends a page, leaving out anything whose id is already listed (a page can overlap the last one). */
const append = <T extends { id: string }>(page: T[], items: T[]): T[] => {
  const seen = new Set(items.map((item) => item.id));
  const next = [...items];
  for (const item of page) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
};

/**
 * A list the server returns a page at a time (`meta.nextCursor`): the first page loads on mount
 * and whenever `deps` change, and `loadMore` fetches the next one and appends it. Only the newest
 * deps' answers count, so a slow reply for an older query can't land on the newer list.
 */
export const usePagedList = <T extends { id: string }>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  deps: unknown[],
  { enabled = true }: { enabled?: boolean } = {},
): PagedState<T> => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const depKey = JSON.stringify(deps);
  /** Bumped for every load of a new first page; older replies are ignored. */
  const generation = useRef(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setCursor(undefined);
    setLoadMoreError(null);
    fetchRef
      .current()
      .then((page) => {
        if (gen !== generation.current) return;
        setItems(page.items);
        setCursor(page.meta?.nextCursor);
      })
      .catch((err) => gen === generation.current && setError(asError(err)))
      .finally(() => gen === generation.current && setLoading(false));
  }, [enabled, nonce, depKey]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    fetchRef
      .current(cursor)
      .then((page) => {
        if (gen !== generation.current) return;
        setItems((prev) => append(page.items, prev));
        setCursor(page.meta?.nextCursor);
      })
      .catch((err) => gen === generation.current && setLoadMoreError(asError(err)))
      .finally(() => gen === generation.current && setLoadingMore(false));
  }, [cursor, loadingMore]);

  return {
    items,
    loading,
    error,
    hasMore: !!cursor,
    loadingMore,
    loadMoreError,
    loadMore,
    refetch,
  };
};
