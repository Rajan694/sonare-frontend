import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  notifyHistoryCleared,
  notifyPlaylistsChanged,
  useAsync,
  useAuth,
  useDebounce,
  useFavourites,
  useLibrarySongs,
  useLibraryTracks,
  useLyrics,
  useMostPlayed,
  useMyPlaylists,
  useRecentlyPlayed,
  useSavedPlaylists,
  useNotPlayedLately,
  usePlaylist,
  useSearch,
} from '../../src/api/hooks';
import { setFavourite } from '../../src/api/favourites';
import { clearSession, setSession } from '../../src/api/auth';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeSavedPlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

useMockServer();

afterEach(() => {
  clearSession();
  vi.useRealTimers();
});

describe('useAsync', () => {
  it('WEB-HOOK-001 starts loading, then exposes the data', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42), []));
    expect(result.current).toMatchObject({ loading: true, data: null, error: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
  });

  it('WEB-HOOK-002 exposes a failure as error and stops loading', async () => {
    const boom = new Error('nope');
    const { result } = renderHook(() => useAsync(() => Promise.reject(boom), []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBeNull();
  });

  it('WEB-HOOK-003 refetch runs the request again and clears the previous error', async () => {
    let calls = 0;
    const fn = () => (++calls === 1 ? Promise.reject(new Error('first')) : Promise.resolve('second'));
    const { result } = renderHook(() => useAsync(fn, []));
    await waitFor(() => expect(result.current.error?.message).toBe('first'));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.error).toBeNull();
    expect(calls).toBe(2);
  });

  it('WEB-HOOK-004 when disabled it does not call and shows the initial data', async () => {
    const fn = vi.fn(() => Promise.resolve('x'));
    const { result } = renderHook(() => useAsync(fn, [], { enabled: false, initialData: 'placeholder' }));
    expect(result.current).toMatchObject({ loading: false, data: 'placeholder' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('WEB-HOOK-005 drops a slow response that arrives after the inputs changed', async () => {
    const resolvers: Record<string, (v: string) => void> = {};
    const { result, rerender } = renderHook(
      ({ id }) => useAsync(() => new Promise<string>((r) => (resolvers[id] = r)), [id]),
      {
        initialProps: { id: 'a' },
      },
    );
    rerender({ id: 'b' });
    await act(async () => resolvers.b('B'));
    await act(async () => resolvers.a('A'));
    expect(result.current.data).toBe('B');
  });
});

describe('useDebounce and useSearch', () => {
  it('WEB-HOOK-006 useDebounce only passes on the last value after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'r' } });
    rerender({ v: 'ra' });
    rerender({ v: 'rad' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('r');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('rad');

    // Starting from another value: what was typed before the screen opened waits like the rest.
    const started = renderHook(({ v }) => useDebounce(v, 500, ''), { initialProps: { v: 'tu' } });
    expect(started.result.current).toBe('');
    started.rerender({ v: 'tum' });
    act(() => vi.advanceTimersByTime(500));
    expect(started.result.current).toBe('tum');
  });

  it('WEB-HOOK-007 useSearch sends one trimmed request for the settled query', async () => {
    const rec = recordRequests();
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page([makeTrack({ title: 'Karma Police' })]))));
    const { result, rerender } = renderHook(({ q }) => useSearch(q, 'songs'), { initialProps: { q: '' } });
    rerender({ q: 'karma ' });
    await waitFor(() => expect(result.current.data?.items[0].title).toBe('Karma Police'), { timeout: 2000 });
    rec.stop();
    expect(rec.paths()).toEqual(['GET /search?q=karma&type=songs']);
  });

  it('WEB-HOOK-008 useSearch sends nothing for a blank query', async () => {
    const rec = recordRequests();
    const { result } = renderHook(() => useSearch('   '));
    await new Promise((r) => setTimeout(r, 350));
    rec.stop();
    expect(rec.seen).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });
});

describe('account data', () => {
  it('WEB-HOOK-009 useAuth follows sign-in and sign-out', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    act(() => setSession('a', 'r', testUser));
    expect(result.current.user).toEqual(testUser);
    act(() => clearSession());
    expect(result.current.user).toBeNull();
  });

  it('WEB-HOOK-010 account-only lists are not requested for a guest', async () => {
    const rec = recordRequests();
    const { result } = renderHook(() => useLibraryTracks());
    await new Promise((r) => setTimeout(r, 30));
    rec.stop();
    expect(rec.seen).toHaveLength(0);
    expect(result.current).toMatchObject({ loading: false, data: null });
  });

  it('WEB-HOOK-011 account data loads after sign-in and is cleared on sign-out', async () => {
    const tracks = page([makeTrack({ title: 'Mine' })]);
    server.use(http.get(`${API}/me/library/tracks`, () => HttpResponse.json(tracks)));
    const { result } = renderHook(() => useLibraryTracks({ sort: 'title' }));
    act(() => setSession('a', 'r', testUser));
    await waitFor(() => expect(result.current.data).toEqual(tracks));
    act(() => clearSession());
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it("WEB-HOOK-012 a user's own playlist comes from /me, a public one from the catalog", async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    server.use(
      http.get(`${API}/me/playlists/:id`, () => HttpResponse.json(makePlaylist({ name: 'Mine' }))),
      http.get(`${API}/playlists/:id`, () => HttpResponse.json(makePlaylist({ name: 'Public', kind: 'online' }))),
    );
    const own = renderHook(() => usePlaylist('sonare:p1'));
    const pub = renderHook(() => usePlaylist('yt:PL123'));
    await waitFor(() => expect(own.result.current.data?.name).toBe('Mine'));
    await waitFor(() => expect(pub.result.current.data?.name).toBe('Public'));
    rec.stop();
    expect(rec.paths().sort()).toEqual(['GET /me/playlists/sonare%3Ap1', 'GET /playlists/yt%3APL123']);
  });

  it("WEB-HOOK-013 a guest opening someone's own-playlist link makes no /me request", async () => {
    const rec = recordRequests();
    const { result } = renderHook(() => usePlaylist('sonare:p1'));
    await new Promise((r) => setTimeout(r, 30));
    rec.stop();
    expect(rec.seen).toHaveLength(0);
    expect(result.current.data).toBeNull();
  });

  it('WEB-HOOK-014 useMyPlaylists refetches when playlists change anywhere in the app', async () => {
    setSession('a', 'r', testUser);
    let calls = 0;
    server.use(http.get(`${API}/me/playlists`, () => HttpResponse.json(page([makePlaylist({ name: `v${++calls}` })]))));
    const { result } = renderHook(() => useMyPlaylists());
    await waitFor(() => expect(result.current.data?.items[0].name).toBe('v1'));
    act(() => notifyPlaylistsChanged());
    await waitFor(() => expect(result.current.data?.items[0].name).toBe('v2'));
  });

  it('WEB-HOOK-021 useSavedPlaylists refetches when playlists change anywhere in the app', async () => {
    setSession('a', 'r', testUser);
    let calls = 0;
    server.use(
      http.get(`${API}/me/saved-playlists`, () =>
        HttpResponse.json(page([makeSavedPlaylist({ name: `saved-v${++calls}` })])),
      ),
    );
    const { result } = renderHook(() => useSavedPlaylists());
    await waitFor(() => expect(result.current.data?.items[0].name).toBe('saved-v1'));
    act(() => notifyPlaylistsChanged());
    await waitFor(() => expect(result.current.data?.items[0].name).toBe('saved-v2'));
  });

  it('WEB-HOOK-015 the favourites list refetches after a heart is saved elsewhere', async () => {
    setSession('a', 'r', testUser);
    let favs = [makeTrack({ id: 'yt:f1' })];
    server.use(
      http.get(`${API}/me/favourites/tracks`, () => HttpResponse.json(page(favs))),
      http.put(`${API}/me/favourites/tracks/:id`, ({ params }) => {
        favs = [...favs, makeTrack({ id: String(params.id) })];
        return HttpResponse.json({ ok: true });
      }),
    );
    const { result } = renderHook(() => useFavourites());
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    await act(() => setFavourite('yt:f2', true));
    await waitFor(() => expect(result.current.data?.items.map((t) => t.id)).toEqual(['yt:f1', 'yt:f2']));
  });

  it('WEB-HOOK-016 lyrics for a local file are never requested from the server', async () => {
    const rec = recordRequests();
    const local = renderHook(() => useLyrics({ id: 'local:abc', title: 'Mine', artist: 'Me', durationMs: null }));
    await new Promise((r) => setTimeout(r, 30));
    rec.stop();
    expect(rec.seen).toHaveLength(0);
    expect(local.result.current.loading).toBe(false);
  });

  it('WEB-HOOK-017 lyrics requests name the song; errors surface as the hook error', async () => {
    let asked: URLSearchParams | null = null;
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, ({ request }) => {
        asked = new URL(request.url).searchParams;
        return apiError(404, 'LYRICS_NOT_FOUND', 'No lyrics for this song');
      }),
    );
    const { result } = renderHook(() =>
      useLyrics({ id: 'yt:t1', title: 'Song A', artist: 'Band B', durationMs: 201_000 }),
    );
    await waitFor(() => expect(result.current.error?.message).toBe('No lyrics for this song'));
    // The backend may never have seen a song found in-app: it looks the lyrics up by these.
    expect(Object.fromEntries(asked!)).toMatchObject({ title: 'Song A', artist: 'Band B', durationMs: '201000' });
  });

  it('WEB-HOOK-018 useLibrarySongs: loadAll continues from loaded cursor without refetching first page', async () => {
    setSession('a', 'r', testUser);
    const track1 = makeTrack({ id: 'yt:t1', title: 'Song 1' });
    const track2 = makeTrack({ id: 'yt:t2', title: 'Song 2' });
    server.use(
      http.get(`${API}/me/library/tracks`, ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        if (cursor === 'c1') {
          return HttpResponse.json(page([track2]));
        }
        return HttpResponse.json(page([track1], 'c1'));
      }),
    );
    const { result } = renderHook(() => useLibrarySongs({ filter: 'all', sort: null }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.hasMore).toBe(true);
    expect(result.current.nextCursor).toBe('c1');

    const rec = recordRequests();
    let all: any[] = [];
    await act(async () => {
      all = await result.current.loadAll();
    });

    expect(all).toEqual([track1, track2]);
    // Verifying it did NOT make a request for the first page again (no cursor)
    const paths = rec.paths();
    expect(paths).toContain('GET /me/library/tracks?filter=all&sort=addedAt&limit=100&cursor=c1');
    const firstPageFetches = paths.filter((p) => p.startsWith('GET /me/library/tracks') && !p.includes('cursor='));
    expect(firstPageFetches).toHaveLength(0);
    rec.stop();
  });

  it('WEB-HOOK-019 useLibrarySongs: enabled=false prevents fetching', async () => {
    setSession('a', 'r', testUser);
    const rec = recordRequests();
    const { result } = renderHook(() => useLibrarySongs({ filter: 'all', sort: null, enabled: false }));
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toHaveLength(0);
    expect(rec.paths().filter((p) => p.startsWith('GET /me/library/tracks'))).toHaveLength(0);
    rec.stop();
  });

  it('WEB-HOOK-020 useNotPlayedLately: fetches when signed in and enabled, skips for guests or disabled', async () => {
    const unplayed = makeTrack({ id: 'yt:old', title: 'Old Favourite' });
    server.use(http.get(`${API}/me/not-played-lately`, () => HttpResponse.json(page([unplayed]))));

    // 1. Guest: does not fetch
    const guestRec = recordRequests();
    const { result: guestResult } = renderHook(() => useNotPlayedLately(20));
    await new Promise((r) => setTimeout(r, 30));
    expect(guestResult.current.data).toBeNull();
    expect(guestRec.paths().filter((p) => p.startsWith('GET /me/not-played-lately'))).toHaveLength(0);
    guestRec.stop();

    // 2. Signed in: fetches
    setSession('a', 'r', testUser);
    const authedRec = recordRequests();
    const { result: authedResult } = renderHook(() => useNotPlayedLately(20));
    await waitFor(() => expect(authedResult.current.data?.items).toEqual([unplayed]));
    expect(authedRec.paths()).toContain('GET /me/not-played-lately?limit=20');
    authedRec.stop();

    // 3. Disabled: does not fetch even when signed in
    const disabledRec = recordRequests();
    const { result: disabledResult } = renderHook(() => useNotPlayedLately(20, false));
    await new Promise((r) => setTimeout(r, 30));
    expect(disabledResult.current.loading).toBe(false);
    expect(disabledRec.paths().filter((p) => p.startsWith('GET /me/not-played-lately'))).toHaveLength(0);
    disabledRec.stop();
  });

  it('WEB-HOOK-022 useRecentlyPlayed and useMostPlayed refetch when history is cleared', async () => {
    setSession('a', 'r', testUser);
    let recentCalls = 0;
    let mostCalls = 0;
    server.use(
      http.get(`${API}/me/recently-played`, () => {
        return HttpResponse.json(page([makeTrack({ id: `yt:rec${++recentCalls}` })]));
      }),
      http.get(`${API}/me/most-played`, () => {
        return HttpResponse.json(page([makeTrack({ id: `yt:most${++mostCalls}` })]));
      }),
    );

    const { result: recentRes } = renderHook(() => useRecentlyPlayed());
    const { result: mostRes } = renderHook(() => useMostPlayed());

    await waitFor(() => expect(recentRes.current.data?.items[0].id).toBe('yt:rec1'));
    await waitFor(() => expect(mostRes.current.data?.items[0].id).toBe('yt:most1'));

    act(() => notifyHistoryCleared());

    await waitFor(() => expect(recentRes.current.data?.items[0].id).toBe('yt:rec2'));
    await waitFor(() => expect(mostRes.current.data?.items[0].id).toBe('yt:most2'));
  });
});
