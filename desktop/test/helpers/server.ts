import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, type RequestHandler } from 'msw';

/** Same value vitest.config.ts puts in VITE_API_BASE: a host that can never be a real backend. */
export const API = 'http://api.sonare.test/api/v1';

export const server = setupServer();

/**
 * Starts msw for this file. Any request without a handler fails the test, so nothing can
 * leak to a real server and a missing mock is reported instead of silently returning nothing.
 */
export const useMockServer = (...defaults: RequestHandler[]) => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers(...defaults);
  });
  afterAll(() => server.close());
  if (defaults.length) server.resetHandlers(...defaults);
};

/** Records every request that reaches msw, for asserting on what the app sent. */
export const recordRequests = () => {
  const seen: Request[] = [];
  const onStart = ({ request }: { request: Request }) => {
    seen.push(request.clone());
  };
  server.events.on('request:start', onStart);
  return {
    seen,
    paths: () =>
      seen.map((r) => `${r.method} ${new URL(r.url).pathname.replace('/api/v1', '')}${new URL(r.url).search}`),
    stop: () => server.events.removeListener('request:start', onStart),
  };
};

export const apiError = (status: number, code: string, message = code) =>
  HttpResponse.json({ error: { code, message } }, { status });

export { http, HttpResponse };
