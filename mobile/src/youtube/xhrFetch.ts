/**
 * A `fetch` over XMLHttpRequest, for youtubei.js and the stream check.
 *
 * React Native's fetch (the whatwg-fetch polyfill) settles its promise inside setTimeout, and
 * JS timers are paused while the app is in the background: "next" pressed on the lock screen
 * would wait for the app to be reopened before YouTube answered (see data/http.ts). XHR's
 * callbacks arrive as native events and run straight away.
 */

const abortError = () => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

const parseHeaders = (raw: string): Headers => {
  const headers = new Headers();
  for (const line of raw.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  return headers;
};

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

export const xhrFetch = (input: RequestInfo | URL, init?: RequestInit, timeoutMs = 30_000): Promise<Response> =>
  new Promise((resolve, reject) => {
    if (init?.signal?.aborted) return reject(abortError());
    const url = urlOf(input);
    const request = typeof input === 'object' && !(input instanceof URL) ? input : undefined;
    const headers = new Headers(request?.headers);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    // Android's XHR refuses a body without a Content-Type ("Network request failed"); fetch adds this one.
    if (typeof init?.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/plain;charset=UTF-8');
    }

    const xhr = new XMLHttpRequest();
    xhr.open((init?.method ?? request?.method ?? 'GET').toUpperCase(), url);
    xhr.timeout = timeoutMs;
    headers.forEach((value, name) => xhr.setRequestHeader(name, value));
    xhr.onload = () => {
      const response = new Response(xhr.status === 204 || xhr.status === 304 ? null : xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
      });
      Object.defineProperty(response, 'url', { value: xhr.responseURL || url });
      resolve(response);
    };
    // fetch rejects with a TypeError when the request never got an answer; keep that contract.
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));
    xhr.onabort = () => reject(abortError());
    init?.signal?.addEventListener('abort', () => xhr.abort());
    // youtubei.js passes the body in `init` (as a string); bodies are never streams here.
    xhr.send((init?.body ?? null) as Parameters<XMLHttpRequest['send']>[0]);
  });
