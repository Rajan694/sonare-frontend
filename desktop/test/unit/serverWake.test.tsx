import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'motion/react';
import {
  ASLEEP_AFTER_MS,
  SLOW_REQUEST_MS,
  ServerTimeoutError,
  isServerWaking,
  resetServerWake,
  trackServerRequest,
} from '../../../shared/net/serverWake';
import { serverFetch } from '../../src/api/serverFetch';
import { ServerWakeNotice } from '../../src/components/ui/ServerWakeNotice';

/** A request that settles when the test says so. */
const deferred = () => {
  let resolve!: (value: string) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.useFakeTimers();
  resetServerWake();
});

afterEach(() => {
  MotionGlobalConfig.skipAnimations = false;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('server waking up', () => {
  it('WEB-WAKE-001 a slow first request says the server is waking up until it answers', async () => {
    const first = deferred();
    const done = trackServerRequest(() => first.promise);
    vi.advanceTimersByTime(SLOW_REQUEST_MS - 1);
    expect(isServerWaking()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(isServerWaking()).toBe(true);
    first.resolve('ok');
    await expect(done).resolves.toBe('ok');
    expect(isServerWaking()).toBe(false);
  });

  it('WEB-WAKE-002 a slow request to an awake server says nothing; after a long quiet spell it does again', async () => {
    let now = 1_000_000;
    const clock = () => now;
    await trackServerRequest(() => Promise.resolve('awake'), clock);

    const slow = deferred();
    const pending = trackServerRequest(() => slow.promise, clock);
    vi.advanceTimersByTime(SLOW_REQUEST_MS * 3);
    expect(isServerWaking()).toBe(false);
    slow.resolve('late');
    await pending;

    now += ASLEEP_AFTER_MS + 1;
    const afterSleep = deferred();
    const failing = trackServerRequest(() => afterSleep.promise, clock);
    vi.advanceTimersByTime(SLOW_REQUEST_MS);
    expect(isServerWaking()).toBe(true);
    afterSleep.reject(new TypeError('Failed to fetch'));
    await expect(failing).rejects.toThrow('Failed to fetch');
    expect(isServerWaking()).toBe(false);
  });

  it('WEB-WAKE-003 a backend request that never answers gives up with a clear error', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const request = serverFetch('http://localhost/api/v1/genres', {}, 10_000);
    const outcome = expect(request).rejects.toBeInstanceOf(ServerTimeoutError);
    vi.advanceTimersByTime(10_000);
    await outcome;

    // The caller's own abort is passed on as it is, not reported as a timeout.
    const controller = new AbortController();
    const cancelled = serverFetch('http://localhost/api/v1/genres', { signal: controller.signal });
    controller.abort();
    await expect(cancelled).rejects.toHaveProperty('name', 'AbortError');
  });

  it('WEB-WAKE-004 the notice shows while the server wakes up and goes away after', async () => {
    render(<ServerWakeNotice />);
    expect(screen.queryByText('Waking up the Sonare server')).toBeNull();
    const first = deferred();
    const done = trackServerRequest(() => first.promise);
    act(() => {
      vi.advanceTimersByTime(SLOW_REQUEST_MS);
    });
    expect(screen.getByText('Waking up the Sonare server')).toBeTruthy();
    // The exit animation runs on real frames.
    vi.useRealTimers();
    MotionGlobalConfig.skipAnimations = true;
    await act(async () => {
      first.resolve('ok');
      await done;
    });
    await waitFor(() => expect(screen.queryByText('Waking up the Sonare server')).toBeNull());
  });
});
