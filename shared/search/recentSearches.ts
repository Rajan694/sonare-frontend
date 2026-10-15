/** How many recent queries each app keeps (Android and desktop share this logic). */
export const MAX_RECENT_SEARCHES = 10;

/**
 * The newest query first: trimmed, deduped case-insensitively, capped at the limit. An empty
 * query leaves the list alone.
 */
export const addRecentSearch = (list: readonly string[], query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed) return [...list];
  const key = trimmed.toLowerCase();
  return [trimmed, ...list.filter((entry) => entry.toLowerCase() !== key)].slice(0, MAX_RECENT_SEARCHES);
};

export const removeRecentSearch = (list: readonly string[], query: string): string[] => {
  return list.filter((entry) => entry !== query);
};

/** Keep only usable queries from whatever was stored; used when reading the phone's copy. */
export const sanitizeRecentSearches = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    if (out.some((kept) => kept.toLowerCase() === trimmed.toLowerCase())) continue;
    out.push(trimmed);
    if (out.length >= MAX_RECENT_SEARCHES) break;
  }
  return out;
};
