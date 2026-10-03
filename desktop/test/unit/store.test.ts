import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { initialSearchState, runSearch, searchKey, setQuery, setType } from '../../src/store/searchSlice';
import { closeQueue, openQueue, toggleQueue, toggleSidebar } from '../../src/store/uiSlice';
import { makeStore } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeTrack, page } from '../helpers/fixtures';

useMockServer();

afterEach(() => vi.useRealTimers());

describe('search slice', () => {
  it('WEB-STORE-001 keeps the typed query and chosen type', () => {
    const store = makeStore();
    store.dispatch(setQuery('radiohead'));
    store.dispatch(setType('albums'));
    expect(store.getState().search).toMatchObject({ query: 'radiohead', type: 'albums', status: 'idle' });
    expect(searchKey('  radiohead ', 'songs')).toBe('songs:radiohead');
  });

  it('WEB-STORE-002 a search goes loading → done and remembers what the results are for', async () => {
    const hit = makeTrack({ title: 'Idioteque' });
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page([hit]))));
    const store = makeStore();
    const run = store.dispatch(runSearch({ query: ' idioteque ', type: 'songs' }));
    expect(store.getState().search.status).toBe('loading');
    await run;
    expect(store.getState().search).toMatchObject({
      status: 'done',
      results: [hit],
      resultsFor: 'songs:idioteque',
      error: null,
    });
  });

  it('WEB-STORE-003 a slow answer to an older search does not overwrite the newer one', async () => {
    let releaseOld!: () => void;
    const oldGate = new Promise<void>((r) => (releaseOld = r));
    server.use(
      http.get(`${API}/search`, async ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')!;
        if (q === 'old') await oldGate;
        return HttpResponse.json(page([makeTrack({ title: q })]));
      }),
    );
    const store = makeStore();
    const older = store.dispatch(runSearch({ query: 'old', type: 'songs' }));
    await store.dispatch(runSearch({ query: 'new', type: 'songs' }));
    releaseOld();
    await older;
    expect(store.getState().search.resultsFor).toBe('songs:new');
    expect(store.getState().search.results.map((r) => (r as { title: string }).title)).toEqual(['new']);
  });

  it('WEB-STORE-004 coming back to the same search does not refetch, but a failed one is retried', async () => {
    let fail = true;
    server.use(
      http.get(`${API}/search`, () =>
        fail ? apiError(502, 'UPSTREAM_UNAVAILABLE', 'Piped down') : HttpResponse.json(page([])),
      ),
    );
    const store = makeStore();
    const rec = recordRequests();
    await store.dispatch(runSearch({ query: 'x', type: 'songs' }));
    expect(store.getState().search).toMatchObject({ status: 'error', error: 'Piped down' });
    fail = false;
    await store.dispatch(runSearch({ query: 'x', type: 'songs' }));
    await store.dispatch(runSearch({ query: 'x', type: 'songs' }));
    rec.stop();
    expect(rec.seen).toHaveLength(2);
    expect(store.getState().search.status).toBe('done');
    // A different type is a different search.
    await store.dispatch(runSearch({ query: 'x', type: 'albums' }));
    expect(store.getState().search.resultsFor).toBe('albums:x');
  });

  it('WEB-STORE-005 starts empty', () => {
    expect(initialSearchState).toEqual({
      query: '',
      type: 'songs',
      results: [],
      resultsFor: null,
      requested: null,
      status: 'idle',
      error: null,
    });
  });
});

describe('ui slice', () => {
  it('WEB-STORE-006 opens, closes and toggles the queue panel and the sidebar', () => {
    const store = makeStore();
    const ui = () => store.getState().ui;
    store.dispatch(openQueue());
    expect(ui().queueOpen).toBe(true);
    store.dispatch(toggleQueue());
    expect(ui().queueOpen).toBe(false);
    store.dispatch(toggleQueue());
    store.dispatch(closeQueue());
    expect(ui().queueOpen).toBe(false);
    store.dispatch(toggleSidebar());
    expect(ui().sidebarCollapsed).toBe(true);
  });
});

describe('app store persistence', () => {
  async function freshStore() {
    vi.resetModules();
    const mod = await import('../../src/store/index');
    const slice = await import('../../src/store/searchSlice');
    const ui = await import('../../src/store/uiSlice');
    return { ...mod, ...slice, ...ui };
  }

  it('WEB-STORE-007 the search survives a reload for this tab only', async () => {
    let s = await freshStore();
    s.store.dispatch(s.setQuery('blur'));
    s.store.dispatch(s.setType('artists'));
    expect(JSON.parse(sessionStorage.getItem('sonare_search')!)).toEqual({ query: 'blur', type: 'artists' });
    s = await freshStore();
    expect(s.store.getState().search).toMatchObject({ query: 'blur', type: 'artists', results: [], status: 'idle' });
  });

  it('WEB-STORE-008 an unknown saved search type is ignored', async () => {
    sessionStorage.setItem('sonare_search', JSON.stringify({ query: 'q', type: 'videos' }));
    const s = await freshStore();
    expect(s.store.getState().search).toMatchObject({ query: 'q', type: 'songs' });
    sessionStorage.setItem('sonare_search', '{broken');
    expect((await freshStore()).store.getState().search.query).toBe('');
  });

  it('WEB-STORE-009 the collapsed sidebar is remembered across restarts', async () => {
    let s = await freshStore();
    expect(s.store.getState().ui.sidebarCollapsed).toBe(false);
    s.store.dispatch(s.toggleSidebar());
    expect(localStorage.getItem('sonare_sidebar_collapsed')).toBe('true');
    s = await freshStore();
    expect(s.store.getState().ui.sidebarCollapsed).toBe(true);
    // The queue panel is not a preference: it always starts closed.
    expect(s.store.getState().ui.queueOpen).toBe(false);
  });
});

describe('toasts', () => {
  async function fresh() {
    vi.resetModules();
    return import('../../src/store/toastStore');
  }

  it('WEB-STORE-010 a toast shows, then dismisses itself after its duration', async () => {
    vi.useFakeTimers();
    const t = await fresh();
    const { result } = renderHook(() => t.useToasts());
    act(() => t.showToast({ title: 'Saved' }, 1000));
    expect(result.current.map((x) => x.title)).toEqual(['Saved']);
    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toHaveLength(0);
  });

  it('WEB-STORE-011 keeps only the three newest toasts and can dismiss one early', async () => {
    vi.useFakeTimers();
    const t = await fresh();
    const { result } = renderHook(() => t.useToasts());
    act(() => {
      for (const title of ['a', 'b', 'c', 'd']) t.showToast({ title, variant: 'gold' });
    });
    expect(result.current.map((x) => x.title)).toEqual(['b', 'c', 'd']);
    act(() => t.dismissToast(result.current[1].id));
    expect(result.current.map((x) => x.title)).toEqual(['b', 'd']);
  });
});
