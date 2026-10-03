/**
 * JSON over XMLHttpRequest, used instead of fetch for every API call.
 *
 * React Native's fetch (the whatwg-fetch polyfill) settles its promise inside
 * setTimeout(…, 0), and JS timers are paused while the app is in the background. With
 * fetch, "next" pressed on the lock screen would hang on the stream request until the app
 * was reopened. XHR's callbacks arrive as native events and run straight away.
 */

export interface HttpResponse {
  status: number;
  /** Parsed JSON body, or null when the body is empty or not JSON. */
  json: any;
}

import { API_ORIGIN } from './config';

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
  }
}

export function httpRequest(
  url: string,
  {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 0,
  }: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    /** 0 waits forever (the default); without one, a request sent as the network comes back can hang. */
    timeoutMs?: number;
  } = {},
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeoutMs;
    // Tells the backend's admin analytics which app the request came from.
    if (url.startsWith(API_ORIGIN)) xhr.setRequestHeader('X-Sonare-Client', 'mobile');
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.onload = () => {
      let json: any = null;
      try {
        json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        // Not JSON; callers look at status.
      }
      resolve({ status: xhr.status, json });
    };
    // Same message fetch uses, so existing "can't reach the server" checks keep working.
    xhr.onerror = () => reject(new NetworkError());
    xhr.ontimeout = () => reject(new NetworkError('Network request timed out'));
    xhr.send(body ?? null);
  });
}
