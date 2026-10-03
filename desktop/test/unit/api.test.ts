import { afterEach, describe, expect, it } from 'vitest';
import { api, ApiError, loadErrorMessage } from '../../src/api/api';
import { clearSession, getAccessToken, getCurrentUser, setSession } from '../../src/api/auth';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeTrack, page, testUser } from '../helpers/fixtures';

useMockServer();

afterEach(() => clearSession());

describe('api client: request building', () => {
  it('WEB-API-001 tags every request with X-Sonare-Client and sends no token as a guest', async () => {
    let headers: Headers | undefined;
    server.use(
      http.get(`${API}/genres`, ({ request }) => {
        headers = request.headers;
        return HttpResponse.json([]);
      }),
    );
    await api.getGenres();
    expect(headers?.get('x-sonare-client')).toBe('web');
    expect(headers?.has('authorization')).toBe(false);
  });

  it('WEB-API-002 sends the access token as a Bearer header once signed in', async () => {
    setSession('access-1', 'refresh-1', testUser);
    let auth: string | null = null;
    server.use(
      http.get(`${API}/me`, ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json(testUser);
      }),
    );
    await expect(api.getMe()).resolves.toEqual(testUser);
    expect(auth).toBe('Bearer access-1');
  });

  it('WEB-API-003 drops empty, null and undefined params but keeps 0 and false', async () => {
    const rec = recordRequests();
    server.use(http.get(`${API}/me/library/tracks`, () => HttpResponse.json(page([]))));
    await api.getLibraryTracks({ sort: 'title', order: undefined, cursor: '' });
    server.use(http.get(`${API}/me/recently-played`, () => HttpResponse.json(page([]))));
    await api.getRecentlyPlayed(0);
    rec.stop();
    expect(rec.paths()).toEqual(['GET /me/library/tracks?sort=title', 'GET /me/recently-played?limit=0']);
  });

  it('WEB-API-004 URL-encodes ids that contain reserved characters', async () => {
    const rec = recordRequests();
    server.use(http.get(`${API}/tracks/:id`, ({ params }) => HttpResponse.json(makeTrack({ id: String(params.id) }))));
    const t = await api.getTrack('yt:a/b?c');
    rec.stop();
    expect(new URL(rec.seen[0].url).pathname).toBe('/api/v1/tracks/yt%3Aa%2Fb%3Fc');
    expect(t.id).toBe('yt:a/b?c');
  });

  it('WEB-API-005 sends JSON bodies with a JSON content type', async () => {
    let body: unknown;
    let type: string | null = null;
    server.use(
      http.post(`${API}/me/playlists`, async ({ request }) => {
        type = request.headers.get('content-type');
        body = await request.json();
        return HttpResponse.json({ id: 'sonare:new', name: 'Road trip' });
      }),
    );
    const created = await api.createPlaylist({ name: 'Road trip', kind: 'online' });
    expect(type).toBe('application/json');
    expect(body).toEqual({ name: 'Road trip', kind: 'online' });
    expect(created.id).toBe('sonare:new');
  });

  it('WEB-API-006 uses PUT to save and DELETE to remove favourites and follows', async () => {
    const rec = recordRequests();
    server.use(http.all(`${API}/me/*`, () => HttpResponse.json({ ok: true })));
    await api.setTrackFavourite('yt:t1', true);
    await api.setTrackFavourite('yt:t1', false);
    await api.setAlbumFavourite('yt:a1', true);
    await api.setArtistFollowing('yt:r1', false);
    rec.stop();
    expect(rec.paths()).toEqual([
      'PUT /me/favourites/tracks/yt%3At1',
      'DELETE /me/favourites/tracks/yt%3At1',
      'PUT /me/favourites/albums/yt%3Aa1',
      'DELETE /me/following/artists/yt%3Ar1',
    ]);
  });

  it('WEB-API-007 removes and reorders playlist tracks with the documented verbs and bodies', async () => {
    const calls: { method: string; path: string; body: unknown }[] = [];
    server.use(
      http.all(`${API}/me/playlists/:id/*`, async ({ request }) => {
        calls.push({ method: request.method, path: new URL(request.url).pathname, body: await request.json() });
        return HttpResponse.json({ ok: true });
      }),
    );
    await api.removeTracksFromPlaylist('sonare:p1', { index: 2 });
    await api.reorderPlaylistTracks('sonare:p1', { from: 0, to: 3 });
    await api.addTracksToPlaylist('sonare:p1', ['yt:a', 'yt:b']);
    expect(calls).toEqual([
      { method: 'DELETE', path: '/api/v1/me/playlists/sonare%3Ap1/tracks', body: { index: 2 } },
      { method: 'PATCH', path: '/api/v1/me/playlists/sonare%3Ap1/tracks/order', body: { from: 0, to: 3 } },
      { method: 'POST', path: '/api/v1/me/playlists/sonare%3Ap1/tracks', body: { trackIds: ['yt:a', 'yt:b'] } },
    ]);
  });

  it('WEB-API-008 passes stream quality and format through to /tracks/:id/stream', async () => {
    const rec = recordRequests();
    server.use(
      http.get(`${API}/tracks/:id/stream`, () =>
        HttpResponse.json({
          url: '/api/v1/stream/tok',
          mimeType: 'audio/webm',
          codec: 'opus',
          bitrateKbps: 160,
          contentLength: 10,
          expiresAt: 1,
        }),
      ),
    );
    await api.getTrackStream('yt:t1', 'high', 'm4a');
    await api.getTrackStream('yt:t1');
    rec.stop();
    expect(rec.paths()).toEqual([
      'GET /tracks/yt%3At1/stream?quality=high&format=m4a',
      'GET /tracks/yt%3At1/stream?quality=auto',
    ]);
  });

  it('WEB-API-009 builds artwork URLs on the API origin, with an optional size', () => {
    expect(api.getTrackArtworkUrl('yt:t1')).toBe(`${API}/tracks/yt%3At1/artwork`);
    expect(api.getAlbumArtworkUrl('yt:a1', '300')).toBe(`${API}/albums/yt%3Aa1/artwork?size=300`);
    expect(api.getPlaylistArtworkUrl('p 1', '64')).toBe(`${API}/playlists/p%201/artwork?size=64`);
    expect(api.getArtistArtworkUrl('yt:r1', '640')).toBe(`${API}/artists/yt%3Ar1/artwork?size=640`);
  });
});

describe('api client: responses and errors', () => {
  it('WEB-API-010 turns an error body into an ApiError with status, code and message', async () => {
    server.use(http.get(`${API}/search`, () => apiError(502, 'UPSTREAM_UNAVAILABLE', 'Piped is down')));
    const err = await api.search('x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, code: 'UPSTREAM_UNAVAILABLE', message: 'Piped is down' });
  });

  it('WEB-API-011 falls back to a status message when the error body has no message', async () => {
    server.use(
      http.get(`${API}/albums/:id`, () => HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })),
    );
    await expect(api.getAlbum('yt:x')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Request failed with status 404',
    });
  });

  it('WEB-API-012 reports "HTTP error <status>" when an error response is not JSON', async () => {
    server.use(http.get(`${API}/genres`, () => new HttpResponse('Bad gateway', { status: 500 })));
    await expect(api.getGenres()).rejects.toMatchObject({ status: 500, code: undefined, message: 'HTTP error 500' });
  });

  it('WEB-API-013 resolves to an empty object for 204 and for a successful non-JSON body', async () => {
    server.use(
      http.delete(`${API}/me/playlists/:id`, () => new HttpResponse(null, { status: 204 })),
      http.put(`${API}/me/settings`, () => new HttpResponse('ok', { status: 200 })),
    );
    await expect(api.deleteMyPlaylist('sonare:p1')).resolves.toEqual({});
    await expect(api.saveSettings({ gapless: true })).resolves.toEqual({});
  });

  it('WEB-API-014 rejects with a TypeError when the server cannot be reached', async () => {
    server.use(http.get(`${API}/trending`, () => HttpResponse.error()));
    const err = await api.getTrending().catch((e) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(loadErrorMessage(err)).toBe("Can't reach the Sonare server.");
  });
});

describe('api client: expired access tokens', () => {
  it('WEB-API-015 refreshes on 401 and retries the request once with the new token', async () => {
    setSession('old-access', 'refresh-1', testUser);
    const seenAuth: (string | null)[] = [];
    server.use(
      http.get(`${API}/me/playlists`, ({ request }) => {
        const auth = request.headers.get('authorization');
        seenAuth.push(auth);
        return auth === 'Bearer new-access' ? HttpResponse.json(page([])) : apiError(401, 'UNAUTHORIZED');
      }),
      http.post(`${API}/auth/refresh`, async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: 'refresh-1' });
        return HttpResponse.json({ accessToken: 'new-access', refreshToken: 'refresh-2' });
      }),
    );
    await expect(api.getMyPlaylists()).resolves.toEqual(page([]));
    expect(seenAuth).toEqual(['Bearer old-access', 'Bearer new-access']);
    expect(getAccessToken()).toBe('new-access');
    expect(localStorage.getItem('sonare_refresh_token')).toBe('refresh-2');
  });

  it('WEB-API-016 signs the user out and surfaces the 401 when the refresh is refused', async () => {
    setSession('old-access', 'revoked', testUser);
    server.use(
      http.get(`${API}/me`, () => apiError(401, 'UNAUTHORIZED', 'Token expired')),
      http.post(`${API}/auth/refresh`, () => apiError(401, 'INVALID_REFRESH')),
    );
    await expect(api.getMe()).rejects.toMatchObject({ status: 401, message: 'Token expired' });
    expect(getAccessToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(localStorage.getItem('sonare_access_token')).toBeNull();
  });

  it('WEB-API-017 shares one refresh between requests that fail at the same time', async () => {
    setSession('old-access', 'refresh-1', testUser);
    let refreshes = 0;
    const ok = (request: Request) => request.headers.get('authorization') === 'Bearer fresh';
    server.use(
      http.get(`${API}/me/recently-played`, ({ request }) =>
        ok(request) ? HttpResponse.json(page([])) : apiError(401, 'UNAUTHORIZED'),
      ),
      http.get(`${API}/me/most-played`, ({ request }) =>
        ok(request) ? HttpResponse.json(page([])) : apiError(401, 'UNAUTHORIZED'),
      ),
      http.post(`${API}/auth/refresh`, async () => {
        refreshes++;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({ accessToken: 'fresh' });
      }),
    );
    await Promise.all([api.getRecentlyPlayed(), api.getMostPlayed()]);
    expect(refreshes).toBe(1);
    // No new refresh token in the answer: the old one is kept.
    expect(localStorage.getItem('sonare_refresh_token')).toBe('refresh-1');
  });

  it('WEB-API-018 does not try to refresh a guest request that gets 401', async () => {
    let refreshes = 0;
    server.use(
      http.get(`${API}/me/settings`, () => apiError(401, 'UNAUTHORIZED')),
      http.post(`${API}/auth/refresh`, () => {
        refreshes++;
        return HttpResponse.json({});
      }),
    );
    await expect(api.getSettings()).rejects.toMatchObject({ status: 401 });
    expect(refreshes).toBe(0);
  });
});

describe('loadErrorMessage', () => {
  it('WEB-API-019 explains upstream outages, unreachable servers and other failures in plain words', () => {
    expect(loadErrorMessage(new ApiError('x', 502, 'UPSTREAM_UNAVAILABLE'))).toBe(
      "Sonare's music service isn't responding. Try again in a moment.",
    );
    expect(loadErrorMessage(new ApiError('Album not found', 404, 'NOT_FOUND'))).toBe('Album not found');
    expect(loadErrorMessage(new TypeError('Failed to fetch'))).toBe("Can't reach the Sonare server.");
    expect(loadErrorMessage('weird')).toBe('Something went wrong.');
  });
});
