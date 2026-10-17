import { describe, expect, it, vi } from 'vitest';
import type { createCatalog } from '../../../../shared/catalog/catalog';
import { CATALOG_MEMO_TTL_MS, memoizeCatalog } from '../../../../shared/catalog/memo';

type Catalog = ReturnType<typeof createCatalog>;

const fakeCatalog = () => {
  const trending = vi.fn(async () => ({ items: [], meta: {} }));
  const search = vi.fn(async (q: string) => ({ items: [], meta: { q } }));
  return { catalog: { trending, search, album: vi.fn() } as unknown as Catalog, trending, search };
};

describe('memoizeCatalog', () => {
  it('WEB-CAT-084 trending and search answers are reused until they expire; failures are not kept', async () => {
    let t = 0;
    const { catalog, trending, search } = fakeCatalog();
    const memo = memoizeCatalog(catalog, () => t);

    await memo.trending('IN', 20);
    await memo.trending('IN', 20);
    expect(trending).toHaveBeenCalledTimes(1);
    t += CATALOG_MEMO_TTL_MS.trending + 1;
    await memo.trending('IN', 20);
    expect(trending).toHaveBeenCalledTimes(2);

    await memo.search('Tum Hi Ho ', 'songs');
    await memo.search('tum hi ho', 'songs');
    expect(search).toHaveBeenCalledTimes(1);
    await memo.search('tum hi ho', 'albums');
    expect(search).toHaveBeenCalledTimes(2);

    search.mockRejectedValueOnce(new Error('offline'));
    await expect(memo.search('kesariya', 'all')).rejects.toThrow('offline');
    await memo.search('kesariya', 'all');
    expect(search).toHaveBeenCalledTimes(4);
    // Everything else passes straight through.
    expect(memo.album).toBe(catalog.album);
  });
});
