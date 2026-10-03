import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  notifyPlaylistsChanged,
  useAsync,
  useAuth,
  useDebounce,
  useFavourites,
  useLibraryTracks,
  useLyrics,
  useMyPlaylists,
  usePlaylist,
  useSearch,
} from '../../src/data/hooks';
import { setFavourite } from '../../src/data/favourites';
import { clearSession, setSession } from '../../src/data/auth';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

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
  });

  it('WEB-HOOK-007 useSearch sends one trimmed request for the final query', async () => {
    const rec = recordRequests();
    server.use(http.get(`${API}/search`, () => HttpResponse.json(page([makeTrack({ title: 'Karma Police' })]))));
    const { result, rerender } = renderHook(({ q }) => useSearch(q, 'songs'), { initialProps: { q: '' } });
    rerender({ q: 'ka' });
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
    const local = renderHook(() => useLyrics('local:abc'));
    await new Promise((r) => setTimeout(r, 30));
    rec.stop();
    expect(rec.seen).toHaveLength(0);
    expect(local.result.current.loading).toBe(false);
  });

  it('WEB-HOOK-017 lyrics errors surface as the hook error', async () => {
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, () => apiError(404, 'LYRICS_NOT_FOUND', 'No lyrics for this song')),
    );
    const { result } = renderHook(() => useLyrics('yt:t1'));
    await waitFor(() => expect(result.current.error?.message).toBe('No lyrics for this song'));
  });
});
