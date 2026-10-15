import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { testUser } from '../helpers/fixtures';

useMockServer();

/** settings.ts holds module state (current values, pending save); start each test fresh. */
const fresh = async () => {
  vi.resetModules();
  const auth = await import('../../src/api/auth');
  const settings = await import('../../src/storage/settings');
  return { ...auth, ...settings };
};

afterEach(() => vi.useRealTimers());

describe('user settings', () => {
  it('WEB-SET-001 starts from the documented defaults', async () => {
    const { getSettings } = await fresh();
    expect(getSettings()).toEqual({
      eqPreset: 'Sonare',
      gapless: true,
      normalization: true,
      streamQuality: 'high',
      downloadQuality: 'high',
      downloadFormat: 'opus',
      stayOffline: false,
    });
  });

  it('WEB-SET-002 a guest change applies locally and sends nothing while signed out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { updateSettings, getSettings } = await fresh();
    const rec = recordRequests();
    updateSettings({ gapless: false });
    await vi.advanceTimersByTimeAsync(1000);
    rec.stop();
    expect(getSettings().gapless).toBe(false);
    expect(rec.seen).toHaveLength(0);
  });

  it('WEB-SET-003 quick successive changes are sent once, with only the changed fields', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { updateSettings, setSession } = await fresh();
    setSession('a', 'r', testUser);
    const bodies: unknown[] = [];
    server.use(
      http.put(`${API}/me/settings`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    updateSettings({ streamQuality: 'low' });
    await vi.advanceTimersByTimeAsync(200);
    updateSettings({ gapless: true });
    await vi.advanceTimersByTimeAsync(200);
    updateSettings({ streamQuality: 'normal' });
    expect(bodies).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(450);
    expect(bodies).toEqual([{ streamQuality: 'normal', gapless: true }]);

    // The next change starts a new batch rather than re-sending the old one.
    updateSettings({ normalization: false });
    await vi.advanceTimersByTimeAsync(450);
    expect(bodies[1]).toEqual({ normalization: false });
  });

  it('WEB-SET-004 a failed save keeps the local value', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { updateSettings, getSettings, setSession } = await fresh();
    setSession('a', 'r', testUser);
    server.use(http.put(`${API}/me/settings`, () => HttpResponse.error()));
    updateSettings({ downloadFormat: 'm4a' });
    await vi.advanceTimersByTimeAsync(450);
    expect(getSettings().downloadFormat).toBe('m4a');
  });

  it('WEB-SET-005 loading merges the account settings and drops values this build does not know', async () => {
    const { loadSettings, getSettings, setSession, subscribeSettings } = await fresh();
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/settings`, () =>
        HttpResponse.json({
          streamQuality: 'lossless',
          downloadQuality: 'low',
          downloadFormat: 'flac',
          gapless: true,
          eqPreset: 'Bass',
        }),
      ),
    );
    const changed = new Promise<void>((resolve) => subscribeSettings(resolve));
    loadSettings();
    await changed;
    expect(getSettings()).toMatchObject({
      streamQuality: 'high',
      downloadQuality: 'low',
      downloadFormat: 'opus',
      gapless: true,
      eqPreset: 'Bass',
    });
  });

  it('WEB-SET-006 a guest does not ask for account settings, but signing in loads them', async () => {
    const { loadSettings, getSettings, setSession, subscribeSettings } = await fresh();
    const rec = recordRequests();
    server.use(http.get(`${API}/me/settings`, () => HttpResponse.json({ normalization: false })));
    loadSettings();
    await new Promise((r) => setTimeout(r, 20));
    expect(rec.seen).toHaveLength(0);

    const changed = new Promise<void>((resolve) => subscribeSettings(resolve));
    setSession('a', 'r', testUser);
    await changed;
    rec.stop();
    expect(rec.paths()).toEqual(['GET /me/settings']);
    expect(getSettings().normalization).toBe(false);
  });

  it('WEB-SET-007 a failed load is tried again on the next sign-in', async () => {
    const { loadSettings, getSettings, setSession, subscribeSettings } = await fresh();
    let calls = 0;
    server.use(
      http.get(`${API}/me/settings`, () => (++calls === 1 ? apiError(500, 'X') : HttpResponse.json({ gapless: true }))),
    );
    setSession('a', 'r', testUser);
    loadSettings();
    await vi.waitFor(() => expect(calls).toBe(1));
    const changed = new Promise<void>((resolve) => subscribeSettings(resolve));
    setSession('a2', 'r2', testUser);
    await changed;
    expect(calls).toBe(2);
    expect(getSettings().gapless).toBe(true);
  });

  it('WEB-SET-009 settings are kept on the device across restarts, for guests too', async () => {
    const first = await fresh();
    first.updateSettings({ streamQuality: 'low', normalization: false, stayOffline: true });
    const again = await fresh();
    expect(again.getSettings()).toMatchObject({ streamQuality: 'low', normalization: false, stayOffline: true });
  });

  it('WEB-SET-010 a change made offline reaches the account when the network is back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { updateSettings, setSession, loadSettings } = await fresh();
    setSession('a', 'r', testUser);
    const bodies: unknown[] = [];
    let up = false;
    server.use(
      http.get(`${API}/me/settings`, () => (up ? HttpResponse.json({ gapless: true }) : HttpResponse.error())),
      http.put(`${API}/me/settings`, async ({ request }) => {
        if (!up) return HttpResponse.error();
        bodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    loadSettings();
    updateSettings({ downloadFormat: 'm4a' });
    await vi.advanceTimersByTimeAsync(450);
    expect(bodies).toHaveLength(0);
    up = true;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(bodies).toEqual([{ downloadFormat: 'm4a' }]));
  });

  it("WEB-SET-011 a guest's changes go to the account on sign-in and win over the account's copy", async () => {
    const { updateSettings, setSession, loadSettings, getSettings } = await fresh();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API}/me/settings`, () => HttpResponse.json({ eqPreset: 'Bass', normalization: true })),
      http.put(`${API}/me/settings`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    loadSettings();
    updateSettings({ normalization: false });
    setSession('a', 'r', testUser);
    await vi.waitFor(() => expect(bodies).toEqual([{ normalization: false }]));
    expect(getSettings()).toMatchObject({ eqPreset: 'Bass', normalization: false });
  });

  it('WEB-SET-012 changes waiting for one account are not sent to another', async () => {
    localStorage.setItem(
      'sonare_settings_unsynced',
      JSON.stringify({ userId: 'someone-else', changes: { streamQuality: 'low' } }),
    );
    const { setSession, loadSettings } = await fresh();
    const rec = recordRequests();
    server.use(http.get(`${API}/me/settings`, () => HttpResponse.json({ streamQuality: 'high' })));
    setSession('a', 'r', testUser);
    loadSettings();
    await new Promise((r) => setTimeout(r, 50));
    rec.stop();
    expect(rec.paths()).toEqual(['GET /me/settings']);
  });

  it('WEB-SET-008 useSettings re-renders with every change', async () => {
    const { useSettings, updateSettings } = await fresh();
    const { result } = renderHook(() => useSettings());
    expect(result.current.stayOffline).toBe(false);
    act(() => updateSettings({ stayOffline: true }));
    expect(result.current.stayOffline).toBe(true);
  });
});
