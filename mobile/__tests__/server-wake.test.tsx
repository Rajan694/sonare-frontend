import React from 'react';
import { act, render } from '@testing-library/react-native';
import { httpRequest } from '../src/data/http';
import { apiOrigin } from '../src/data/config';
import { ServerWakeNotice } from '../src/components/ui/ServerWakeNotice';
import { REQUEST_TIMEOUT_MS, SLOW_REQUEST_MS, resetServerWake } from '../../shared/net/serverWake';

/** An XHR that answers only when the test calls `answer()`. */
class HeldXHR {
  static last: HeldXHR | null = null;
  timeout = 0;
  status = 200;
  responseText = '{}';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  constructor() {
    HeldXHR.last = this;
  }
  open() {}
  setRequestHeader() {}
  send() {}
  answer() {
    this.onload?.();
  }
}

const originalXHR = global.XMLHttpRequest;

beforeEach(() => {
  jest.useFakeTimers();
  resetServerWake();
  global.XMLHttpRequest = HeldXHR as any;
});

afterEach(() => {
  jest.useRealTimers();
  global.XMLHttpRequest = originalXHR;
});

describe('server waking up', () => {
  it('MOB-WAKE-001 backend requests give up after the wake-up time; other requests and explicit timeouts are left alone', () => {
    void httpRequest(`${apiOrigin()}/api/v1/genres`);
    expect(HeldXHR.last!.timeout).toBe(REQUEST_TIMEOUT_MS);
    void httpRequest(`${apiOrigin()}/api/v1/me/player-state`, { timeoutMs: 15_000 });
    expect(HeldXHR.last!.timeout).toBe(15_000);
    void httpRequest('https://www.youtube.com/youtubei/v1/player');
    expect(HeldXHR.last!.timeout).toBe(0);
  });

  it('MOB-WAKE-002 a slow first backend request shows "waking up" until the server answers', async () => {
    const { queryByText } = render(<ServerWakeNotice />);
    const pending = httpRequest(`${apiOrigin()}/api/v1/genres`);
    const xhr = HeldXHR.last!;
    act(() => {
      jest.advanceTimersByTime(SLOW_REQUEST_MS);
    });
    expect(queryByText('Waking up the Sonare server')).toBeTruthy();
    await act(async () => {
      xhr.answer();
      await pending;
    });
    expect(queryByText('Waking up the Sonare server')).toBeNull();
  });
});
