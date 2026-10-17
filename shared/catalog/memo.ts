import type { createCatalog } from './catalog';

type Catalog = ReturnType<typeof createCatalog>;

/** How long the apps reuse an answer from YouTube; the backend keeps these in Redis instead. */
export const CATALOG_MEMO_TTL_MS = {
  trending: 30 * 60_000,
  search: 10 * 60_000,
};

const MAX_ENTRIES = 50;

/**
 * The in-app catalog with trending and search answers kept in memory for a while, so going back
 * to Home or searching the same words again doesn't download them from YouTube again. Failures
 * aren't kept.
 */
export const memoizeCatalog = (catalog: Catalog, now: () => number = Date.now): Catalog => {
  const entries = new Map<string, { at: number; value: Promise<unknown> }>();

  const memo = <T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value as Promise<T>;
    const value = load();
    entries.delete(key);
    entries.set(key, { at: now(), value });
    if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  };

  return {
    ...catalog,
    trending: (region, limit) =>
      memo(`trending:${region}:${limit}`, CATALOG_MEMO_TTL_MS.trending, () => catalog.trending(region, limit)),
    search: (q, type, cursor) =>
      memo(`search:${type}:${cursor ?? ''}:${q.trim().toLowerCase()}`, CATALOG_MEMO_TTL_MS.search, () =>
        catalog.search(q, type, cursor),
      ),
  };
};
