import { afterEach, describe, expect, it, vi } from 'vitest';
import { API, apiError, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { testUser } from '../helpers/fixtures';

useMockServer();

/** plays.ts, sync.ts and auth.ts all keep module state; every test gets its own copies. */
async function fresh(signedIn = true) {
  vi.resetModules();
  const auth = await import('../../src/api/auth');
  const plays = await import('../../src/api/plays');
  const sync = await import('../../src/api/sync');
  if (signedIn) auth.setSession('acc', 'ref', testUser);
  return { ...auth, ...plays, ...sync };
}

const pending = () => JSON.parse(localStorage.getItem('sonare_pending_plays') ?? '[]');

/** A /me/sync handler that records bodies and answers with `respond`. */
function syncEndpoint(respond: () => Response = () => HttpResponse.json({ ok: true })) {
  const bodies: any[] = [];
  server.use(
    http.post(`${API}/me/sync`, async ({ request }) => {
      bodies.push(await request.json());
      return respond();
    }),
  );
  return bodies;
}

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('play counting', () => {
  it('WEB-PLAY-001 a guest listening records nothing', async () => {
    const { maybeRecordPlay } = await fresh(false);
    maybeRecordPlay('yt:t1', 1000, 60_000, 200_000);
    expect(pending()).toEqual([]);
  });

  it('WEB-PLAY-002 a long song counts after 30 seconds, not before', async () => {
    const { maybeRecordPlay } = await fresh();
    maybeRecordPlay('yt:t1', 1000, 29_999, 240_000);
    expect(pending()).toHaveLength(0);
    maybeRecordPlay('yt:t1', 1000, 30_000, 240_000);
    expect(pending()).toEqual([{ trackRef: { kind: 'server', id: 't1' }, at: 1000, ms: 30_000, userId: testUser.id }]);
  });

  it('WEB-PLAY-003 a short song counts at half its length; an unknown length waits 30 seconds', async () => {
    const { maybeRecordPlay } = await fresh();
    maybeRecordPlay('yt:short', 1, 19_000, 40_000);
    expect(pending()).toHaveLength(0);
    maybeRecordPlay('yt:short', 1, 20_000, 40_000);
    expect(pending()).toHaveLength(1);
    maybeRecordPlay('yt:unknown', 2, 29_000, 0);
    expect(pending()).toHaveLength(1);
    maybeRecordPlay('yt:unknown', 2, 30_000, 0);
    expect(pending()).toHaveLength(2);
  });

  it('WEB-PLAY-004 one listen counts once; a replay counts again', async () => {
    const { maybeRecordPlay, resetPlay } = await fresh();
    maybeRecordPlay('yt:t1', 1000, 31_000, 200_000);
    maybeRecordPlay('yt:t1', 1000, 90_000, 200_000);
    expect(pending()).toHaveLength(1);
    maybeRecordPlay('yt:t1', 5000, 31_000, 200_000);
    expect(pending()).toHaveLength(2);
    // Restarting the same listen (same start time) lets it count again.
    resetPlay('yt:t1', 5000);
    maybeRecordPlay('yt:t1', 5000, 31_000, 200_000);
    expect(pending()).toHaveLength(3);
  });

  it('WEB-PLAY-005 local files are sent by fingerprint and server tracks by bare id', async () => {
    const { maybeRecordPlay } = await fresh();
    maybeRecordPlay('local:abc123', 1, 31_000, 100_000);
    maybeRecordPlay('yt:xyz', 2, 31_000, 100_000);
    maybeRecordPlay('plainid', 3, 31_000, 100_000);
    expect(pending().map((p: any) => p.trackRef)).toEqual([
      { kind: 'local', fingerprint: 'abc123' },
      { kind: 'server', id: 'xyz' },
      { kind: 'server', id: 'plainid' },
    ]);
  });

  it('WEB-PLAY-006 each account only uploads its own plays (plus untagged older ones)', async () => {
    const { pendingPlaysFor } = await fresh();
    localStorage.setItem(
      'sonare_pending_plays',
      JSON.stringify([
        { trackRef: { kind: 'server', id: 'a' }, at: 1, ms: 1, userId: 'u-test' },
        { trackRef: { kind: 'server', id: 'b' }, at: 2, ms: 1, userId: 'someone-else' },
        { trackRef: { kind: 'server', id: 'c' }, at: 3, ms: 1 },
      ]),
    );
    expect(pendingPlaysFor('u-test').map((p) => p.trackRef)).toEqual([
      { kind: 'server', id: 'a' },
      { kind: 'server', id: 'c' },
    ]);
  });

  it('WEB-PLAY-007 removing uploaded plays keeps ones recorded meanwhile', async () => {
    const { maybeRecordPlay, pendingPlaysFor, removePendingPlays } = await fresh();
    maybeRecordPlay('yt:first', 1, 31_000, 100_000);
    const uploaded = pendingPlaysFor(testUser.id);
    maybeRecordPlay('yt:second', 2, 31_000, 100_000);
    removePendingPlays(uploaded);
    expect(pending().map((p: any) => p.trackRef.id)).toEqual(['second']);
  });

  it('WEB-PLAY-008 unreadable stored plays are treated as none', async () => {
    const { pendingPlaysFor } = await fresh();
    localStorage.setItem('sonare_pending_plays', 'garbage');
    expect(pendingPlaysFor(testUser.id)).toEqual([]);
  });
});

describe('background sync', () => {
  it('WEB-SYNC-001 a counted play uploads straight away in Online Mode and leaves the queue', async () => {
    const bodies = syncEndpoint();
    const { maybeRecordPlay, setSyncOnline } = await fresh();
    setSyncOnline(true);
    maybeRecordPlay('yt:t1', 1000, 31_000, 200_000);
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      since: 0,
      plays: [{ trackRef: { kind: 'server', id: 't1' }, at: 1000, ms: 31_000, userId: testUser.id }],
      favourites: [],
      playlists: [],
    });
    await vi.waitFor(() => expect(pending()).toEqual([]));
  });

  it('WEB-SYNC-002 Offline Mode holds plays, and switching to Online uploads them and refreshes lists', async () => {
    const bodies = syncEndpoint();
    const { maybeRecordPlay, setSyncOnline } = await fresh();
    const refreshed = vi.fn();
    window.addEventListener('sonare:playlists-changed', refreshed);
    maybeRecordPlay('yt:t1', 1, 31_000, 200_000);
    maybeRecordPlay('yt:t2', 2, 31_000, 200_000);
    await new Promise((r) => setTimeout(r, 20));
    expect(bodies).toHaveLength(0);
    expect(pending()).toHaveLength(2);

    setSyncOnline(true);
    await vi.waitFor(() => expect(pending()).toEqual([]));
    expect(bodies).toHaveLength(1);
    expect(bodies[0].plays).toHaveLength(2);
    expect(refreshed).toHaveBeenCalledTimes(1);
    window.removeEventListener('sonare:playlists-changed', refreshed);
  });

  it('WEB-SYNC-003 with the network down nothing is sent; the online event sends it', async () => {
    const bodies = syncEndpoint();
    const { maybeRecordPlay, setSyncOnline, startBackgroundSync } = await fresh();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    startBackgroundSync();
    setSyncOnline(true);
    maybeRecordPlay('yt:t1', 1, 31_000, 200_000);
    await new Promise((r) => setTimeout(r, 20));
    expect(bodies).toHaveLength(0);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
  });

  it('WEB-SYNC-004 a server error keeps the plays and retries with backoff', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let calls = 0;
    const bodies = syncEndpoint(() => (++calls <= 2 ? apiError(503, 'DOWN') : HttpResponse.json({ ok: true })));
    const { maybeRecordPlay, setSyncOnline } = await fresh();
    setSyncOnline(true);
    maybeRecordPlay('yt:t1', 1, 31_000, 200_000);
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(pending()).toHaveLength(1);

    // First retry after 5 s, the next after 10 s.
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(() => expect(bodies).toHaveLength(2));
    await vi.advanceTimersByTimeAsync(9_000);
    expect(bodies).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.waitFor(() => expect(bodies).toHaveLength(3));
    await vi.waitFor(() => expect(pending()).toEqual([]));
  });

  it('WEB-SYNC-005 plays the server rejects outright (4xx) are dropped instead of retried forever', async () => {
    const bodies = syncEndpoint(() => apiError(400, 'VALIDATION', 'bad play'));
    const { maybeRecordPlay, setSyncOnline } = await fresh();
    setSyncOnline(true);
    maybeRecordPlay('yt:t1', 1, 31_000, 200_000);
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    await vi.waitFor(() => expect(pending()).toEqual([]));
  });

  it('WEB-SYNC-006 an auth failure (401) keeps the plays for later', async () => {
    const bodies = syncEndpoint(() => apiError(401, 'UNAUTHORIZED'));
    server.use(http.post(`${API}/auth/refresh`, () => apiError(401, 'X')));
    const { maybeRecordPlay, setSyncOnline } = await fresh();
    setSyncOnline(true);
    maybeRecordPlay('yt:t1', 1, 31_000, 200_000);
    await vi.waitFor(() => expect(bodies.length).toBeGreaterThanOrEqual(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(pending()).toHaveLength(1);
  });

  it('WEB-SYNC-007 plays counted during an upload go up in one follow-up request', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const bodies: any[] = [];
    server.use(
      http.post(`${API}/me/sync`, async ({ request }) => {
        bodies.push(await request.json());
        if (bodies.length === 1) await gate;
        return HttpResponse.json({ ok: true });
      }),
    );
    const { maybeRecordPlay, setSyncOnline } = await fresh();
    setSyncOnline(true);
    maybeRecordPlay('yt:a', 1, 31_000, 200_000);
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    maybeRecordPlay('yt:b', 2, 31_000, 200_000);
    maybeRecordPlay('yt:c', 3, 31_000, 200_000);
    release();
    await vi.waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].plays.map((p: any) => p.trackRef.id)).toEqual(['b', 'c']);
    await vi.waitFor(() => expect(pending()).toEqual([]));
  });

  it('WEB-SYNC-008 useSyncStatus reports waiting plays for the signed-in account', async () => {
    const { maybeRecordPlay, useSyncStatus, requestSync } = await fresh();
    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => useSyncStatus());
    maybeRecordPlay('yt:t1', 1, 31_000, 200_000);
    maybeRecordPlay('yt:t2', 2, 31_000, 200_000);
    requestSync();
    await vi.waitFor(() => expect(result.current).toEqual({ pending: 2, syncing: false }));
  });

  it('WEB-SYNC-009 signing in uploads what that account has waiting', async () => {
    const bodies = syncEndpoint();
    const { setSyncOnline, startBackgroundSync, setSession } = await fresh(false);
    localStorage.setItem(
      'sonare_pending_plays',
      JSON.stringify([{ trackRef: { kind: 'server', id: 'x' }, at: 9, ms: 40_000, userId: testUser.id }]),
    );
    startBackgroundSync();
    setSyncOnline(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(bodies).toHaveLength(0);
    setSession('acc', 'ref', testUser);
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].plays[0].trackRef).toEqual({ kind: 'server', id: 'x' });
  });
});
