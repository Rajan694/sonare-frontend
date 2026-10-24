import type { Page } from '../apiTypes';

/**
 * Every item of a cursor-paged list, following `meta.nextCursor` to the end; an id already seen
 * is skipped. Pass what a screen has loaded so far (`have`) to fetch only the pages after it.
 */
export const fetchAllPages = async <T extends { id: string }>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  have?: { items: T[]; cursor?: string | null },
): Promise<T[]> => {
  const all = [...(have?.items ?? [])];
  const seen = new Set(all.map((item) => item.id));
  let cursor = have?.cursor ?? undefined;
  // Without `have` the first page is still to come, and it is asked for without a cursor.
  let first = !have;
  while (first || cursor) {
    first = false;
    const page = await fetchPage(cursor);
    for (const item of page.items ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      all.push(item);
    }
    cursor = page.meta?.nextCursor ?? undefined;
  }
  return all;
};
