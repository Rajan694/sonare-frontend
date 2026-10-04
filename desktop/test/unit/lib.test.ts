import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CAPS, CLIENT } from '../../src/lib/caps';
import { cn } from '../../src/lib/cn';
import { formatBytes, formatDuration, generatePeaks } from '../../src/lib/format';
import { hasInternet } from '../../src/lib/connectivity';
import { useLayout } from '../../src/lib/layout';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';

useMockServer();

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });

afterEach(() => {
  setOnline(true);
  vi.useRealTimers();
});

describe('capabilities and formatting', () => {
  it('WEB-LIB-001 the web build has no local library, offline mode or native EQ, and includes admin', () => {
    expect(CAPS).toEqual({
      localLibrary: false,
      offlineMode: false,
      downloads: true,
      offlineDownloads: false,
      nativeEq: false,
      admin: true,
    });
    expect(CLIENT).toBe('web');
  });

  it('WEB-LIB-002 cn merges Tailwind classes and knows the custom type scale is a size, not a colour', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-body-m', 'text-acc')).toBe('text-body-m text-acc');
    expect(cn('text-body-m', 'text-label-s')).toBe('text-label-s');
    const off = false as boolean;
    expect(cn('a', off && 'b', undefined, ['c'])).toBe('a c');
  });

  it('WEB-LIB-003 formatDuration shows m:ss and treats bad input as 0:00', () => {
    expect(formatDuration(59_999)).toBe('0:59');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('62:05');
    for (const bad of [null, undefined, NaN, -1]) expect(formatDuration(bad as number)).toBe('0:00');
  });

  it('WEB-LIB-004 formatBytes picks KB, MB or GB', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(999_999)).toBe('1000 KB');
    expect(formatBytes(1_000_000)).toBe('1 MB');
    expect(formatBytes(1_500_000_000)).toBe('1.5 GB');
  });

  it('WEB-LIB-005 placeholder waveforms are bounded and repeatable per seed', () => {
    const a = generatePeaks(64, 3);
    expect(a).toHaveLength(64);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...a)).toBeLessThanOrEqual(24);
    expect(generatePeaks(64, 3)).toEqual(a);
    expect(generatePeaks(64, 4)).not.toEqual(a);
  });
});

describe('connectivity check', () => {
  it('WEB-LIB-006 reports offline immediately when the browser says so, without probing', async () => {
    setOnline(false);
    const probe = vi.fn(() => HttpResponse.text(''));
    server.use(http.head('https://www.gstatic.com/generate_204', probe));
    await expect(hasInternet()).resolves.toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it('WEB-LIB-007 is online when either probe answers', async () => {
    server.use(
      http.head('https://www.gstatic.com/generate_204', () => HttpResponse.error()),
      http.get('https://cloudflare.com/cdn-cgi/trace', () => HttpResponse.text('ok')),
    );
    await expect(hasInternet()).resolves.toBe(true);
  });

  it('WEB-LIB-008 is offline when both probes fail or time out', async () => {
    server.use(
      http.head('https://www.gstatic.com/generate_204', () => HttpResponse.error()),
      http.get('https://cloudflare.com/cdn-cgi/trace', () => HttpResponse.error()),
    );
    await expect(hasInternet()).resolves.toBe(false);
    server.use(
      http.head('https://www.gstatic.com/generate_204', () => new Promise<Response>(() => {})),
      http.get('https://cloudflare.com/cdn-cgi/trace', () => new Promise<Response>(() => {})),
    );
    await expect(hasInternet(50)).resolves.toBe(false);
  });
});

describe('error reporting', () => {
  async function fresh() {
    vi.resetModules();
    return import('../../src/lib/errorReporting');
  }
  function reports() {
    const bodies: any[] = [];
    server.use(
      http.post(`${API}/client-errors`, async ({ request }) => {
        bodies.push({ client: request.headers.get('x-sonare-client'), ...((await request.json()) as object) });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return bodies;
  }

  it('WEB-LIB-009 sends an error with its type, stack and page', async () => {
    const bodies = reports();
    const { reportError } = await fresh();
    window.history.pushState({}, '', '/album/yt:1');
    reportError(new RangeError('index out of range'));
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      client: 'web',
      source: 'web',
      level: 'error',
      message: 'RangeError: index out of range',
      page: '/album/yt:1',
    });
    expect(bodies[0].stack).toContain('RangeError');
  });

  it('WEB-LIB-010 turns strings and objects into readable messages', async () => {
    const bodies = reports();
    const { reportError } = await fresh();
    reportError('plain text', 'warning');
    reportError({ code: 42 });
    await vi.waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies.map((b) => [b.message, b.level])).toEqual([
      ['plain text', 'warning'],
      ['{"code":42}', 'error'],
    ]);
  });

  it('WEB-LIB-011 ignores aborts, ResizeObserver noise and network failures', async () => {
    const bodies = reports();
    const { reportError } = await fresh();
    // Browsers reject aborted fetches with a DOMException, which is an Error there (not in jsdom).
    reportError(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
    reportError(new Error('ResizeObserver loop completed with undelivered notifications.'));
    reportError(new TypeError('Failed to fetch'));
    reportError(new Error('Script error.'));
    await new Promise((r) => setTimeout(r, 30));
    expect(bodies).toHaveLength(0);
  });

  it('WEB-LIB-012 sends nothing while offline', async () => {
    const bodies = reports();
    const { reportError } = await fresh();
    setOnline(false);
    reportError(new Error('offline error'));
    await new Promise((r) => setTimeout(r, 30));
    expect(bodies).toHaveLength(0);
  });

  it('WEB-LIB-013 the same message is sent at most once a minute, and at most 20 per page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const bodies = reports();
    const { reportError } = await fresh();
    reportError(new Error('repeat'));
    reportError(new Error('repeat'));
    await vi.advanceTimersByTimeAsync(61_000);
    reportError(new Error('repeat'));
    for (let i = 0; i < 30; i++) reportError(new Error(`distinct ${i}`));
    await vi.waitFor(() => expect(bodies).toHaveLength(20));
    await new Promise((r) => setTimeout(r, 30));
    expect(bodies).toHaveLength(20);
    expect(bodies.filter((b) => b.message === 'repeat')).toHaveLength(2);
  });

  it('WEB-LIB-014 catches uncaught errors and unhandled rejections, but not failed image loads', async () => {
    const bodies = reports();
    const { installErrorReporting } = await fresh();
    installErrorReporting();
    installErrorReporting();
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }));
    window.dispatchEvent(new Event('error'));
    const rejection = new Event('unhandledrejection') as Event & { reason?: unknown };
    rejection.reason = new Error('rejected');
    window.dispatchEvent(rejection);
    await vi.waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies.map((b) => b.message).sort()).toEqual(['boom', 'rejected']);
  });
});

describe('layout', () => {
  const setWidth = (w: number) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });

  it('WEB-LIB-015 picks web, tablet or phone by width and follows resizes', () => {
    setWidth(1280);
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe('web');
    act(() => {
      setWidth(900);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('tablet');
    act(() => {
      setWidth(390);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('phone');
    act(() => {
      setWidth(1100);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('web');
  });
});
