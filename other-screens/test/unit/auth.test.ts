import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { testUser } from '../helpers/fixtures';

useMockServer();

/** auth.ts reads localStorage and the env when it loads, so each test gets a fresh copy. */
async function freshAuth() {
  vi.resetModules();
  const auth = await import('../../src/data/auth');
  const gate = await import('../../src/data/accountGate');
  return { ...auth, ...gate };
}

const tokens = { accessToken: 'acc', refreshToken: 'ref', user: testUser };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sign in, sign up, sign out', () => {
  it('WEB-AUTH-001 signing in stores the session, tells listeners and clears the signed-out flag', async () => {
    localStorage.setItem('sonare_signed_out', '1');
    const auth = await freshAuth();
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({ email: 'listener@sonare.test', password: 'hunter22' });
        return HttpResponse.json(tokens);
      }),
    );
    const seen: unknown[] = [];
    auth.onAuthChange((u) => seen.push(u));
    await expect(auth.signIn('listener@sonare.test', 'hunter22')).resolves.toEqual(testUser);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getCurrentUser()).toEqual(testUser);
    expect(seen).toEqual([testUser]);
    expect(localStorage.getItem('sonare_access_token')).toBe('acc');
    expect(localStorage.getItem('sonare_refresh_token')).toBe('ref');
    expect(JSON.parse(localStorage.getItem('sonare_user')!)).toEqual(testUser);
    expect(localStorage.getItem('sonare_signed_out')).toBeNull();
  });

  it('WEB-AUTH-002 a rejected sign-in throws the server message and leaves the user signed out', async () => {
    const auth = await freshAuth();
    server.use(http.post(`${API}/auth/login`, () => apiError(401, 'INVALID_CREDENTIALS', 'Wrong email or password')));
    await expect(auth.signIn('a@b.c', 'nope')).rejects.toThrow('Wrong email or password');
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sonare_access_token')).toBeNull();
  });

  it('WEB-AUTH-003 a sign-in failure without a message reports the status', async () => {
    const auth = await freshAuth();
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({}, { status: 500 })));
    await expect(auth.signIn('a@b.c', 'x')).rejects.toThrow('Request failed with status 500');
  });

  it('WEB-AUTH-004 signing up sends the display name and starts a session', async () => {
    const auth = await freshAuth();
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        expect(await request.json()).toEqual({ email: 'new@sonare.test', password: 'longpass1', displayName: 'Nova' });
        return HttpResponse.json(tokens, { status: 201 });
      }),
    );
    await auth.signUp('new@sonare.test', 'longpass1', 'Nova');
    expect(auth.getAccessToken()).toBe('acc');
  });

  it('WEB-AUTH-005 signing up with a taken email throws the conflict message', async () => {
    const auth = await freshAuth();
    server.use(
      http.post(`${API}/auth/register`, () => apiError(409, 'EMAIL_TAKEN', 'That email already has an account')),
    );
    await expect(auth.signUp('dup@sonare.test', 'longpass1', 'Dup')).rejects.toThrow(
      'That email already has an account',
    );
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('WEB-AUTH-006 signing out revokes the refresh token on the server and forgets the session', async () => {
    const auth = await freshAuth();
    auth.setSession('acc', 'ref', testUser);
    let sent: { auth: string | null; body: unknown } | undefined;
    server.use(
      http.post(`${API}/auth/logout`, async ({ request }) => {
        sent = { auth: request.headers.get('authorization'), body: await request.json() };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const seen: unknown[] = [];
    auth.onAuthChange((u) => seen.push(u));
    await auth.signOut();
    expect(sent).toEqual({ auth: 'Bearer acc', body: { refreshToken: 'ref' } });
    expect(auth.isAuthenticated()).toBe(false);
    expect(seen).toEqual([null]);
    expect(localStorage.getItem('sonare_user')).toBeNull();
    expect(localStorage.getItem('sonare_signed_out')).toBe('1');
  });

  it('WEB-AUTH-007 signing out still clears the session when the server is unreachable', async () => {
    const auth = await freshAuth();
    auth.setSession('acc', 'ref', testUser);
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()));
    await auth.signOut();
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sonare_signed_out')).toBe('1');
  });

  it('WEB-AUTH-008 a guest signing out makes no request', async () => {
    const auth = await freshAuth();
    const rec = recordRequests();
    await auth.signOut();
    rec.stop();
    expect(rec.seen).toHaveLength(0);
  });

  it('WEB-AUTH-009 an unsubscribed listener is not told about later changes', async () => {
    const auth = await freshAuth();
    const fn = vi.fn();
    const off = auth.onAuthChange(fn);
    off();
    auth.setSession('a', 'r', testUser);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('session restore and refresh', () => {
  it('WEB-AUTH-010 restores a saved session on start-up', async () => {
    localStorage.setItem('sonare_access_token', 'saved-acc');
    localStorage.setItem('sonare_refresh_token', 'saved-ref');
    localStorage.setItem('sonare_user', JSON.stringify(testUser));
    const auth = await freshAuth();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getRefreshToken()).toBe('saved-ref');
    expect(auth.getCurrentUser()).toEqual(testUser);
  });

  it('WEB-AUTH-011 ignores a corrupt saved user instead of crashing', async () => {
    localStorage.setItem('sonare_user', '{not json');
    const auth = await freshAuth();
    expect(auth.getCurrentUser()).toBeNull();
  });

  it('WEB-AUTH-012 refreshing without a refresh token signs out and returns null', async () => {
    const auth = await freshAuth();
    const rec = recordRequests();
    await expect(auth.refreshAccessToken()).resolves.toBeNull();
    rec.stop();
    expect(rec.seen).toHaveLength(0);
  });

  it('WEB-AUTH-013 a refresh that cannot reach the server signs out', async () => {
    const auth = await freshAuth();
    auth.setSession('acc', 'ref', testUser);
    server.use(http.post(`${API}/auth/refresh`, () => HttpResponse.error()));
    await expect(auth.refreshAccessToken()).resolves.toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
  });
});

describe('dev auto-login', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEV_EMAIL', 'dev@sonare.test');
    vi.stubEnv('VITE_DEV_PASSWORD', 'devpass123');
  });

  it('WEB-AUTH-014 without dev credentials, auth is ready immediately', async () => {
    vi.stubEnv('VITE_DEV_EMAIL', '');
    const auth = await freshAuth();
    expect(auth.isAuthReady()).toBe(true);
    const ready = vi.fn();
    auth.onAuthReady(ready);
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('WEB-AUTH-015 holds auth-ready until the dev account has signed in', async () => {
    const auth = await freshAuth();
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json(tokens)));
    expect(auth.isAuthReady()).toBe(false);
    const ready = vi.fn();
    auth.onAuthReady(ready);
    expect(ready).not.toHaveBeenCalled();
    await auth.initDevAuth();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(auth.isAuthReady()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('WEB-AUTH-016 registers the dev account when it does not exist yet', async () => {
    const auth = await freshAuth();
    const rec = recordRequests();
    server.use(
      http.post(`${API}/auth/login`, () => apiError(401, 'INVALID_CREDENTIALS')),
      http.post(`${API}/auth/register`, () => HttpResponse.json(tokens, { status: 201 })),
    );
    await auth.initDevAuth();
    rec.stop();
    expect(rec.paths()).toEqual(['POST /auth/login', 'POST /auth/register']);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('WEB-AUTH-017 retries sign-in once when registration races an existing account', async () => {
    const auth = await freshAuth();
    let logins = 0;
    server.use(
      http.post(`${API}/auth/login`, () =>
        ++logins === 1 ? apiError(401, 'INVALID_CREDENTIALS') : HttpResponse.json(tokens),
      ),
      http.post(`${API}/auth/register`, () => apiError(409, 'EMAIL_TAKEN')),
    );
    await auth.initDevAuth();
    expect(logins).toBe(2);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('WEB-AUTH-018 settles as a guest when every dev login attempt fails', async () => {
    const auth = await freshAuth();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    server.use(
      http.post(`${API}/auth/login`, () => apiError(401, 'INVALID_CREDENTIALS')),
      http.post(`${API}/auth/register`, () => apiError(409, 'EMAIL_TAKEN')),
    );
    await auth.initDevAuth();
    expect(auth.isAuthReady()).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('WEB-AUTH-019 does not sign straight back in after the user signed out', async () => {
    localStorage.setItem('sonare_signed_out', '1');
    const auth = await freshAuth();
    const rec = recordRequests();
    expect(auth.isAuthReady()).toBe(true);
    await auth.initDevAuth();
    rec.stop();
    expect(rec.seen).toHaveLength(0);
    expect(auth.isAuthenticated()).toBe(false);
  });
});

describe('account gate', () => {
  it('WEB-AUTH-020 sends a guest to sign-up with the reason and holds the action until then', async () => {
    const { requireAccount, bindAccountGateNavigator, takePendingAction } = await freshAuth();
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const action = vi.fn();
    requireAccount('Create a free account to save songs you love.', action);
    expect(action).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to save songs you love.', mode: 'signup' },
    });
    expect(takePendingAction()).toBe(action);
    // Taking it clears it, so it can only run once.
    expect(takePendingAction()).toBeNull();
  });

  it('WEB-AUTH-021 runs the action straight away for a signed-in user', async () => {
    const { requireAccount, bindAccountGateNavigator, setSession, takePendingAction } = await freshAuth();
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    setSession('a', 'r', testUser);
    const action = vi.fn();
    requireAccount('why', action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(takePendingAction()).toBeNull();
  });

  it('WEB-AUTH-022 keeps only the latest pending action, and cancelling drops it', async () => {
    const { requireAccount, clearPendingAction, takePendingAction } = await freshAuth();
    const first = vi.fn();
    const second = vi.fn();
    requireAccount('one', first);
    requireAccount('two', second);
    expect(takePendingAction()).toBe(second);
    requireAccount('three', first);
    clearPendingAction();
    expect(takePendingAction()).toBeNull();
  });
});
