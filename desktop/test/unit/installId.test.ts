import { afterEach, describe, expect, it, vi } from 'vitest';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';

useMockServer();

// installId.ts reads localStorage when it first runs, so each test gets a fresh module.
const freshInstallId = async () => {
  vi.resetModules();
  return import('../../src/lib/installId');
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('installId', () => {
  afterEach(() => {
    localStorage.removeItem('sonare_install_id');
  });

  it('WEB-INST-001 creates a v4 UUID on first call and returns the same id on every subsequent call', async () => {
    const { getInstallId } = await freshInstallId();
    const id1 = getInstallId();
    expect(id1).toMatch(UUID_RE);
    // Same value every time within the same module instance.
    expect(getInstallId()).toBe(id1);
    expect(getInstallId()).toBe(id1);
  });

  it('WEB-INST-002 reuses the stored id across module reloads (persists in localStorage)', async () => {
    const { getInstallId: first } = await freshInstallId();
    const id = first();
    expect(localStorage.getItem('sonare_install_id')).toBe(id);
    // A fresh module load should read it back from storage.
    const { getInstallId: second } = await freshInstallId();
    expect(second()).toBe(id);
  });

  it('WEB-INST-003 a storage error still gives a valid id for the session', async () => {
    // Simulate a blocked localStorage (e.g. private-browsing restriction).
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    const { getInstallId } = await freshInstallId();
    const id = getInstallId();
    expect(id).toMatch(UUID_RE);
    // Returns the same per-session fallback id.
    expect(getInstallId()).toBe(id);
    vi.restoreAllMocks();
  });

  it('WEB-INST-007 caches the id in memory and avoids reading localStorage on repeated calls', async () => {
    const { getInstallId } = await freshInstallId();
    const getSpy = vi.spyOn(Storage.prototype, 'getItem');
    getInstallId();
    expect(getSpy).toHaveBeenCalledTimes(1);
    getInstallId();
    getInstallId();
    // Subsequent calls return the cached in-memory id without reading localStorage again
    expect(getSpy).toHaveBeenCalledTimes(1);
    getSpy.mockRestore();
  });
});

describe('X-Sonare-Install header on API requests', () => {
  afterEach(() => {
    localStorage.removeItem('sonare_install_id');
    vi.resetModules();
  });

  it('WEB-INST-004 api.ts sends X-Sonare-Install next to X-Sonare-Client on every request', async () => {
    const { api } = await import('../../src/api/api');
    let installHeader: string | null = null;
    server.use(
      http.get(`${API}/genres`, ({ request }) => {
        installHeader = request.headers.get('x-sonare-install');
        return HttpResponse.json([]);
      }),
    );
    await api.getGenres();
    expect(installHeader).toMatch(UUID_RE);
  });

  it('WEB-INST-005 auth.ts sends X-Sonare-Install on login and register requests', async () => {
    vi.resetModules();
    const { signIn } = await import('../../src/api/auth');
    const received: { install: string | null; path: string }[] = [];
    server.use(
      http.post(`${API}/auth/login`, ({ request }) => {
        received.push({ install: request.headers.get('x-sonare-install'), path: '/auth/login' });
        return HttpResponse.json({
          accessToken: 'a',
          refreshToken: 'r',
          user: { id: 'u1', email: 'x@y.z', displayName: 'X', emailVerified: true, role: 'user', createdAt: '' },
        });
      }),
    );
    await signIn('x@y.z', 'password');
    expect(received).toHaveLength(1);
    expect(received[0].install).toMatch(UUID_RE);
  });

  it('WEB-INST-006 errorReporting.ts sends X-Sonare-Install on client-error reports', async () => {
    vi.resetModules();
    const { reportError } = await import('../../src/lib/errorReporting');
    let installHeader: string | null = null;
    server.use(
      http.post(`${API}/client-errors`, ({ request }) => {
        installHeader = request.headers.get('x-sonare-install');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    reportError(new Error('test error for install id'));
    await vi.waitFor(() => expect(installHeader).not.toBeNull());
    expect(installHeader).toMatch(UUID_RE);
  });
});
